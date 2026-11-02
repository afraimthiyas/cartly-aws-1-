# Cartly — React + Node.js + PostgreSQL (AWS-ready)

## Run locally
1. Start Postgres:        `docker compose up -d`
2. Backend:
   ```
   cd server && cp .env.example .env && npm install && npm run seed && npm run dev
   ```
3. Frontend (new terminal):
   ```
   cd client && cp .env.example .env && npm install && npm run dev
   ```
Open http://localhost:5173 (API on http://localhost:4000).

No Docker? Install PostgreSQL, create a `cartly` DB/user, and edit `DATABASE_URL` in `server/.env`.

Admin login (created by the seed): `admin@cartly.com` / `admin123` — change it.

## Product images
The 8 seeded products ship with their own images in `server/public/products/` (SVG illustrations). The API serves
them at `/static/products/<name>.svg`, so the shop shows images offline with no third-party service.
- Prefer stock photos? Run `SEED_IMAGES=remote npm run seed` (uses LoremFlickr, needs internet).
- Admins can add products with an uploaded image from the **Admin** page (stored in `server/uploads/`).

## Run as one container (what AWS uses)
`docker build -t cartly .` then run with `DATABASE_URL`, `JWT_SECRET` and `ADMIN_PASSWORD` set. The container serves the shop and the API
on port 4000 and creates its own tables and sample data on first start (`server/src/bootstrap.js`).

## Cloud plan
- DB: AWS RDS PostgreSQL -> set `DATABASE_URL` + `PGSSL=true`, run `npm run seed` once
- API: Elastic Beanstalk / App Runner / EC2
- Frontend: `npm run build` -> S3 + CloudFront (set `VITE_API_URL` to the API URL)
- Product images: S3 bucket -> store the URLs in `products.image_url`
