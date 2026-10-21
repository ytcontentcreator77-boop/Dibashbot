import { Hono } from "hono";
import type { Env } from "./env";

const app = new Hono<{ Bindings: Env }>();

// GET PAYMENT METHODS
app.get("/methods", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM payment_methods WHERE enabled=1").all();
  return c.json({ methods: results });
});

// SUBMIT MANUAL PAYMENT
app.post("/submit", async (c) => {
  const { method_id, amount, utr, user_id } = await c.req.json();
  
  const method = await c.env.DB.prepare("SELECT * FROM payment_methods WHERE id=?").bind(method_id).first<any>();
  if (!method) return c.json({ error: "Method not found" }, 404);
  if (amount < method.min_amount || amount > method.max_amount) return c.json({ error: "Invalid amount" }, 400);

  // Get currency conversion rate
  const currRow = await c.env.DB.prepare("SELECT value FROM settings WHERE key='display_currencies'").first<any>();
  const currencies = JSON.parse(currRow?.value || "[]");
  const rate = currencies.find((x: any) => x.code === method.currency)?.rate_micro_usd || 1000000;
  
  // Calculate micro USD (amount * rate)
  const credited_micro_usd = Math.floor((amount * rate) / 1000000) * 1000000;
  const isAuto = method.auto_approve === 1;

  // Insert payment request
  const res = await c.env.DB.prepare(
    "INSERT INTO manual_payments (user_id, method_id, amount, currency, utr, status, credited_micro_usd, decided_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(user_id, method_id, amount, method.currency, utr, isAuto ? "auto" : "pending", isAuto ? credited_micro_usd : 0, isAuto ? Math.floor(Date.now()/1000) : null).run();

  // If auto-approve, add balance immediately
  if (isAuto) {
    await c.env.DB.prepare("UPDATE users SET balance_micro_usd = balance_micro_usd + ? WHERE id = ?").bind(credited_micro_usd, user_id).run();
  }

  return c.json({ ok: true, auto: isAuto });
});

// ADMIN: LIST PENDING
app.get("/admin/list", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT p.*, u.username, m.name as method_name FROM manual_payments p JOIN users u ON u.id = p.user_id JOIN payment_methods m ON m.id = p.method_id WHERE p.status = 'pending' ORDER BY p.created_at DESC"
  ).all();
  return c.json({ payments: results });
});

// ADMIN: ACCEPT (Use predefined amount)
app.post("/admin/:id/accept", async (c) => {
  const id = Number(c.req.param("id"));
  const p = await c.env.DB.prepare("SELECT * FROM manual_payments WHERE id=?").bind(id).first<any>();
  if (!p || p.status !== 'pending') return c.json({ error: "Invalid request" }, 400);

  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE manual_payments SET status='accepted', decided_at=unixepoch() WHERE id=?").bind(id),
    c.env.DB.prepare("UPDATE users SET balance_micro_usd = balance_micro_usd + ? WHERE id=?").bind(p.credited_micro_usd, p.user_id)
  ]);
  return c.json({ ok: true });
});

// ADMIN: CUSTOM ADD (Override amount)
app.post("/admin/:id/custom", async (c) => {
  const id = Number(c.req.param("id"));
  const { custom_micro_usd } = await c.req.json();
  
  const p = await c.env.DB.prepare("SELECT * FROM manual_payments WHERE id=?").bind(id).first<any>();
  if (!p || p.status !== 'pending') return c.json({ error: "Invalid request" }, 400);

  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE manual_payments SET status='accepted', credited_micro_usd=?, decided_at=unixepoch() WHERE id=?").bind(custom_micro_usd, id),
    c.env.DB.prepare("UPDATE users SET balance_micro_usd = balance_micro_usd + ? WHERE id=?").bind(custom_micro_usd, p.user_id)
  ]);
  return c.json({ ok: true });
});

// ADMIN: DECLINE
app.post("/admin/:id/decline", async (c) => {
  const id = Number(c.req.param("id"));
  await c.env.DB.prepare("UPDATE manual_payments SET status='declined', decided_at=unixepoch() WHERE id=?").bind(id).run();
  return c.json({ ok: true });
});

// ADMIN: SAVE PAYMENT METHOD (QR, Limits, etc)
app.post("/admin/methods", async (c) => {
  const b = await c.req.json();
  if (b.id) {
    await c.env.DB.prepare("UPDATE payment_methods SET name=?, currency=?, min_amount=?, max_amount=?, description=?, auto_approve=? WHERE id=?")
      .bind(b.name, b.currency, b.min_amount, b.max_amount, b.description, b.auto_approve?1:0, b.id).run();
  } else {
    await c.env.DB.prepare("INSERT INTO payment_methods (name, currency, min_amount, max_amount, description, auto_approve) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(b.name, b.currency, b.min_amount, b.max_amount, b.description, b.auto_approve?1:0).run();
  }
  return c.json({ ok: true });
});

export default app;