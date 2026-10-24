import { load, save, tg } from "../lib/shared.mjs";

export default async (req) => {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.WEBHOOK_SECRET)
    return new Response("no", { status: 403 });
  const u = await req.json().catch(() => null);
  if (!u) return new Response("ok");

  if (u.message && u.message.text && u.message.text.startsWith("/start")) {
    await tg("sendMessage", {
      chat_id: u.message.chat.id,
      text: "Здесь живут тёплые слова для группы. Открой карту, выбери звезду и оставь письмо. Автор в письме не указывается.",
      reply_markup: { inline_keyboard: [[{ text: "Открыть Небесную почту", web_app: { url: process.env.URL } }]] },
    });
  }

  const c = u.callback_query;
  if (c && String(c.from.id) === String(process.env.ADMIN_ID)) {
    const [a, i] = c.data.split(":");
    const d = await load();
    const it = d.wait[i];
    delete d.wait[i];
    if (it && a === "ok") d.ok.push(it);
    await save(d);
    await tg("editMessageText", {
      chat_id: c.message.chat.id,
      message_id: c.message.message_id,
      text: c.message.text + (a === "ok" ? "\n\nОпубликовано" : "\n\nОтклонено"),
    });
    await tg("answerCallbackQuery", { callback_query_id: c.id });
  }
  return new Response("ok");
};
export const config = { path: "/api/tg" };
