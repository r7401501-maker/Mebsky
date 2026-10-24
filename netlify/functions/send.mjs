import { PEOPLE, load, save, userId, tg, hid, json } from "../lib/shared.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ e: "bad" }, 405);
  const b = await req.json().catch(() => ({}));
  const uid = userId(b.initData || "");
  if (!uid) return json({ e: "auth" }, 403);
  const to = b.to;
  const text = String(b.text || "").trim().slice(0, 300);
  if (!PEOPLE.includes(to) || text.length < 2) return json({ e: "bad" }, 400);

  const chat = process.env.CHAT_ID;
  if (chat) {
    const r = await tg("getChatMember", { chat_id: chat, user_id: uid });
    if (!r.ok || ["left", "kicked"].includes(r.result.status)) return json({ e: "member" }, 403);
  }

  const d = await load();
  d.rate = d.rate || {};
  const k = hid(String(uid)), now = Date.now();
  d.rate[k] = (d.rate[k] || []).filter((t) => now - t < 36e5);
  if (d.rate[k].length >= 5) return json({ e: "limit" }, 429);
  d.rate[k].push(now);

  const id = Math.random().toString(36).slice(2, 10);
  d.wait[id] = { to, text };
  await save(d);
  await tg("sendMessage", {
    chat_id: process.env.ADMIN_ID,
    text: `Для ${to}:\n${text}`,
    reply_markup: { inline_keyboard: [[
      { text: "Одобрить", callback_data: "ok:" + id },
      { text: "Отклонить", callback_data: "no:" + id },
    ]] },
  });
  return json({ e: null });
};
export const config = { path: "/api/send" };
