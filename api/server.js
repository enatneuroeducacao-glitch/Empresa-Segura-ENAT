import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "https://empresa-segura-enat-portal-v2.onrender.com")
  .split(",").map((value) => value.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origem não autorizada pelo CORS."));
  },
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"]
}));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não configurada.");
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
  console.error("SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY são necessárias para validar sessões.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("neon.tech") ? { rejectUnauthorized: true } : undefined,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

function safeError(error) {
  if (error?.code === "23505") return "Já existe um cadastro com esses dados.";
  if (error?.code === "23503") return "O vínculo solicitado não foi encontrado.";
  if (error?.code === "23514") return "Um dos valores enviados não é permitido.";
  return "Não foi possível concluir a operação.";
}

async function requireUser(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Sessão necessária." });

    const response = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`, {
      headers: {
        apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) return res.status(401).json({ error: "Sessão inválida ou expirada." });

    const user = await response.json();
    if (!user?.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.id)) {
      return res.status(401).json({ error: "Identidade não validada." });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("auth validation failed:", error?.message);
    res.status(503).json({ error: "Não foi possível validar a sessão neste momento." });
  }
}

async function requireAdmin(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT 1 FROM public.empresa_segura_profiles
       WHERE user_id = $1 AND role = 'platform_admin' AND status = 'active'
       UNION ALL
       SELECT 1 FROM public.admin_profiles
       WHERE id = $1 AND role = 'admin' AND active = true
       LIMIT 1`,
      [req.user.id]
    );
    if (!result.rowCount) return res.status(403).json({ error: "Acesso restrito à administração ENAT." });
    next();
  } catch (error) {
    console.error("admin validation failed:", error?.message);
    res.status(500).json({ error: "Não foi possível validar a permissão administrativa." });
  }
}

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, service: "empresa-segura-enat-api", database: "connected" });
  } catch {
    res.status(503).json({ ok: false, service: "empresa-segura-enat-api", database: "unavailable" });
  }
});

app.get("/api/me", requireUser, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT user_id, full_name, requested_role, role, status, created_at, updated_at FROM public.empresa_segura_profiles WHERE user_id = $1",
      [req.user.id]
    );
    res.json({ user: { id: req.user.id, email: req.user.email }, profile: result.rows[0] || null });
  } catch (error) {
    console.error("profile read failed:", error?.message);
    res.status(500).json({ error: safeError(error) });
  }
});

app.post("/api/profile", requireUser, async (req, res) => {
  const fullName = String(req.body?.full_name || req.user.user_metadata?.full_name || "").trim().slice(0, 160);
  const requestedRole = req.body?.requested_role === "company_admin" ? "company_admin" : "employee";
  if (!fullName) return res.status(400).json({ error: "Informe o nome completo." });

  try {
    const result = await pool.query(
      `INSERT INTO public.empresa_segura_profiles (user_id, full_name, requested_role, role, status)
       VALUES ($1, $2, $3, $3, 'pending')
       ON CONFLICT (user_id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         updated_at = now()
       RETURNING user_id, full_name, requested_role, role, status, created_at, updated_at`,
      [req.user.id, fullName, requestedRole]
    );
    res.status(200).json({ profile: result.rows[0] });
  } catch (error) {
    console.error("profile save failed:", error?.message);
    res.status(500).json({ error: safeError(error) });
  }
});

app.post("/api/companies", requireUser, async (req, res) => {
  const legalName = String(req.body?.legal_name || "").trim().slice(0, 240);
  const tradeName = String(req.body?.trade_name || "").trim().slice(0, 240) || null;
  const cnpj = String(req.body?.cnpj || "").replace(/\D/g, "").slice(0, 14) || null;
  const contactEmail = String(req.body?.contact_email || req.user.email || "").trim().slice(0, 254) || null;
  const phone = String(req.body?.phone || "").trim().slice(0, 40) || null;
  const sector = String(req.body?.sector || "").trim().slice(0, 120) || null;
  const employeeCount = Number.isInteger(Number(req.body?.employee_count)) && Number(req.body?.employee_count) > 0
    ? Number(req.body.employee_count) : null;
  if (!legalName) return res.status(400).json({ error: "Informe a razão social." });

  try {
    const existing = await pool.query("SELECT id FROM public.empresa_segura_companies WHERE owner_user_id = $1 LIMIT 1", [req.user.id]);
    if (existing.rowCount) return res.status(409).json({ error: "Sua conta já possui uma solicitação de empresa." });

    const result = await pool.query(
      `INSERT INTO public.empresa_segura_companies
       (legal_name, trade_name, cnpj, contact_email, phone, sector, employee_count, owner_user_id, created_by_clerk_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'INATIVA')
       RETURNING id, legal_name, trade_name, cnpj, contact_email, phone, sector, employee_count, status, created_at`,
      [legalName, tradeName, cnpj, contactEmail, phone, sector, employeeCount, req.user.id, `supabase:${req.user.id}`]
    );
    await pool.query(
      `INSERT INTO public.empresa_segura_profiles (user_id, full_name, requested_role, role, status)
       VALUES ($1,$2,'company_admin','company_admin','pending')
       ON CONFLICT (user_id) DO UPDATE SET requested_role='company_admin', updated_at=now()`,
      [req.user.id, String(req.body?.full_name || req.user.user_metadata?.full_name || "").trim().slice(0,160)]
    );
    res.status(201).json({ company: result.rows[0], approval_status: "pending" });
  } catch (error) {
    console.error("company registration failed:", error?.message);
    res.status(500).json({ error: safeError(error) });
  }
});

app.get("/api/companies/mine", requireUser, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, legal_name, trade_name, cnpj, contact_email, phone, sector, employee_count, status, reviewed_at, review_note, created_at
       FROM public.empresa_segura_companies WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json({ company: result.rows[0] || null });
  } catch (error) {
    console.error("company read failed:", error?.message);
    res.status(500).json({ error: safeError(error) });
  }
});

app.get("/api/admin/companies", requireUser, requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, p.full_name AS owner_name
       FROM public.empresa_segura_companies c
       LEFT JOIN public.empresa_segura_profiles p ON p.user_id = c.owner_user_id
       ORDER BY c.created_at DESC LIMIT 500`
    );
    res.json({ companies: result.rows });
  } catch (error) {
    console.error("admin companies read failed:", error?.message);
    res.status(500).json({ error: safeError(error) });
  }
});

app.patch("/api/admin/companies/:id/review", requireUser, requireAdmin, async (req, res) => {
  const decision = req.body?.decision;
  if (!["approve", "reject"].includes(decision)) {
    return res.status(400).json({ error: "A decisão deve ser approve ou reject." });
  }
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query(
        "SELECT id, owner_user_id FROM public.empresa_segura_companies WHERE id = $1 FOR UPDATE",
        [req.params.id]
      );
      if (!current.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Solicitação de empresa não encontrada." });
      }
      const approved = decision === "approve";
      const updated = await client.query(
        `UPDATE public.empresa_segura_companies
         SET status = $2, reviewed_by = $3, reviewed_at = now(), updated_at = now(), review_note = $4
         WHERE id = $1
         RETURNING id, legal_name, status, reviewed_at, review_note`,
        [req.params.id, approved ? "ATIVA" : "INATIVA", req.user.id, String(req.body?.review_note || "").trim().slice(0,1000) || null]
      );
      if (current.rows[0].owner_user_id) {
        await client.query(
          `UPDATE public.empresa_segura_profiles
           SET role = $2, status = $3, updated_at = now()
           WHERE user_id = $1`,
          [current.rows[0].owner_user_id, approved ? "company_admin" : "company_admin", approved ? "active" : "rejected"]
        );
      }
      await client.query(
        `INSERT INTO public.empresa_segura_audit_log (actor_user_id, action, table_name, record_id, after_data)
         VALUES ($1,$2,'empresa_segura_companies',$3,$4::jsonb)`,
        [req.user.id, approved ? "company.approved" : "company.rejected", req.params.id, JSON.stringify(updated.rows[0])]
      );
      await client.query("COMMIT");
      res.json({ company: updated.rows[0] });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("company review failed:", error?.message);
    res.status(500).json({ error: safeError(error) });
  }
});

app.use((error, _req, res, _next) => {
  if (error?.message === "Origem não autorizada pelo CORS.") {
    return res.status(403).json({ error: "Origem não autorizada." });
  }
  console.error("unhandled API error:", error?.message);
  res.status(500).json({ error: "Erro interno do serviço." });
});

const port = Number(process.env.PORT || 10000);
app.listen(port, "0.0.0.0", () => {
  console.log(`Empresa Segura ENAT API ouvindo na porta ${port}`);
});
