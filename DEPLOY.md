# Deploy Sumaya Resto on Render (with laptop PostgreSQL tunnel)

## Architecture (interim)

```
[Render] sumaya-web (static)  →  sumaya-api (FastAPI)
                                      ↓
                            [ngrok TCP tunnel]
                                      ↓
                    [Your laptop] PostgreSQL :5433 (Docker)
```

Use this until you move PostgreSQL to [Render Postgres](https://render.com/docs/databases), Neon, or Supabase.

---

## 1. Push to GitHub

Repo: [github.com/mayankmehta1610/sumayarestro](https://github.com/mayankmehta1610/sumayarestro)

```powershell
cd C:\Code\SumayaRestro
git init
git add .
git commit -m "Initial Sumaya Resto platform with Render blueprint and DB tunnel"
git branch -M main
git remote add origin https://github.com/mayankmehta1610/sumayarestro.git
git push -u origin main
```

---

## 2. Local PostgreSQL (Docker)

```powershell
docker compose up -d postgres
# DB: localhost:5433  user: sumaya  password: sumaya_secret  db: sumaya_resto
```

Seed data:

```powershell
docker compose up -d backend
docker exec sumayarestro-backend-1 python seed.py
# Or: cd backend && python seed.py
```

---

## 3. Tunnel PostgreSQL to the internet

Render cannot reach `localhost` on your PC. Expose port **5433** with ngrok:

1. Install [ngrok](https://ngrok.com/download) and sign up (free).
2. Add authtoken: `ngrok config add-authtoken YOUR_TOKEN`
3. Run:

```powershell
.\scripts\tunnel-postgres.ps1
```

4. Note the forwarding line, e.g. `tcp://0.tcp.ngrok.io:15432`

5. Build `DATABASE_URL` for Render:

```
postgresql+asyncpg://sumaya:sumaya_secret@0.tcp.ngrok.io:15432/sumaya_resto
```

Replace host/port with your ngrok values. **Keep the tunnel running** while Render uses this database.

### Alternative: Cloudflare Tunnel

```powershell
cloudflared tunnel --url tcp://localhost:5433
```

See `cloudflared/config.example.yml` for a named tunnel setup.

---

## 4. Deploy on Render

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. **New → Blueprint** → connect `mayankmehta1610/sumayarestro`
3. Render reads `render.yaml` and creates:
   - `sumaya-api` (Python web service)
   - `sumaya-web` (static site)

### One-command local prep

```powershell
.\scripts\deploy-all.ps1
```

This starts Docker, seeds data, launches the ngrok tunnel, and prints the exact `DATABASE_URL` for Render.

### Environment variables (Render Dashboard)

**sumaya-api** — only `DATABASE_URL` is required (others are in `render.yaml`):

| Key | Value |
|-----|--------|
| `DATABASE_URL` | From `.\scripts\get-tunnel-url.ps1` output |

Pre-configured in blueprint: `CORS_ORIGINS`, `SECRET_KEY`, `PYTHON_VERSION`

**sumaya-web** — fully pre-configured in `render.yaml`:

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://sumaya-api.onrender.com/api/v1` |

4. Deploy both services.
5. Verify API: `https://sumaya-api.onrender.com/health` (should show `database: connected`)
6. Open web: `https://sumaya-web.onrender.com/r/spice-garden/login`

---

## 5. Post-deploy checklist

- [ ] Tunnel running on laptop
- [ ] Docker postgres healthy: `docker compose ps`
- [ ] API health: `https://sumaya-api.onrender.com/health`
- [ ] Login works on web URL
- [ ] CORS includes exact web origin (no trailing slash)

---

## 6. Move to hosted PostgreSQL (recommended next step)

When ready, create Render Postgres or use Neon/Supabase:

1. Create database, copy connection string.
2. Convert to async URL: `postgresql+asyncpg://user:pass@host/db`
3. Update `DATABASE_URL` on Render — remove tunnel.
4. Run migrations/seed against new DB: `python seed.py`

---

## Ports reference

| Service | Local | Render |
|---------|-------|--------|
| API | 8001 | `$PORT` (443 HTTPS) |
| Web | 5173 | static CDN |
| Postgres | 5433 | via tunnel |
| Redis | 6380 | optional |
