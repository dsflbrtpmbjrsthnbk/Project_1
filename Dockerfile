# ═══════════════════════════════════════════════════════════════════
# Stage 1: Build React frontend
# ═══════════════════════════════════════════════════════════════════
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

# Install deps first (cached layer)
COPY frontend/package*.json ./
RUN npm install

# Build — VITE_API_URL is empty because the frontend
# will call /api/* which ASP.NET serves from the same origin
COPY frontend/ .
RUN npm run build

# ═══════════════════════════════════════════════════════════════════
# Stage 2: Build ASP.NET Core backend
# ═══════════════════════════════════════════════════════════════════
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend-build
WORKDIR /src

COPY backend/InventoryApp/InventoryApp.csproj InventoryApp/
RUN dotnet restore InventoryApp/InventoryApp.csproj

COPY backend/InventoryApp/ InventoryApp/
RUN dotnet publish InventoryApp/InventoryApp.csproj -c Release -o /app/publish --no-restore

# ═══════════════════════════════════════════════════════════════════
# Stage 3: Final runtime image
# React static files go into ASP.NET wwwroot → served from same port
# ═══════════════════════════════════════════════════════════════════
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copy published .NET app
COPY --from=backend-build /app/publish .

# Copy React build into wwwroot — ASP.NET will serve it statically
COPY --from=frontend-build /app/frontend/dist ./wwwroot

# Health check
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s \
  CMD curl -f http://localhost:8080/api/health || exit 1

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "InventoryApp.dll"]
