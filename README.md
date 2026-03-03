# Collectify — Inventory Management App

**ASP.NET Core 8 + React 18 + PostgreSQL · ONE Dockerfile · ONE Render service**

---

## How it works (single container)

```
Dockerfile (root)
 ├── Stage 1 → npm run build  (React → /dist)
 ├── Stage 2 → dotnet publish (.NET → /publish)
 └── Stage 3 → runtime image
       ├── /app/wwwroot  ← React static files
       └── InventoryApp.dll ← ASP.NET serves /api/* AND wwwroot/*
```

Frontend calls `/api/*` → same origin → no CORS needed in production.

---

## Local dev (one command)

```bash
cp .env.example .env        # fill in your credentials
docker compose up --build   # builds + starts everything

# Open: http://localhost:8080
# Swagger: http://localhost:8080/swagger
```

---

## Deploy to Render (5 steps)

### 1. Push to GitHub
```bash
git init && git add . && git commit -m "init"
git remote add origin https://github.com/YOU/REPO.git
git push -u origin main
```

### 2. Create Database on Render
- **New → PostgreSQL**
- Name: `collectify-db`, Plan: Free
- Copy the **Internal Database URL**

### 3. Create Web Service on Render
- **New → Web Service → Connect repo**
- **Runtime:** Docker
- **Dockerfile Path:** `./Dockerfile`  ← root of repo
- **Docker Context:** `.`  ← root of repo

### 4. Set Environment Variables in Render
| Variable | Value |
|----------|-------|
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ASPNETCORE_URLS` | `http://+:8080` |
| `ConnectionStrings__DefaultConnection` | *(Internal DB URL from step 2)* |
| `Jwt__Secret` | *(run: `openssl rand -base64 48`)* |
| `Jwt__Issuer` | `InventoryApp` |
| `Jwt__Audience` | `InventoryApp` |
| `Auth__Google__ClientId` | *(Google Console)* |
| `Auth__Google__ClientSecret` | *(Google Console)* |
| `Auth__Facebook__AppId` | *(Meta Developers)* |
| `Auth__Facebook__AppSecret` | *(Meta Developers)* |
| `Cloudinary__CloudName` | *(Cloudinary Dashboard)* |
| `Cloudinary__ApiKey` | *(Cloudinary Dashboard)* |
| `Cloudinary__ApiSecret` | *(Cloudinary Dashboard)* |
| `Frontend__Url` | `https://your-service.onrender.com` |

### 5. Deploy → Done ✅
Your app URL: `https://collectify-xxxx.onrender.com`

---

## OAuth Redirect URIs

Add these to your OAuth apps (replace with your Render URL):

**Google** → console.cloud.google.com → Credentials → OAuth Client:
```
https://collectify-xxxx.onrender.com/api/auth/callback/google
```

**Facebook** → developers.facebook.com → Facebook Login → Settings:
```
https://collectify-xxxx.onrender.com/api/auth/callback/facebook
```

---

## First Admin User

After first login via Google/Facebook, run in Render → PostgreSQL → Shell:
```sql
INSERT INTO "AspNetUserRoles" ("UserId", "RoleId")
SELECT u."Id", r."Id"
FROM "AspNetUsers" u, "AspNetRoles" r
WHERE u."Email" = 'your@email.com' AND r."Name" = 'Admin';
```

---

## External services

| Service | Purpose | Free tier |
|---------|---------|-----------|
| [Google Cloud Console](https://console.cloud.google.com) | OAuth login | ✅ |
| [Meta Developers](https://developers.facebook.com) | OAuth login | ✅ |
| [Cloudinary](https://cloudinary.com) | Image hosting | ✅ 25GB |
| [Render](https://render.com) | Hosting + PostgreSQL | ✅ |

---

## Project structure

```
/
├── Dockerfile              ← SINGLE Dockerfile (React + .NET)
├── docker-compose.yml      ← Local dev
├── render.yaml             ← Render blueprint
├── .env.example
├── backend/InventoryApp/
│   ├── Controllers/        Auth, Inventories, Items, Admin, Search, Tags, Health
│   ├── Models/             AppUser, Inventory, Item, Comment, Like, Access
│   ├── Data/               AppDbContext + EF indexes
│   ├── DTOs/               Request/Response records
│   ├── Services/           CustomIdService, SearchService, ImageService, TokenService
│   ├── Migrations/         InitialCreate (auto-applied on startup)
│   └── Program.cs          JWT + OAuth + CORS + DI + auto-migrate
└── frontend/src/
    ├── pages/              Home, Inventories, Inventory, Item, Profile, Admin, Login
    ├── components/         Header, ItemsTable, ItemForm, CustomIdBuilder, Stats, Access
    ├── services/api.js     Axios client (baseURL = /api)
    └── contexts/           AuthContext (JWT in localStorage)
```
