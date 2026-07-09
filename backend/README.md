# CRM Gym Backend

Express + TypeScript API for the gym CRM application.

## Setup

```bash
cd backend
cp .env.example .env
npm install
cd ..
npm run db:up
cd backend
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Default seeded admin credentials:

```text
login: admin
password: admin12345
```

Override them during seeding with `ADMIN_LOGIN` and `ADMIN_PASSWORD`.

## Main Routes

- `POST /api/auth/login`
- `GET /api/clients`
- `POST /api/clients`
- `POST /api/clients/:clientId/subscriptions`
- `POST /api/clients/:clientId/visits`
- `GET /api/subscriptions/plans`
- `GET /api/dashboard`
