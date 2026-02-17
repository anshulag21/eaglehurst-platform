# Production Maintenance & Security Notes

This file contains critical follow-up tasks and documentation for the Eaglehurst Platform production environment.

## 🔴 CRITICAL SECURITY TASKS (Priority: HIGH)

The application currently uses hardcoded development defaults for security keys because these environment variables are missing in Railway. **Action Required:** Generate unique, secure strings and add them to the Railway `eaglehurst-backend` service variables.

- [ ] **JWT_SECRET_KEY**: Used to sign authentication tokens. 
    - *Risk:* If left as default, tokens can be forged.
    - *Command to generate:* `openssl rand -hex 32`
- [ ] **SECRET_KEY**: Used for general application encryption.
    - *Risk:* Vulnerable to session hijacking.
- [ ] **ENCRYPTION_KEY**: Used for sensitive data encryption.

---

## ✅ RECENT FIXES (Feb 17, 2026)

### 1. Admin Authentication & Permissions
- **Issue:** Admin users were receiving "403 Forbidden" errors on analytics pages.
- **Fix:** 
    - Updated `backend/app/utils/auth.py` to include `user_type` and `role` in the JWT payload.
    - Updated `backend/app/utils/dependencies.py` to check both the database record AND the JWT payload for roles.
    - This provides a "fail-safe" for admin access even if DB sync is slow.

### 2. Frontend 404 on Reload
- **Issue:** Reloading any page other than the home page resulted in an nginx 404 error.
- **Fix:** 
    - Updated `frontend/nginx.conf` with `try_files $uri $uri/ /index.html;` to handle Single Page Application (SPA) routing.
    - Standardized root path to `/usr/share/nginx/html`.
    - Uncommented the custom nginx config copy in `frontend/Dockerfile`.
    - Set `server_name` to `_` for generic host matching.

### 3. Production Database Stability
- **Issue:** Scripts were failing with "Lost connection to MySQL".
- **Discovery:** The production database is **PostgreSQL**, not MySQL. 
- **Fix:** 
    - Switched connection strings to `postgresql://`.
    - Updated Railway configuration to use the **Internal Network URL** (`eaglehurst-db.railway.internal:5432`) for better stability and lower latency.

### 3. Analytics Population
- **Status:** Populated `view_count` and `connection_count` for all existing listings via `populate_analytics_pg.py`.
- **Note:** These are currently static/simulated values to ensure the dashboard reflects the UI capabilities. Future work should involve real event logging for views and connections.

---

## 🛠 USEFUL COMMANDS

### Populating Analytics (Postgres)
If you need to refresh the analytics data:
```bash
./backend/venv/bin/python3 populate_analytics_pg.py
```

### Building & Pushing Backend
```bash
docker buildx build --platform linux/amd64 -t anshulag21/eaglehurst-backend:prod --push -f backend/Dockerfile .
```

---

## 🚀 ENVIRONMENT VARIABLES SUMMARY (Railway)

| Variable | Current Category | Recommedation |
|----------|-----------------|---------------|
| `DATABASE_URL` | Internal Postgres | **Verified & Working** |
| `SECRET_KEY` | Default (Hardcoded) | **UPDATE to unique string** |
| `JWT_SECRET_KEY` | Default (Hardcoded) | **UPDATE to unique string** |
| `DEBUG` | True | Set to `false` in production |
