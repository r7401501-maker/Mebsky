import { load, json, userId, mkey } from "../lib/shared.mjs";

export default async (req) => {
  const b = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const uid = userId(b.initData || "");
  if (!uid) return json({ e: "auth" }, 403);

  const d = await load();
  const me = d.members[mkey(uid)];
  if (!me) return json({ e: "noname" }, 403);

  const people = Object.values(d.members).map((v) => ({ id: v.pid, name: v.name, g: v.g || 0 }));
  const ids = new Set(people.map((p) => p.id));
  const letters = d.ok.filter((l) => ids.has(l.to)).map((l) => ({ to: l.to, text: l.text }));
  return json({ people, letters, me: me.pid });
};
export const config = { path: "/api/letters" };
