using System.Text;
using InventoryApp.Data;
using InventoryApp.Models;
using InventoryApp.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ── Connection string ─────────────────────────────────────────────────────────
// Render sets DATABASE_URL in postgres://user:pass@host:port/db format.
// Npgsql needs Host=...;Username=... format — we convert it here.
static string GetConnectionString(IConfiguration config)
{
    var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
    if (!string.IsNullOrEmpty(databaseUrl))
    {
        var uri = new Uri(databaseUrl);
        var userInfo = uri.UserInfo.Split(':');
        var user = userInfo[0];
        var pass = userInfo.Length > 1 ? userInfo[1] : "";
        var db   = uri.AbsolutePath.TrimStart('/');
        return $"Host={uri.Host};Port={uri.Port};Database={db};Username={user};Password={pass};SSL Mode=Require;Trust Server Certificate=true";
    }
    return config.GetConnectionString("DefaultConnection")!;
}

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(GetConnectionString(builder.Configuration)));

// ── Identity ──────────────────────────────────────────────────────────────────
builder.Services.AddIdentity<AppUser, IdentityRole>(opt =>
{
    opt.Password.RequireDigit = false;
    opt.Password.RequiredLength = 1;
    opt.Password.RequireNonAlphanumeric = false;
    opt.Password.RequireUppercase = false;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// ── JWT + OAuth ───────────────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is required");

builder.Services.AddAuthentication(opt =>
{
    opt.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    opt.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(opt =>
{
    opt.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer           = true,
        ValidateAudience         = true,
        ValidateLifetime         = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer              = builder.Configuration["Jwt:Issuer"],
        ValidAudience            = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
    };
    opt.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            var token = ctx.Request.Query["access_token"];
            if (!string.IsNullOrEmpty(token)) ctx.Token = token;
            return Task.CompletedTask;
        }
    };
})
.AddCookie("Cookies")
.AddGoogle(opt =>
{
    opt.SignInScheme  = "Cookies";
    opt.ClientId      = builder.Configuration["Auth:Google:ClientId"]     ?? "";
    opt.ClientSecret  = builder.Configuration["Auth:Google:ClientSecret"] ?? "";
    opt.Scope.Add("profile");
    opt.Scope.Add("email");
    opt.SaveTokens = true;
})
.AddFacebook(opt =>
{
    opt.SignInScheme = "Cookies";
    opt.AppId        = builder.Configuration["Auth:Facebook:AppId"]     ?? "";
    opt.AppSecret    = builder.Configuration["Auth:Facebook:AppSecret"] ?? "";
    opt.Scope.Add("email");
    opt.Fields.Add("picture");
});

// ── Services ──────────────────────────────────────────────────────────────────
builder.Services.AddScoped<ITokenService,    TokenService>();
builder.Services.AddScoped<ICustomIdService, CustomIdService>();
builder.Services.AddScoped<ISearchService,   SearchService>();
builder.Services.AddScoped<IImageService,    CloudinaryImageService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Single-container: frontend is same origin, but allow all so health checks work too
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// ── Migrate DB with retry (Render DB may take a moment to be ready) ───────────
using (var scope = app.Services.CreateScope())
{
    var logger  = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var retries = 10;
    while (retries-- > 0)
    {
        try
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.MigrateAsync();

            var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            foreach (var role in new[] { "Admin", "User" })
                if (!await roles.RoleExistsAsync(role))
                    await roles.CreateAsync(new IdentityRole(role));

            logger.LogInformation("Database ready.");
            break;
        }
        catch (Exception ex)
        {
            logger.LogWarning("DB not ready, retrying in 3s ({N} left). Error: {Msg}", retries, ex.Message);
            if (retries == 0) throw;
            await Task.Delay(3000);
        }
    }
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.UseSwagger();
app.UseSwaggerUI();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Serve React static files from wwwroot (built into image)
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

app.Run();
