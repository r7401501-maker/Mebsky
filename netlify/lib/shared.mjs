import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

// Имена на карте. Поменяй на свои и загрузи изменения на GitHub.
export const PEOPLE = ["Аня", "Макс", "Даша", "Игорь", "Лера", "Артём"];

export const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });

export async function load() {
  const d = await getStore("poshta").get("data", { type: "json" });
  return d || { ok: [], wait: {}, rate: {} };
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

// проверка подписи Telegram: возвращает id пользователя или null
export function userId(init) {
  try {
    const p = new URLSearchParams(init);
    const h = p.get("hash");
    p.delete("hash");
    const s = [...p.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join("\n");
    const key = crypto.createHmac("sha256", "WebAppData").update(process.env.BOT_TOKEN).digest();
    const c = crypto.createHmac("sha256", key).update(s).digest("hex");
    if (!h || c !== h) return null;
    if (Date.now() / 1000 - Number(p.get("auth_date")) > 86400) return null;
    return JSON.parse(p.get("user")).id;
  } catch {
    return null;
  }
}

// обезличенный ключ для лимита писем (сам id нигде не хранится)
export const hid = (u) =>
  crypto.createHash("sha256").update(u + process.env.BOT_TOKEN).digest("hex").slice(0, 16);
