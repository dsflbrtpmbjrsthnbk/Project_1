using InventoryApp.DTOs;
using InventoryApp.Models;
using InventoryApp.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace InventoryApp.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly ITokenService _tokenService;

    public AuthController(UserManager<AppUser> userManager, ITokenService tokenService)
    {
        _userManager = userManager;
        _tokenService = tokenService;
    }

    // GET /api/auth/login/google
    [HttpGet("login/{provider}")]
    public IActionResult Login(string provider, [FromQuery] string returnUrl = "/")
    {
        var props = new AuthenticationProperties
        {
            RedirectUri = $"/api/auth/callback/{provider}",
            Items = { ["returnUrl"] = returnUrl }
        };
        return Challenge(props, provider);
    }

    // GET /api/auth/callback/{provider}
    [HttpGet("callback/{provider}")]
    public async Task<IActionResult> Callback(string provider)
    {
        var result = await HttpContext.AuthenticateAsync("Cookies");
        if (!result.Succeeded) return Unauthorized();

        var principal = result.Principal;
        var email = principal.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        var name = principal.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? email ?? "User";
        var avatar = principal.FindFirst("picture")?.Value ??
                     principal.FindFirst("urn:google:picture")?.Value;

        var user = await _userManager.FindByEmailAsync(email ?? "");
        if (user == null)
        {
            user = new AppUser
            {
                UserName = email,
                Email = email,
                DisplayName = name,
                AvatarUrl = avatar,
                EmailConfirmed = true
            };
            await _userManager.CreateAsync(user);
        }
        else
        {
            if (user.IsBlocked) return Forbid();
            user.AvatarUrl = avatar ?? user.AvatarUrl;
            await _userManager.UpdateAsync(user);
        }

        var token = await _tokenService.GenerateTokenAsync(user);
        var returnUrl = result.Properties?.Items["returnUrl"] ?? "/";
        // Redirect to frontend with token
        return Redirect($"{returnUrl}?token={token}");
    }

    // GET /api/auth/me
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await _userManager.FindByIdAsync(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        if (user == null) return NotFound();
        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new UserDto(user.Id, user.DisplayName, user.Email, user.AvatarUrl, user.IsBlocked, roles));
    }

    // GET /api/auth/users/search?q=
    [Authorize]
    [HttpGet("users/search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q)) return Ok(Array.Empty<object>());
        var users = _userManager.Users
            .Where(u => u.DisplayName.Contains(q) || (u.Email != null && u.Email.Contains(q)))
            .Take(10)
            .Select(u => new AccessUserDto(u.Id, u.DisplayName, u.Email))
            .ToList();
        return Ok(users);
    }
}
