# Деплой CRM Gym

Проєкт складається з двох частин:

- `backend` - Node.js/Express API з Prisma та PostgreSQL.
- `frontend` - React/Vite SPA.

Рекомендований варіант:

- PostgreSQL + backend: Render.
- Frontend: Vercel.

## 1. Render PostgreSQL

1. На Render натисни **New +**.
2. Обери **PostgreSQL**.
3. Створи базу, наприклад `crm-gym-db`.
4. Після створення скопіюй **Internal Database URL**.

## 2. Render Backend

Створи **Web Service** з GitHub repository.

Налаштування:

```text
Runtime: Node
Branch: main
Root Directory: залиш порожнім
Build Command: npm install --include=dev && npm run build:backend && npm run prisma:migrate:deploy
Start Command: npm run start:backend
```

Важливо: `--include=dev` потрібен, бо TypeScript build використовує dev-залежності: `typescript`, `prisma`, `@types/express`, `@types/cors` та інші.

Environment variables:

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

Після deploy перевір:

```text
https://your-backend.onrender.com/health
```

Очікувана відповідь:

```json
{ "status": "ok" }
```

## 3. Створення першого адміністратора

Після першого успішного deploy запусти seed у Render Shell:

```bash
npm run prisma:seed --workspace backend
```

Seed безпечний: якщо адмін з таким `ADMIN_LOGIN` вже існує, пароль не буде перезаписано.

## 4. Vercel Frontend

Створи Vercel project з цього ж GitHub repository.

Налаштування:

```text
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Environment variable:

```bash
VITE_API_URL=https://your-backend.onrender.com/api
```

## 5. CORS після Vercel

Коли Vercel видасть frontend URL, повернись у Render backend і встанови:

```bash
CORS_ORIGIN=https://your-frontend.vercel.app
```

Для локальної розробки можна додати localhost через кому:

```bash
CORS_ORIGIN=https://your-frontend.vercel.app,http://localhost:5173,http://localhost:5174
```

Після зміни env зроби redeploy backend.

## 6. Фінальна перевірка

1. Відкрий frontend на Vercel.
2. Увійди через `ADMIN_LOGIN` і `ADMIN_PASSWORD`.
3. Створи тестового клієнта.
4. Активуй абонемент.
5. Додай візит.
6. Перевір dashboard.

## Production-нотатка

Фото клієнтів зараз зберігаються в `backend/uploads`. Для справжнього production краще підключити Cloudinary, S3 або інше object storage, бо файлове сховище Render не варто використовувати як постійне сховище завантажень.
