# Diamond State Softball League

Mobile-responsive website for the LGBTQ+ softball league in Little Rock, Arkansas.
Django REST API + React frontend, reusable content blocks, form builder, and a staff admin dashboard with password or passkey login.

## Stack

- Backend: Django 6 + Django REST Framework
- Frontend: React (Vite) + React Router
- Database: PostgreSQL (SQLite fallback for local setup if `DATABASE_URL` is empty)
- Production: Apache (static SPA) + Gunicorn (API)

## Quick start (local)

```bash
# 1) Python deps
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 2) Env file (SQLite if DATABASE_URL is blank)
cp .env.example .env

# Optional Postgres via Docker
docker compose up -d
# then set DATABASE_URL=postgres://dssl:dssl@127.0.0.1:5432/dssl in .env

# 3) Backend
cd backend
python manage.py migrate
python manage.py seed_site
python manage.py runserver

# 4) Frontend (new terminal)
cd frontend
npm install
npm run dev
```

- Public site: http://127.0.0.1:5173/
- Admin dashboard: http://127.0.0.1:5173/manage/login
- Default admin: `admin` / `changeme` (change immediately)

Seeded pages: **Home**, **About**, **Contact** (interest form). Admins can create more pages later.

## Admin features

- Edit pages (publish, nav, slug) and attach reusable blocks
- Content block library: hero, rich text, image, CTA, form
- Full form builder (add/reorder field types)
- View interest submissions (database only; email hooks reserved)
- Register passkeys after password login

## Production (Linux + Apache)

1. Install system packages: Python 3, Postgres, Apache (`mod_proxy`, `mod_proxy_http`), Node for builds.
2. Deploy code to `/opt/dssl`, create venv, install `requirements.txt`.
3. Set production `.env` with `DATABASE_URL`, `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=False`, allowed hosts, and WebAuthn `RP_ID`/`ORIGIN` for your domain.
4. `python manage.py migrate && python manage.py seed_site && python manage.py collectstatic`
5. Build frontend: `cd frontend && npm ci && npm run build`, copy `frontend/dist/*` to `/var/www/dssl`.
6. Point `/var/www/dssl-media` at `backend/media` (or sync uploads there).
7. Install [`deploy/gunicorn.service`](deploy/gunicorn.service) and [`deploy/apache-dssl.conf`](deploy/apache-dssl.conf); enable site and reload Apache.

## Project layout

```
backend/     Django project (cms + accounts apps)
frontend/    React SPA
deploy/      Apache + Gunicorn samples
docker-compose.yml
```
