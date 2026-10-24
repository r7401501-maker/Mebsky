# Небесная почта на Netlify

## Шаги
1. Создай на GitHub новый репозиторий и загрузи в него все файлы из этой папки (кнопка Add file, Upload files; папки netlify и public тоже).
2. На netlify.com: Add new site, Import an existing project, выбери этот репозиторий, Deploy.
3. В Netlify: Site configuration, Environment variables, добавь:
   - BOT_TOKEN: токен от @BotFather
   - ADMIN_ID: твой id (его пришлёт @userinfobot)
   - WEBHOOK_SECRET: любая строка из латинских букв и цифр, например nebo2026secret
   - CHAT_ID: id чата группы (необязательно, чтобы писать могли только участники)
4. Deploys, Trigger deploy, Deploy site (чтобы подхватить переменные).
5. Привяжи бота. Открой в браузере (подставь свои значения) и увидишь ответ ok:true:
   https://api.telegram.org/botТОКЕН/setWebhook?url=https://ТВОЙ-САЙТ.netlify.app/api/tg&secret_token=ТВОЙ_WEBHOOK_SECRET
6. Напиши боту /start и нажми «Открыть Небесную почту».

## Как менять
- Имена: netlify/lib/shared.mjs, строка PEOPLE.
- Дизайн: public/index.html.
- После правок загрузи изменения на GitHub, Netlify обновит сайт сам.
