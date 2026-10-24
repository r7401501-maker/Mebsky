import { PEOPLE, load, json } from "../lib/shared.mjs";

export default async () => {
  const d = await load();
  return json({ people: PEOPLE, letters: d.ok });
};
export const config = { path: "/api/letters" };
