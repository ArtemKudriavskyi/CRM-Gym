# CRM Gym

SPA + REST API for fitness center administration.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL, Prisma ORM
- Auth: JWT, bcrypt

## Run Locally

Install dependencies:

```bash
npm install
```

Create backend environment:

```bash
cp backend/.env.example backend/.env
```

Start PostgreSQL with Docker:

```bash
npm run db:up
```

Run database migration and seed the first admin:

```bash
npm run prisma:migrate
npm run prisma:seed
```

Start the API and frontend in two terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

Default admin:

```text
login: admin
password: admin12345
```

Useful database commands:

```bash
npm run db:logs
npm run db:down
```
