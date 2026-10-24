import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

export const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });

// ключ участника в базе (с буквой, чтобы порядок регистрации сохранялся)
export const mkey = (id) => "u" + id;

export async function load() {
  const d = (await getStore("poshta").get("data", { type: "json" })) || {};
  d.ok = d.ok || [];
  d.wait = d.wait || {};
  d.rate = d.rate || {};
  d.members = d.members || {};
  d.ask = d.ask || {};
  return d;
}
export async function save(d) {
  await getStore("poshta").setJSON("data", d);
}

export async function tg(method, body) {
  const r = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

// проверка подписи Telegram: возвращает объект пользователя или null
export function tgUser(init) {
  try {
    const p = new URLSearchParams(init);
    const h = p.get("hash");
    p.delete("hash");
    const s = [...p.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join("\n");
    const key = crypto.createHmac("sha256", "WebAppData").update(process.env.BOT_TOKEN).digest();
    const c = crypto.createHmac("sha256", key).update(s).digest("hex");
    if (!h || c !== h) return null;
    if (Date.now() / 1000 - Number(p.get("auth_date")) > 86400) return null;
    return JSON.parse(p.get("user"));
  } catch {
    return null;
  }
}
export const userId = (init) => {
  const u = tgUser(init);
  return u ? u.id : null;
};

// обезличенный ключ для лимита писем
export const hid = (u) =>
  crypto.createHash("sha256").update(u + process.env.BOT_TOKEN).digest("hex").slice(0, 16);

// участник группы? (если CHAT_ID не задан, пускаем всех)
export async function allowed(uid) {
  if (String(uid) === String(process.env.ADMIN_ID)) return true;
  const chat = process.env.CHAT_ID;
  if (!chat) return true;
  const r = await tg("getChatMember", { chat_id: chat, user_id: uid });
  return !!(r.ok && !["left", "kicked"].includes(r.result.status));
}
