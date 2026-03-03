# Collectify — Inventory Management App

**ASP.NET Core 8 API + React 18 + PostgreSQL + Docker + Render**

---

## Quick Start (Local with Docker)

```bash
# 1. Copy env file and fill in your credentials
cp .env.example .env

# 2. Start everything (PostgreSQL + Backend + Frontend)
docker compose up --build

# App: http://localhost:3000
# API: http://localhost:8080
# Swagger: http://localhost:8080/swagger
```

---

## Deploy to Render (Step by Step)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 2 — Create PostgreSQL on Render
1. Go to https://render.com → **New** → **PostgreSQL**
2. Name: `collectify-db`
3. Plan: Free
4. **Save** — copy the **Internal Database URL**

### Step 3 — Deploy Backend
1. **New** → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Name**: `collectify-api`
   - **Runtime**: Docker
   - **Dockerfile Path**: `./backend/Dockerfile`
   - **Docker Context**: `./backend`
4. Add Environment Variables:

| Key | Value |
|-----|-------|
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ASPNETCORE_URLS` | `http://+:8080` |
| `ConnectionStrings__DefaultConnection` | *(paste Internal DB URL from step 2)* |
| `Jwt__Secret` | *(generate: `openssl rand -base64 48`)* |
| `Jwt__Issuer` | `InventoryApp` |
| `Jwt__Audience` | `InventoryApp` |
| `Auth__Google__ClientId` | *(from Google Console)* |
| `Auth__Google__ClientSecret` | *(from Google Console)* |
| `Auth__Facebook__AppId` | *(from Meta Developers)* |
| `Auth__Facebook__AppSecret` | *(from Meta Developers)* |
| `Cloudinary__CloudName` | *(from Cloudinary Dashboard)* |
| `Cloudinary__ApiKey` | *(from Cloudinary Dashboard)* |
| `Cloudinary__ApiSecret` | *(from Cloudinary Dashboard)* |
| `Frontend__Url` | `https://collectify-app.onrender.com` *(set after frontend deploy)* |

5. **Deploy** — wait for it to go green ✅
6. **Copy the backend URL** (e.g. `https://collectify-api.onrender.com`)

### Step 4 — Deploy Frontend
1. **New** → **Web Service**
2. Connect same GitHub repo
3. Settings:
   - **Name**: `collectify-app`
   - **Runtime**: Docker
   - **Dockerfile Path**: `./frontend/Dockerfile`
   - **Docker Context**: `./frontend`
4. Add Environment Variables:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://collectify-api.onrender.com` |

5. **Deploy** ✅

### Step 5 — Update Backend CORS
Go back to **collectify-api** → Environment → set:
- `Frontend__Url` = `https://collectify-app.onrender.com`

Trigger a redeploy.

### Step 6 — OAuth Redirect URIs
Add these to your OAuth apps:

**Google** (console.cloud.google.com):
```
https://collectify-api.onrender.com/api/auth/callback/google
```

**Facebook** (developers.facebook.com):
```
https://collectify-api.onrender.com/api/auth/callback/facebook
```

### Step 7 — First Admin User
After first login, run this SQL in Render's PostgreSQL shell:
```sql
INSERT INTO "AspNetUserRoles" ("UserId", "RoleId")
SELECT u."Id", r."Id"
FROM "AspNetUsers" u, "AspNetRoles" r
WHERE u."Email" = 'your@email.com' AND r."Name" = 'Admin';
```

---

## External Services Setup

### Google OAuth
1. https://console.cloud.google.com/
2. APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Application type: **Web application**
4. Authorized redirect URIs:
   - `http://localhost:8080/api/auth/callback/google` (local)
   - `https://collectify-api.onrender.com/api/auth/callback/google` (prod)

### Facebook OAuth
1. https://developers.facebook.com/ → My Apps → Create App
2. Add product: **Facebook Login**
3. Valid OAuth redirect URIs:
   - `http://localhost:8080/api/auth/callback/facebook`
   - `https://collectify-api.onrender.com/api/auth/callback/facebook`

### Cloudinary (Image Hosting)
1. https://cloudinary.com → Sign up free
2. Dashboard → API Keys → copy Cloud name, API Key, API Secret

---

## Project Structure

```
inventory-app/
├── docker-compose.yml          ← Local dev with PostgreSQL
├── render.yaml                 ← Render blueprint
├── .env.example                ← Copy to .env and fill in
├── .gitignore
│
├── backend/
│   ├── Dockerfile              ← Multi-stage .NET 8 build
│   └── InventoryApp/
│       ├── Controllers/
│       │   ├── AuthController.cs        # OAuth + JWT login
│       │   ├── InventoriesController.cs # CRUD + access + export
│       │   ├── ItemsController.cs       # Items + likes + comments
│       │   ├── AdminSearchController.cs # Admin + Search + Tags
│       │   └── HealthController.cs      # Render health check
│       ├── Models/Models.cs             # All EF entities
│       ├── Data/AppDbContext.cs          # DB context + indexes
│       ├── DTOs/DTOs.cs                 # Request/Response models
│       ├── Services/
│       │   ├── CustomIdService.cs       # ID generation engine
│       │   ├── SearchService.cs         # Full-text search
│       │   ├── ImageService.cs          # Cloudinary upload
│       │   └── TokenService.cs          # JWT generation
│       ├── Migrations/                  # EF Core migrations
│       ├── Program.cs                   # App bootstrap
│       └── appsettings.json
│
└── frontend/
    ├── Dockerfile              ← Node build → nginx serve
    ├── nginx.conf              ← SPA routing fix
    ├── src/
    │   ├── App.jsx             # Router + auth guards
    │   ├── pages/
    │   │   ├── HomePage.jsx         # Latest + Popular + Tag cloud
    │   │   ├── InventoriesPage.jsx  # Paginated table
    │   │   ├── InventoryPage.jsx    # Tabs: Items/Settings/ID/Access/Stats
    │   │   ├── ItemPage.jsx         # Detail + likes + comments
    │   │   ├── ProfilePage.jsx      # User's inventories tables
    │   │   ├── AdminPage.jsx        # User management
    │   │   ├── LoginPage.jsx        # Google + Facebook buttons
    │   │   └── AuthCallbackPage.jsx # Token handler
    │   ├── components/
    │   │   ├── layout/Header.jsx         # Global search + user menu
    │   │   ├── inventory/
    │   │   │   ├── CustomIdBuilder.jsx   # Visual ID format editor
    │   │   │   ├── InventoryForm.jsx     # Create/edit form
    │   │   │   ├── InventoryStats.jsx    # Recharts bar chart
    │   │   │   └── AccessManager.jsx    # Add/remove users
    │   │   └── item/
    │   │       ├── ItemsTable.jsx        # Table + hover actions
    │   │       └── ItemForm.jsx          # Dynamic field form
    │   ├── contexts/AuthContext.jsx
    │   ├── services/api.js              # Axios client
    │   └── hooks/useDebounce.js
    └── package.json
```

---

## Architecture Decisions

| Decision | Reason |
|----------|--------|
| Fixed columns (string1-3, text1-3…) | No dynamic table generation, fast queries, easy aggregation |
| JWT (not sessions) | Stateless, works great with React SPA |
| RowVersion optimistic locking | Prevents concurrent overwrites without heavy transactions |
| Cloudinary | Images never touch the server — no disk needed |
| PostgreSQL ILIKE for search | Simple, no extra dependencies, indexed |
| Row hover for actions | Requirement: no buttons in table rows |
