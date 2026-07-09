# GitHub setup

Цей файл - коротка інструкція для першого завантаження CRM Gym на GitHub.

## 1. Перевір, що не завантажуються приватні файли

`.gitignore` вже закриває:

- `.env` і `.env.*`
- `node_modules`
- `dist`
- локальні фото з `backend/uploads`
- локальні `.agents` skills
- `*.tsbuildinfo`

У репозиторій мають потрапити `.env.example`, але не справжні `.env`.

## 2. Ініціалізуй Git

```bash
git init
git add .
git status
```

У `git status` не повинно бути:

- `backend/.env`
- `node_modules`
- `backend/dist`
- `frontend/dist`
- `backend/uploads/*.png`
- `.agents/skills`

## 3. Зроби перший коміт

```bash
git commit -m "Initial CRM Gym project"
```

## 4. Підключи GitHub repository

Створи порожній repository на GitHub, потім виконай команди, які GitHub покаже для existing repository. Вони будуть приблизно такі:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

## 5. Далі

Після GitHub переходь до деплою за інструкцією в `DEPLOY.md`.
