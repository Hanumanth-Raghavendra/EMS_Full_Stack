# Deploying EMS

This guide puts the app online for free (as of October 2026, free tiers change, so check each provider's pricing page):

| Part | Recommended host | Why |
| --- | --- | --- |
| Web app (`hr-frontend`) | **Vercel** | Free static hosting, global CDN, automatic deploys from GitHub |
| API (`hr-service`) | **Render** web service (Docker) | Runs the Dockerfile as-is, free tier, health checks |
| Database | **Neon** (or Render PostgreSQL) | Neon's free tier does not expire; Render's free database expires after a limited period |

Total time: about 20 minutes. You need accounts on GitHub, Vercel, Render and (optionally) Neon.

> **Free-tier behaviour:** Render's free web services sleep after ~15 minutes without traffic. The first request afterwards takes up to a minute while the API wakes up; the sign-in screen tells users when that happens. Upgrade the Render plan to avoid it.

---

## 1. Database (Neon)

1. Create a project at [neon.tech](https://neon.tech), region close to your users (e.g. *AWS Asia Pacific (Mumbai)* / *Singapore*).
2. Copy the **connection string**. It looks like
   `postgresql://user:password@ep-something.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`

You can paste that string as-is: the API converts it into JDBC settings automatically (`DATABASE_URL`).

*Using Render PostgreSQL instead?* The `render.yaml` blueprint creates one and wires `DATABASE_URL` for you; skip this step.

## 2. API (Render)

### Option A: Blueprint (fewest clicks)

1. Render dashboard → **New → Blueprint** → pick your `EMS_Full_Stack` repository. Render reads `render.yaml`.
2. It proposes `ems-api` (and optionally `ems-web` and `ems-db`). If you use Neon, remove `ems-db` and set `DATABASE_URL` manually on `ems-api`.
3. Fill in the prompted values:
   - `ALLOWED_ORIGINS`: your Vercel URL, e.g. `https://ems-yourname.vercel.app` (you can add `,https://*.vercel.app` to also allow preview deployments). Leave a placeholder now and update it after step 3.
4. Apply. `JWT_SECRET` and `SETUP_TOKEN` are generated automatically.

### Option B: Manual web service

1. **New → Web Service** → connect the repository.
2. Settings:
   - **Root directory:** `hr-service`
   - **Runtime:** Docker
   - **Health check path:** `/actuator/health`
3. Environment variables:

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | the Neon connection string |
   | `JWT_SECRET` | a long random string (`openssl rand -base64 48`) |
   | `ALLOWED_ORIGINS` | `https://<your-app>.vercel.app` |
   | `SETUP_TOKEN` | any random string you keep private |
   | `APP_TIMEZONE` | `Asia/Kolkata` (or yours) |
   | `DEMO_DATA` | `true` for a portfolio demo on an empty DB, otherwise `false` |

4. Deploy. When the logs show `Started HrServiceApplication`, open `https://<your-api>.onrender.com/actuator/health`; it should say `{"status":"UP"}`.

Flyway creates all tables on the first start. Nothing else to run.

## 3. Web app (Vercel)

1. Vercel → **Add New → Project** → import the repository.
2. **Root directory:** `hr-frontend` (framework preset Vite is detected).
3. Environment variable: `VITE_API_URL` = `https://<your-api>.onrender.com` (no trailing slash).
4. Deploy. `vercel.json` already rewrites every path to `index.html`, so deep links like `/leave` work on refresh.
5. Copy the production URL back into the API's `ALLOWED_ORIGINS` on Render and redeploy the API.

> `VITE_API_URL` is baked in at build time. After changing it, redeploy the web app.

## 4. First sign-in

- **Demo mode (`DEMO_DATA=true`):** sign in as `admin`, `hr` or `employee` with `Demo@12345` (or your `DEMO_PASSWORD`). The sign-in page lists these accounts.
  Remember that anyone with the link can sign in as admin; for a public portfolio consider a separate demo database you can reset.
- **Real use:** open the web app → *Set up* → create the administrator. Enter the `SETUP_TOKEN` value from Render (Environment tab). The setup screen disappears once an administrator exists.

## 5. Checklist

- [ ] `/actuator/health` on the API returns `UP`
- [ ] Web app loads and the sign-in page shows no "Cannot reach the server" message
- [ ] Signing in works (if the browser console shows a CORS error, fix `ALLOWED_ORIGINS`)
- [ ] `JWT_SECRET` is set (otherwise everyone is signed out on each API restart)
- [ ] Swagger UI at `/swagger-ui.html` (set `API_DOCS_ENABLED=false` to hide it)

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| "Cannot reach the server" on sign-in | Wrong `VITE_API_URL`, or the API is still waking up. Open the health URL directly and retry. |
| CORS error in the browser console | The web app's exact origin (scheme + host, no trailing slash) is missing from `ALLOWED_ORIGINS`. |
| API exits with `JWT_SECRET must be at least 32 characters` | Use a longer secret. |
| API log: `Skipped unique index ... duplicate group(s) exist` | Your existing data has duplicates (e.g. two employees with the same email). The app still blocks new duplicates; clean the old rows when convenient. |
| Users signed out after every deploy | `JWT_SECRET` is not set, so a random one is generated per start. |
| Times look off by hours | Set `APP_TIMEZONE` to your business time zone. |

## Alternatives

- **Everything on one machine/VPS:** `docker compose up -d --build` (change `JWT_SECRET`, set `DEMO_DATA=false`, put a reverse proxy with HTTPS such as Caddy in front).
- **Railway / Fly.io:** deploy `hr-service` with its Dockerfile and set the same environment variables; both provide `DATABASE_URL`.
- **Frontend on Render or Netlify:** the `render.yaml` includes an optional static site; `public/_redirects` handles Netlify routing.
