# HealthyLife Full-Stack App

A React + Vite frontend (Bootstrap 5) and Node + Express backend with MongoDB Atlas, JWT auth, Multer uploads, AI features (OpenAI, Nutritionix), and optional Cloudinary image storage.

## Project Structure

- `client/` — React SPA with React Router, Axios, Chart.js, Bootstrap 5
- `server/` — Express REST APIs with Mongoose, Helmet, CORS, JWT, Multer
- `render.yaml` — Render.com service definition (server)
- `server/Procfile` — Heroku process file (server)

## Local Development

1. Create environment files
- Copy `server/.env.example` to `server/.env` and set:
  - `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN=http://localhost:5173`
  - Optional AI: `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-4o-mini`, `OPENAI_VISION_MODEL=gpt-4o-mini`
  - Optional Nutritionix: `NUTRITIONIX_APP_ID`, `NUTRITIONIX_API_KEY`
  - Optional Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER=healthylife/meals`
- Copy `client/.env.example` to `client/.env` and set:
  - `VITE_API_BASE=http://localhost:5000/api`

2. Install dependencies
- Client: `cd client` then `npm install`
- Server: `cd server` then `npm install`

3. Run servers
- Server: `npm run dev` in `server/` (Express + MongoDB)
- Client: `npm run dev` in `client/` (Vite)
- Open http://localhost:5173

## Production Deployment

### MongoDB Atlas
- Create a cluster and database user.
- Whitelist 0.0.0.0/0 for testing or add your platform egress IPs.
- Copy the connection string to `MONGODB_URI` in the server environment.

### Server on Render (recommended)
- Push repo to GitHub.
- Render → New → Web Service → pick this repo.
- Root directory: `server`
- Build command: `npm install`
- Start command: `node src/index.js`
- Environment variables (must set):
  - `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`
  - `CORS_ORIGIN=https://<your-vercel-domain>`
  - Optional: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_VISION_MODEL`, `NUTRITIONIX_*`, `CLOUDINARY_*`
- After deploy, note your URL: `https://your-server.onrender.com`

### Server on Heroku (alternative)
- Set buildpacks (Node.js) as needed.
- `server/Procfile` contains: `web: node src/index.js`
- Set env vars: `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`, `CORS_ORIGIN=https://<your-vercel-domain>` and any optional ones.

### Client on Vercel
- New Project → Import from Git → Select `client/` as root.
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables:
  - `VITE_API_BASE=https://your-server.onrender.com/api`
- `client/vercel.json` ensures SPA routing to `/index.html`.

## API Summary

- Auth
  - `POST /api/auth/signup` — { name, email, password, age, weight, height, activity, dietPreference, calorieGoal }
  - `POST /api/auth/login` — { email, password }
  - `GET /api/auth/me` — requires `Authorization: Bearer <token>`
- Meals (JWT required)
  - `GET /api/meals`
  - `POST /api/meals/upload` — multipart/form-data field: `image`; optional `description`
  - Validates images; if invalid, returns `{ error: "Invalid image. Please upload a valid food image." }` with 400.
- Grocery
  - `GET /api/grocery?diet=veg|non-veg&week=YYYY-MM-DD` — AI plan if OpenAI configured; static otherwise
- Chat
  - `POST /api/chat` — { messages: [{ role, content }, ...] } — Diet-aware when logged in
- Smart Calorie Budget (JWT required)
  - `GET /api/calories/smart-budget` — analyzes 14-day history if present

## Notes
- Client attaches JWT from `localStorage` via Axios interceptor; on 401 it clears token and redirects to `/login`.
- If Cloudinary is configured, meal images are uploaded there; local temp files are removed.
- CORS supports multiple comma-separated origins via `CORS_ORIGIN`.

## Troubleshooting
- 401 redirect loop: ensure token exists after login and CORS allows your client domain.
- Mongo errors on boot: verify `MONGODB_URI` and network access rules.
- Meals upload fails: ensure image < 5MB, correct MIME type, and AI keys (optional) if you expect AI estimation.
