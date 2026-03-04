using System.Text;
using InventoryApp.Data;
using InventoryApp.Models;
using InventoryApp.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ── GET CONNECTION STRING ────────────────────────────────────────────────
static string GetConnectionString(IConfiguration config)
{
    var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
    if (!string.IsNullOrEmpty(databaseUrl))
    {
        var uri      = new Uri(databaseUrl);
        var userInfo = uri.UserInfo.Split(':');
        var user     = Uri.UnescapeDataString(userInfo[0]);
        var pass     = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
        var host     = uri.Host;
        var port     = uri.Port > 0 ? uri.Port : 5432;
        var db       = uri.AbsolutePath.TrimStart('/');
        return $"Host={host};Port={port};Database={db};Username={user};Password={pass};SSL Mode=Prefer;Trust Server Certificate=true";
    }
    return config.GetConnectionString("DefaultConnection")!;
}

// ── DB CONTEXT ───────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(GetConnectionString(builder.Configuration)));

// ── IDENTITY ─────────────────────────────────────────────────────────────
builder.Services.AddIdentity<AppUser, IdentityRole>(opt =>
{
    opt.Password.RequireDigit           = false;
    opt.Password.RequiredLength         = 1;
    opt.Password.RequireNonAlphanumeric = false;
    opt.Password.RequireUppercase       = false;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// ── JWT ─────────────────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is required");

var authBuilder = builder.Services.AddAuthentication(opt =>
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
.AddCookie("Cookies");

var googleId = builder.Configuration["Auth:Google:ClientId"];
if (!string.IsNullOrEmpty(googleId))
{
    authBuilder.AddGoogle(opt =>
    {
        opt.SignInScheme = "Cookies";
        opt.ClientId     = googleId;
        opt.ClientSecret = builder.Configuration["Auth:Google:ClientSecret"] ?? "";
        opt.Scope.Add("profile");
        opt.Scope.Add("email");
        opt.SaveTokens = true;
    });
}

var fbId = builder.Configuration["Auth:Facebook:AppId"];
if (!string.IsNullOrEmpty(fbId))
{
    authBuilder.AddFacebook(opt =>
    {
        opt.SignInScheme = "Cookies";
        opt.AppId        = fbId;
        opt.AppSecret    = builder.Configuration["Auth:Facebook:AppSecret"] ?? "";
        opt.Scope.Add("email");
        opt.Fields.Add("picture");
    });
}

// ── CUSTOM SERVICES ─────────────────────────────────────────────────────
builder.Services.AddScoped<ITokenService,    TokenService>();
builder.Services.AddScoped<ICustomIdService, CustomIdService>();
builder.Services.AddScoped<ISearchService,   SearchService>();
builder.Services.AddScoped<IImageService,    CloudinaryImageService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// ── STEP 1: WAIT FOR DB & APPLY MIGRATIONS ───────────────────────────────
try
{
    using (var scope = app.Services.CreateScope())
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var retries = 10;

        while (retries > 0)
        {
            try
            {
                if (await db.Database.CanConnectAsync())
                {
                    await db.Database.MigrateAsync();
                    logger.LogInformation("Database connected and migrations applied.");
                    break;
                }
                else
                {
                    retries--;
                    logger.LogWarning("DB connection check failed, retrying in 3s ({N} left).", retries);
                }
            }
            catch (Exception ex)
            {
                retries--;
                logger.LogWarning("DB not ready, retrying in 3s ({N} left). Error: {Msg}", retries, ex.Message);
            }

            if (retries > 0) await Task.Delay(3000);
        }

        if (retries == 0)
        {
            var msg = "Database unavailable after multiple retries.";
            logger.LogCritical(msg);
            throw new Exception(msg);
        }

        // ── STEP 2: SEED ROLES ───────────────────────────────────────────────
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        // Проверяем, есть ли таблица AspNetRoles (Postgres way)
        var hasRolesTable = false;
        try
        {
             var result = await db.Database.ExecuteSqlRawAsync(
                "SELECT 1 FROM information_schema.tables WHERE table_name='AspNetRoles' LIMIT 1;"
            );
            hasRolesTable = true; // If it doesn't throw, we assume we can at least query it or it's being created
        }
        catch { /* Table might not exist yet or other issue */ }

        if (hasRolesTable)
        {
            foreach (var role in new[] { "Admin", "User" })
                if (!await roleManager.RoleExistsAsync(role))
                    await roleManager.CreateAsync(new IdentityRole(role));
            logger.LogInformation("Roles seeded successfully.");
        }
        else
        {
            logger.LogError("Table AspNetRoles does not exist or matches failed. Roles not seeded.");
        }
    }
}
catch (Exception ex)
{
    Console.Error.WriteLine("CRITICAL STARTUP ERROR: " + ex.ToString());
    // We don't rethrow here to allow the app to potentially start and show logs via health check, 
    // but in many cases a 500 is better than a zombie process. 
    // However, Render might kill the container if healthcheck fails.
    throw; 
}

// ── MIDDLEWARE ─────────────────────────────────────────────────────────
app.UseSwagger();
app.UseSwaggerUI();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

app.Run();