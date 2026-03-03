using InventoryApp.Data;
using InventoryApp.DTOs;
using InventoryApp.Models;
using InventoryApp.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace InventoryApp.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly AppDbContext _db;

    public AdminController(UserManager<AppUser> um, AppDbContext db) { _userManager = um; _db = db; }

    // GET /api/admin/users
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? q = null)
    {
        var query = _userManager.Users.AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(u => u.DisplayName.Contains(q) || (u.Email != null && u.Email.Contains(q)));

        var total = await query.CountAsync();
        var users = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        var result = new List<AdminUserDto>();
        foreach (var u in users)
        {
            var roles = await _userManager.GetRolesAsync(u);
            var invCount = await _db.Inventories.CountAsync(i => i.OwnerId == u.Id);
            result.Add(new AdminUserDto(u.Id, u.DisplayName, u.Email, u.IsBlocked, u.CreatedAt, roles, invCount));
        }
        return Ok(new { Total = total, Users = result });
    }

    // POST /api/admin/users/{id}/block
    [HttpPost("users/{id}/block")]
    public async Task<IActionResult> Block(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();
        user.IsBlocked = true;
        await _userManager.UpdateAsync(user);
        return Ok();
    }

    // POST /api/admin/users/{id}/unblock
    [HttpPost("users/{id}/unblock")]
    public async Task<IActionResult> Unblock(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();
        user.IsBlocked = false;
        await _userManager.UpdateAsync(user);
        return Ok();
    }

    // DELETE /api/admin/users/{id}
    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();
        await _userManager.DeleteAsync(user);
        return NoContent();
    }

    // POST /api/admin/users/{id}/make-admin
    [HttpPost("users/{id}/make-admin")]
    public async Task<IActionResult> MakeAdmin(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();
        if (!await _userManager.IsInRoleAsync(user, "Admin"))
            await _userManager.AddToRoleAsync(user, "Admin");
        return Ok();
    }

    // POST /api/admin/users/{id}/remove-admin
    // Note: Admin CAN remove their own admin role
    [HttpPost("users/{id}/remove-admin")]
    public async Task<IActionResult> RemoveAdmin(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();
        await _userManager.RemoveFromRoleAsync(user, "Admin");
        return Ok();
    }
}

[ApiController]
[Route("api/search")]
public class SearchController : ControllerBase
{
    private readonly ISearchService _search;
    public SearchController(ISearchService search) => _search = search;

    // GET /api/search?q=query
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var results = await _search.SearchAsync(q, uid);
        return Ok(results);
    }
}

[ApiController]
[Route("api/tags")]
public class TagsController : ControllerBase
{
    private readonly AppDbContext _db;
    public TagsController(AppDbContext db) => _db = db;

    // GET /api/tags/cloud
    [HttpGet("cloud")]
    public async Task<IActionResult> Cloud()
    {
        var allTags = await _db.Inventories.Select(i => i.Tags).ToListAsync();
        var tagCounts = new Dictionary<string, int>();
        foreach (var tagStr in allTags)
            foreach (var tag in tagStr.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                var t = tag.ToLower();
                tagCounts[t] = tagCounts.GetValueOrDefault(t, 0) + 1;
            }
        return Ok(tagCounts.OrderByDescending(kv => kv.Value).Take(50)
            .Select(kv => new { Tag = kv.Key, Count = kv.Value }));
    }

    // GET /api/tags/autocomplete?q=
    [HttpGet("autocomplete")]
    public async Task<IActionResult> Autocomplete([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q)) return Ok(Array.Empty<string>());
        var allTags = await _db.Inventories.Select(i => i.Tags).ToListAsync();
        var matching = allTags
            .SelectMany(t => t.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .Where(t => t.ToLower().Contains(q.ToLower()))
            .Distinct()
            .Take(10)
            .ToList();
        return Ok(matching);
    }
}
