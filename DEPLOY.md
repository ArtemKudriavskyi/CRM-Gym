# Деплой CRM Gym

Цей проєкт складається з двох частин:

- `backend` - Node.js/Express API з Prisma та PostgreSQL.
- `frontend` - React/Vite SPA.

Рекомендований простий варіант деплою:

- Backend + PostgreSQL: Render.
- Frontend: Vercel.

## 1. Підготовка GitHub

1. Створи репозиторій на GitHub.
2. Завантаж код проєкту.
3. Не завантажуй `.env`, `node_modules`, `dist` і локальні завантаження з `backend/uploads`.

## 2. Environment variables

### Backend

Створи змінні середовища на Render:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=very-long-random-secret-at-least-24-characters
JWT_EXPIRES_IN=1d
PORT=4000
CORS_ORIGIN=https://your-frontend.vercel.app
ADMIN_LOGIN=admin
ADMIN_PASSWORD=strong-first-admin-password
```

`CORS_ORIGIN` може містити кілька адрес через кому:

```bash
CORS_ORIGIN=https://your-frontend.vercel.app,https://your-domain.com
```

### Frontend

Створи змінну середовища на Vercel:

```bash
VITE_API_URL=https://your-backend.onrender.com/api
```

## 3. Render: PostgreSQL

1. Створи PostgreSQL database у Render.
2. Скопіюй external/internal database URL.
3. Встав його в backend env як `DATABASE_URL`.

## 4. Render: Backend

Створи Web Service з GitHub репозиторію.

Якщо Render запускається з кореня монорепозиторію:

```bash
Build Command: npm install && npm run build:backend && npm run prisma:migrate:deploy
Start Command: npm run start:backend
```

Після першого успішного деплою створи першого адміністратора:

```bash
npm run prisma:seed --workspace backend
```

Seed безпечний: якщо адмін з таким `ADMIN_LOGIN` вже існує, пароль не буде перезаписано.

## 5. Vercel: Frontend

Створи Vercel project з цього ж GitHub репозиторію.

Налаштування:

```bash
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
```

Додай env:

```bash
VITE_API_URL=https://your-backend.onrender.com/api
```

## 6. Перевірка після деплою

1. Відкрий backend health check:

```bash
https://your-backend.onrender.com/health
```

Очікувана відповідь:

```json
{ "status": "ok" }
```

2. Відкрий frontend.
3. Увійди під `ADMIN_LOGIN` і `ADMIN_PASSWORD`.
4. Створи тестового клієнта.
5. Активуй абонемент.
6. Додай візит.

## 7. Важливі production-нотатки

- Render free instance може засинати, тому перший запит після паузи буде повільним.
- Файли в `backend/uploads` на Render не є надійним постійним сховищем. Для продажного продукту краще підключити S3, Cloudinary або інше object storage.
- Не використовуй слабкий `JWT_SECRET`.
- Не залишай production frontend origin у CORS як `localhost`.
- Для ручного редагування бази використовуй Prisma Studio тільки локально або через захищений доступ.
