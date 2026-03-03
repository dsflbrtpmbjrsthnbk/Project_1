using InventoryApp.Data;
using InventoryApp.DTOs;
using InventoryApp.Models;
using InventoryApp.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using CsvHelper;
using System.Globalization;

namespace InventoryApp.Controllers;

[ApiController]
[Route("api/inventories")]
public class InventoriesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<AppUser> _userManager;
    private readonly IImageService _imageService;

    public InventoriesController(AppDbContext db, UserManager<AppUser> um, IImageService img)
    {
        _db = db;
        _userManager = um;
        _imageService = img;
    }

    private string? UserId => User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    private bool IsAdmin => User.IsInRole("Admin");

    // GET /api/inventories?page=1&pageSize=20&sort=latest|popular
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string sort = "latest")
    {
        var query = _db.Inventories.Include(i => i.Owner).Include(i => i.Items).AsQueryable();
        query = sort == "popular"
            ? query.OrderByDescending(i => i.Items.Count)
            : query.OrderByDescending(i => i.CreatedAt);

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(i => new InventoryListDto(i.Id, i.Title, i.Description, i.Category, i.ImageUrl,
                i.Tags, i.IsPublic, i.CreatedAt, i.Owner.DisplayName, i.Items.Count))
            .ToListAsync();

        return Ok(new { Total = total, Items = items });
    }

    // GET /api/inventories/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var inv = await _db.Inventories.Include(i => i.Owner).Include(i => i.Accesses).FirstOrDefaultAsync(i => i.Id == id);
        if (inv == null) return NotFound();

        var uid = UserId;
        bool canEdit = IsAdmin || inv.OwnerId == uid;
        bool canWrite = canEdit || inv.IsPublic || (uid != null && inv.Accesses.Any(a => a.UserId == uid));

        return Ok(MapInventoryDetail(inv, canEdit, canWrite));
    }

    // POST /api/inventories
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInventoryDto dto)
    {
        var inv = new Inventory
        {
            Title = dto.Title,
            Description = dto.Description,
            Category = dto.Category,
            ImageUrl = dto.ImageUrl,
            Tags = dto.Tags,
            IsPublic = dto.IsPublic,
            CustomIdFormat = dto.CustomIdFormat,
            OwnerId = UserId!
        };
        ApplyFields(inv, dto.Fields);
        _db.Inventories.Add(inv);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = inv.Id }, new { inv.Id });
    }

    // PUT /api/inventories/{id}
    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateInventoryDto dto)
    {
        var inv = await _db.Inventories.FindAsync(id);
        if (inv == null) return NotFound();
        if (!IsAdmin && inv.OwnerId != UserId) return Forbid();

        inv.Title = dto.Title;
        inv.Description = dto.Description;
        inv.Category = dto.Category;
        inv.Tags = dto.Tags;
        inv.IsPublic = dto.IsPublic;
        inv.CustomIdFormat = dto.CustomIdFormat;
        inv.UpdatedAt = DateTime.UtcNow;

        // Update image only if changed
        if (dto.ImageUrl != inv.ImageUrl)
        {
            if (!string.IsNullOrEmpty(inv.ImageUrl)) await _imageService.DeleteAsync(inv.ImageUrl);
            inv.ImageUrl = dto.ImageUrl;
        }

        ApplyFields(inv, dto.Fields);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // DELETE /api/inventories/{id}
    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var inv = await _db.Inventories.FindAsync(id);
        if (inv == null) return NotFound();
        if (!IsAdmin && inv.OwnerId != UserId) return Forbid();
        _db.Inventories.Remove(inv);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET /api/inventories/{id}/access
    [Authorize]
    [HttpGet("{id}/access")]
    public async Task<IActionResult> GetAccess(int id)
    {
        var inv = await _db.Inventories.Include(i => i.Accesses).ThenInclude(a => a.User).FirstOrDefaultAsync(i => i.Id == id);
        if (inv == null) return NotFound();
        if (!IsAdmin && inv.OwnerId != UserId) return Forbid();
        return Ok(inv.Accesses.Select(a => new AccessUserDto(a.User.Id, a.User.DisplayName, a.User.Email)));
    }

    // POST /api/inventories/{id}/access
    [Authorize]
    [HttpPost("{id}/access")]
    public async Task<IActionResult> AddAccess(int id, [FromBody] AddAccessDto dto)
    {
        var inv = await _db.Inventories.FindAsync(id);
        if (inv == null) return NotFound();
        if (!IsAdmin && inv.OwnerId != UserId) return Forbid();

        var user = await _userManager.FindByEmailAsync(dto.UserIdOrEmail)
                   ?? await _userManager.FindByIdAsync(dto.UserIdOrEmail);
        if (user == null) return BadRequest("User not found");

        if (!await _db.InventoryAccesses.AnyAsync(a => a.InventoryId == id && a.UserId == user.Id))
        {
            _db.InventoryAccesses.Add(new InventoryAccess { InventoryId = id, UserId = user.Id });
            await _db.SaveChangesAsync();
        }
        return Ok();
    }

    // DELETE /api/inventories/{id}/access/{userId}
    [Authorize]
    [HttpDelete("{id}/access/{userId}")]
    public async Task<IActionResult> RemoveAccess(int id, string userId)
    {
        var inv = await _db.Inventories.FindAsync(id);
        if (inv == null) return NotFound();
        if (!IsAdmin && inv.OwnerId != UserId) return Forbid();
        var access = await _db.InventoryAccesses.FirstOrDefaultAsync(a => a.InventoryId == id && a.UserId == userId);
        if (access != null) { _db.InventoryAccesses.Remove(access); await _db.SaveChangesAsync(); }
        return NoContent();
    }

    // GET /api/inventories/{id}/stats
    [HttpGet("{id}/stats")]
    public async Task<IActionResult> Stats(int id)
    {
        var totalItems = await _db.Items.CountAsync(i => i.InventoryId == id);
        var totalLikes = await _db.Likes.CountAsync(l => l.Item!.InventoryId == id);
        var byMonth = await _db.Items.Where(i => i.InventoryId == id)
            .GroupBy(i => new { i.CreatedAt.Year, i.CreatedAt.Month })
            .Select(g => new { Key = $"{g.Key.Year}-{g.Key.Month:D2}", Count = g.Count() })
            .ToListAsync();
        return Ok(new InventoryStatsDto(totalItems, totalLikes, byMonth.ToDictionary(x => x.Key, x => x.Count)));
    }

    // GET /api/inventories/{id}/export
    [Authorize]
    [HttpGet("{id}/export")]
    public async Task<IActionResult> Export(int id)
    {
        var inv = await _db.Inventories.Include(i => i.Items).FirstOrDefaultAsync(i => i.Id == id);
        if (inv == null) return NotFound();
        if (!IsAdmin && inv.OwnerId != UserId) return Forbid();

        using var ms = new MemoryStream();
        await using var writer = new StreamWriter(ms);
        await using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

        // Write header
        csv.WriteField("ID");
        csv.WriteField("CustomId");
        if (inv.StringField1Name != null) csv.WriteField(inv.StringField1Name);
        if (inv.StringField2Name != null) csv.WriteField(inv.StringField2Name);
        if (inv.StringField3Name != null) csv.WriteField(inv.StringField3Name);
        if (inv.NumberField1Name != null) csv.WriteField(inv.NumberField1Name);
        if (inv.NumberField2Name != null) csv.WriteField(inv.NumberField2Name);
        if (inv.NumberField3Name != null) csv.WriteField(inv.NumberField3Name);
        await csv.NextRecordAsync();

        foreach (var item in inv.Items)
        {
            csv.WriteField(item.Id);
            csv.WriteField(item.CustomId);
            if (inv.StringField1Name != null) csv.WriteField(item.StringValue1 ?? "");
            if (inv.StringField2Name != null) csv.WriteField(item.StringValue2 ?? "");
            if (inv.StringField3Name != null) csv.WriteField(item.StringValue3 ?? "");
            if (inv.NumberField1Name != null) csv.WriteField(item.NumberValue1?.ToString() ?? "");
            if (inv.NumberField2Name != null) csv.WriteField(item.NumberValue2?.ToString() ?? "");
            if (inv.NumberField3Name != null) csv.WriteField(item.NumberValue3?.ToString() ?? "");
            await csv.NextRecordAsync();
        }

        await writer.FlushAsync();
        return File(ms.ToArray(), "text/csv", $"inventory-{id}.csv");
    }

    // GET /api/inventories/user/{userId}
    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserInventories(string userId)
    {
        var owned = await _db.Inventories.Include(i => i.Owner).Include(i => i.Items)
            .Where(i => i.OwnerId == userId)
            .Select(i => new InventoryListDto(i.Id, i.Title, i.Description, i.Category, i.ImageUrl,
                i.Tags, i.IsPublic, i.CreatedAt, i.Owner.DisplayName, i.Items.Count))
            .ToListAsync();

        var withAccess = await _db.InventoryAccesses
            .Include(a => a.Inventory).ThenInclude(i => i.Owner)
            .Include(a => a.Inventory).ThenInclude(i => i.Items)
            .Where(a => a.UserId == userId)
            .Select(a => new InventoryListDto(a.Inventory.Id, a.Inventory.Title, a.Inventory.Description,
                a.Inventory.Category, a.Inventory.ImageUrl, a.Inventory.Tags, a.Inventory.IsPublic,
                a.Inventory.CreatedAt, a.Inventory.Owner.DisplayName, a.Inventory.Items.Count))
            .ToListAsync();

        return Ok(new { Owned = owned, WithAccess = withAccess });
    }

    // Image upload endpoint
    [Authorize]
    [HttpPost("upload-image")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0) return BadRequest("No file");
        var url = await _imageService.UploadAsync(file);
        return Ok(new { url });
    }

    private static InventoryDetailDto MapInventoryDetail(Inventory inv, bool canEdit, bool canWrite) =>
        new(inv.Id, inv.Title, inv.Description, inv.Category, inv.ImageUrl, inv.Tags, inv.IsPublic,
            inv.CreatedAt, inv.UpdatedAt, inv.OwnerId, inv.Owner.DisplayName, inv.CustomIdFormat,
            new FieldDefinitionsDto(inv.StringField1Name, inv.StringField2Name, inv.StringField3Name,
                inv.TextField1Name, inv.TextField2Name, inv.TextField3Name,
                inv.NumberField1Name, inv.NumberField2Name, inv.NumberField3Name,
                inv.LinkField1Name, inv.LinkField2Name, inv.LinkField3Name,
                inv.BoolField1Name, inv.BoolField2Name, inv.BoolField3Name),
            canEdit, canWrite);

    private static void ApplyFields(Inventory inv, FieldDefinitionsDto f)
    {
        inv.StringField1Name = f.String1; inv.StringField2Name = f.String2; inv.StringField3Name = f.String3;
        inv.TextField1Name = f.Text1; inv.TextField2Name = f.Text2; inv.TextField3Name = f.Text3;
        inv.NumberField1Name = f.Number1; inv.NumberField2Name = f.Number2; inv.NumberField3Name = f.Number3;
        inv.LinkField1Name = f.Link1; inv.LinkField2Name = f.Link2; inv.LinkField3Name = f.Link3;
        inv.BoolField1Name = f.Bool1; inv.BoolField2Name = f.Bool2; inv.BoolField3Name = f.Bool3;
    }
}
