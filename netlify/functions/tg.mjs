import { load, save, tg, allowed, mkey } from "../lib/shared.mjs";

const ok = () => new Response("ok");
const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} .'\-]{1,19}$/u;
const OPEN = () => ({
  inline_keyboard: [[{ text: "✨ Открыть Небесную почту", web_app: { url: process.env.URL } }]],
});

const GROUPS = () => ({
  inline_keyboard: [[1, 2, 3, 4, 5].map((n) => ({ text: String(n), callback_data: "g:" + n }))],
});

const WELCOME =
  "Добро пожаловать в Небесную почту ✨\n\n" +
  "Каждая звезда на карте — человек с нашего факультета. Чтобы твоя звезда зажглась, напиши в ответ, как тебя зовут. Это имя увидят остальные.\n\n" +
  "Получатель не увидит, кто автор письма. Администратор видит автора и проверяет каждое письмо перед публикацией.";
const GREET =
  "Небесная почта\n\n" +
  "Выбери звезду на карте и оставь для этого человека письмо с добрыми словами. Получатель не увидит автора, администратор видит его и проверяет письмо перед публикацией.\n\n" +
  "Сменить своё имя на карте: /name";

export default async (req) => {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.WEBHOOK_SECRET)
    return new Response("no", { status: 403 });
  const u = await req.json().catch(() => null);
  if (!u) return ok();
  const admin = String(process.env.ADMIN_ID);

  const m = u.message;
  if (m && m.text && m.chat && m.chat.type === "private" && m.from && !m.from.is_bot) {
    const uid = String(m.from.id);
    const text = m.text.trim();
    const say = (t, extra = {}) => tg("sendMessage", { chat_id: m.chat.id, text: t, ...extra });
    const d = await load();
    const me = d.members[mkey(uid)];

    // команды администратора
    if (uid === admin && text.startsWith("/list")) {
      const rows = Object.values(d.members).map((v) => `${v.pid} — ${v.name}${v.g ? ", гр. " + v.g : ""}`);
      await say(rows.length ? "Звёзды:\n" + rows.join("\n") + "\n\nУдалить: /remove код" : "Пока никого.");
      return ok();
    }
    if (uid === admin && text.startsWith("/remove")) {
      const pid = text.split(/\s+/)[1];
      const e = Object.entries(d.members).find(([, v]) => v.pid === pid);
      if (!e) {
        await say("Не нашёл такой код. Список: /list");
      } else {
        delete d.members[e[0]];
        d.ok = d.ok.filter((l) => l.to !== pid);
        for (const [i, w] of Object.entries(d.wait)) if (w.to === pid) delete d.wait[i];
        await save(d);
        await say("Удалено: " + e[1].name);
      }
      return ok();
    }

    // /start и /name
    const wantName = text.startsWith("/name");
    if (text.startsWith("/start") || wantName) {
      if (!(await allowed(uid))) {
        await say("Бот работает только для участников группы.");
        return ok();
      }
      if (me && !wantName && !me.g) {
        d.ask[uid] = { step: "group", name: me.name };
        await save(d);
        await say("Из какой ты группы?", { reply_markup: GROUPS() });
        return ok();
      }
      if (me && !wantName) {
        await say(GREET, { reply_markup: OPEN() });
        return ok();
      }
      d.ask[uid] = { step: "name" };
      await save(d);
      await say(me ? "Напиши новое имя для своей звезды." : WELCOME);
      return ok();
    }

    // ответ с именем
    if (d.ask[uid] && d.ask[uid].step === "name" && !text.startsWith("/")) {
      const name = text.replace(/\s+/g, " ").trim();
      if (!NAME_RE.test(name)) {
        await say("Имя должно быть от 2 до 20 символов: буквы, цифры, пробел или дефис. Попробуй ещё раз.");
        return ok();
      }
      const dup = Object.entries(d.members).some(
        ([k, v]) => k !== mkey(uid) && v.name.toLowerCase() === name.toLowerCase()
      );
      if (dup) {
        await say("Такое имя уже есть на карте. Добавь первую букву фамилии, например: Анна К.");
        return ok();
      }
      d.ask[uid] = { step: "group", name };
      await save(d);
      await say(`Приятно познакомиться, ${name}! Из какой ты группы?`, { reply_markup: GROUPS() });
      return ok();
    }

    if (!text.startsWith("/")) {
      await say(me ? "Открой карту кнопкой ниже." : "Напиши /start, чтобы зажечь свою звезду.", me ? { reply_markup: OPEN() } : {});
    }
    return ok();
  }

  const c = u.callback_query;

  // выбор группы 1–5
  if (c && c.data && c.data.startsWith("g:")) {
    const uid = String(c.from.id);
    const g = Number(c.data.slice(2));
    const d = await load();
    const st = d.ask[uid];
    if (!(g >= 1 && g <= 5) || !st || st.step !== "group") {
      await tg("answerCallbackQuery", { callback_query_id: c.id, text: "Напиши /start" });
      return ok();
    }
    const me = d.members[mkey(uid)];
    const isNew = !me;
    const pid = me ? me.pid : Math.random().toString(36).slice(2, 8);
    d.members[mkey(uid)] = { name: st.name, pid, g };
    delete d.ask[uid];
    await save(d);
    await tg("answerCallbackQuery", { callback_query_id: c.id });
    await tg("editMessageText", { chat_id: c.message.chat.id, message_id: c.message.message_id, text: `Группа ${g} ✓` });
    await tg("sendMessage", {
      chat_id: c.message.chat.id,
      text: isNew
        ? `Готово, ${st.name}! Твоя звезда появилась на карте ✨\n\nВыбирай звезду и пиши тёплые слова.`
        : `Обновлено: ${st.name}, группа ${g}.`,
      reply_markup: OPEN(),
    });
    if (isNew && uid !== admin) {
      const un = c.from.username ? "@" + c.from.username : "id " + uid;
      await tg("sendMessage", { chat_id: admin, text: `Новая звезда: ${st.name}, группа ${g} (${un})\nКод: ${pid}` });
    }
    return ok();
  }

  // кнопки администратора: одобрить или отклонить письмо
  if (c && String(c.from.id) === admin) {
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
    if (it && a === "ok") {
      const e = Object.entries(d.members).find(([, v]) => v.pid === it.to);
      if (e) {
        // личный чат с ботом имеет тот же id, что и пользователь
        await tg("sendMessage", {
          chat_id: e[0].slice(1),
          text: "✨ К твоей звезде прилетело новое письмо. Загляни в Небесную почту.",
          reply_markup: OPEN(),
        }).catch(() => {});
      }
    }
  }
  return ok();
};
export const config = { path: "/api/tg" };
