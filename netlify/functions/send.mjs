import { load, save, tgUser, tg, hid, json, allowed, mkey } from "../lib/shared.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ e: "bad" }, 405);
  const b = await req.json().catch(() => ({}));
  const user = tgUser(b.initData || "");
  if (!user) return json({ e: "auth" }, 403);
  const uid = user.id;

  const text = String(b.text || "").trim().slice(0, 300);
  if (text.length < 2) return json({ e: "bad" }, 400);

  if (!(await allowed(uid))) return json({ e: "member" }, 403);

  const d = await load();
  const me = d.members[mkey(uid)];
  if (!me) return json({ e: "noname" }, 403);
  const target = Object.values(d.members).find((v) => v.pid === b.to);
  if (!target) return json({ e: "bad" }, 400);
  if (target.pid === me.pid) return json({ e: "self" }, 400);

  const k = hid(String(uid)), now = Date.now();
  d.rate[k] = (d.rate[k] || []).filter((t) => now - t < 36e5);
  if (d.rate[k].length >= 5) return json({ e: "limit" }, 429);
  d.rate[k].push(now);

  const id = Math.random().toString(36).slice(2, 10);
  d.wait[id] = { to: target.pid, text, t: now };
  await save(d);

  const from = me.name + (me.g ? ", группа " + me.g : "") + (user.username ? " (@" + user.username + ")" : "");
  await tg("sendMessage", {
    chat_id: process.env.ADMIN_ID,
    text: `Для ${target.name}${target.g ? " (гр. " + target.g + ")" : ""}:\n${text}\n\nОт: ${from}`,
    reply_markup: { inline_keyboard: [[
      { text: "Одобрить", callback_data: "ok:" + id },
      { text: "Отклонить", callback_data: "no:" + id },
    ]] },
  });
  return json({ e: null });
};
export const config = { path: "/api/send" };
