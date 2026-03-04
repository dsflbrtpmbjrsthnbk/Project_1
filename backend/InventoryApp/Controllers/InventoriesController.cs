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

    // GET /api/inventories?page=1&pageSize=20&sort=latest|popular&tag=
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string sort = "latest", [FromQuery] string? tag = null)
    {
        var query = _db.Inventories.Include(i => i.Owner).Include(i => i.Items).AsQueryable();

        if (!string.IsNullOrWhiteSpace(tag))
        {
            var t = tag.ToLower().Trim();
            query = query.Where(i => i.Tags.ToLower().Contains(t));
        }

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
            OwnerId = UserId!,
            Version = 0
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

        // Optimistic locking for auto-save
        if (inv.Version != dto.Version)
            return Conflict(new { message = "Inventory was modified by another user. Please refresh.", serverVersion = inv.Version });

        inv.Title = dto.Title;
        inv.Description = dto.Description;
        inv.Category = dto.Category;
        inv.Tags = dto.Tags;
        inv.IsPublic = dto.IsPublic;
        inv.CustomIdFormat = dto.CustomIdFormat;
        inv.UpdatedAt = DateTime.UtcNow;
        inv.Version++;

        if (dto.ImageUrl != inv.ImageUrl)
        {
            if (!string.IsNullOrEmpty(inv.ImageUrl)) await _imageService.DeleteAsync(inv.ImageUrl);
            inv.ImageUrl = dto.ImageUrl;
        }

        ApplyFields(inv, dto.Fields);
        await _db.SaveChangesAsync();
        return Ok(new { version = inv.Version });
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
                   ?? await _userManager.FindByNameAsync(dto.UserIdOrEmail)
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

    // GET /api/inventories/{id}/comments
    [HttpGet("{id}/comments")]
    public async Task<IActionResult> GetComments(int id)
    {
        var comments = await _db.Comments
            .Include(c => c.Author)
            .Where(c => c.InventoryId == id)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CommentDto(c.Id, c.Text, c.CreatedAt, c.AuthorId, c.Author.DisplayName, c.Author.AvatarUrl))
            .ToListAsync();
        return Ok(comments);
    }

    // POST /api/inventories/{id}/comments
    [Authorize]
    [HttpPost("{id}/comments")]
    public async Task<IActionResult> AddComment(int id, [FromBody] CreateCommentDto dto)
    {
        if (await _db.Inventories.FindAsync(id) == null) return NotFound();
        var comment = new Comment { Text = dto.Text, InventoryId = id, AuthorId = UserId! };
        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();
        await _db.Entry(comment).Reference(c => c.Author).LoadAsync();
        return Ok(new CommentDto(comment.Id, comment.Text, comment.CreatedAt, comment.AuthorId,
            comment.Author.DisplayName, comment.Author.AvatarUrl));
    }

    // DELETE /api/inventories/{id}/comments/{commentId}
    [Authorize]
    [HttpDelete("{id}/comments/{commentId}")]
    public async Task<IActionResult> DeleteComment(int id, int commentId)
    {
        var comment = await _db.Comments.FindAsync(commentId);
        if (comment == null || comment.InventoryId != id) return NotFound();
        if (!IsAdmin && comment.AuthorId != UserId) return Forbid();
        _db.Comments.Remove(comment);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET /api/inventories/{id}/stats
    [HttpGet("{id}/stats")]
    public async Task<IActionResult> Stats(int id)
    {
        var inv = await _db.Inventories.FindAsync(id);
        if (inv == null) return NotFound();

        var totalItems = await _db.Items.CountAsync(i => i.InventoryId == id);
        var totalLikes = await _db.Likes.CountAsync(l => l.Item!.InventoryId == id);
        var byMonth = await _db.Items.Where(i => i.InventoryId == id)
            .GroupBy(i => new { i.CreatedAt.Year, i.CreatedAt.Month })
            .Select(g => new { Key = $"{g.Key.Year}-{g.Key.Month:D2}", Count = g.Count() })
            .ToListAsync();

        var numericStats = new List<FieldStatDto>();
        var stringStats = new List<FieldStatDto>();

        // Aggregate numeric fields
        var numFields = new[] {
            (inv.NumberField1Name, 1), (inv.NumberField2Name, 2), (inv.NumberField3Name, 3)
        };
        foreach (var (name, idx) in numFields)
        {
            if (string.IsNullOrEmpty(name)) continue;
            var values = idx switch {
                1 => await _db.Items.Where(i => i.InventoryId == id && i.NumberValue1 != null).Select(i => i.NumberValue1!.Value).ToListAsync(),
                2 => await _db.Items.Where(i => i.InventoryId == id && i.NumberValue2 != null).Select(i => i.NumberValue2!.Value).ToListAsync(),
                _ => await _db.Items.Where(i => i.InventoryId == id && i.NumberValue3 != null).Select(i => i.NumberValue3!.Value).ToListAsync(),
            };
            if (values.Count > 0)
                numericStats.Add(new FieldStatDto(name!, values.Min(), values.Max(), Math.Round(values.Average(), 2), null, values.Count));
        }

        // Most-used string values
        var strFields = new[] {
            (inv.StringField1Name, 1), (inv.StringField2Name, 2), (inv.StringField3Name, 3)
        };
        foreach (var (name, idx) in strFields)
        {
            if (string.IsNullOrEmpty(name)) continue;
            var group = idx switch {
                1 => await _db.Items.Where(i => i.InventoryId == id && i.StringValue1 != null).GroupBy(i => i.StringValue1).Select(g => new { g.Key, Count = g.Count() }).OrderByDescending(g => g.Count).FirstOrDefaultAsync(),
                2 => await _db.Items.Where(i => i.InventoryId == id && i.StringValue2 != null).GroupBy(i => i.StringValue2).Select(g => new { g.Key, Count = g.Count() }).OrderByDescending(g => g.Count).FirstOrDefaultAsync(),
                _ => await _db.Items.Where(i => i.InventoryId == id && i.StringValue3 != null).GroupBy(i => i.StringValue3).Select(g => new { g.Key, Count = g.Count() }).OrderByDescending(g => g.Count).FirstOrDefaultAsync(),
            };
            var total = await _db.Items.CountAsync(i => i.InventoryId == id);
            stringStats.Add(new FieldStatDto(name!, null, null, null, group?.Key, total));
        }

        return Ok(new InventoryStatsDto(totalItems, totalLikes, byMonth.ToDictionary(x => x.Key, x => x.Count), numericStats, stringStats));
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

        csv.WriteField("ID"); csv.WriteField("CustomId"); csv.WriteField("CreatedAt");
        if (inv.StringField1Name != null) csv.WriteField(inv.StringField1Name);
        if (inv.StringField2Name != null) csv.WriteField(inv.StringField2Name);
        if (inv.StringField3Name != null) csv.WriteField(inv.StringField3Name);
        if (inv.TextField1Name != null) csv.WriteField(inv.TextField1Name);
        if (inv.TextField2Name != null) csv.WriteField(inv.TextField2Name);
        if (inv.TextField3Name != null) csv.WriteField(inv.TextField3Name);
        if (inv.NumberField1Name != null) csv.WriteField(inv.NumberField1Name);
        if (inv.NumberField2Name != null) csv.WriteField(inv.NumberField2Name);
        if (inv.NumberField3Name != null) csv.WriteField(inv.NumberField3Name);
        if (inv.LinkField1Name != null) csv.WriteField(inv.LinkField1Name);
        if (inv.LinkField2Name != null) csv.WriteField(inv.LinkField2Name);
        if (inv.LinkField3Name != null) csv.WriteField(inv.LinkField3Name);
        if (inv.BoolField1Name != null) csv.WriteField(inv.BoolField1Name);
        if (inv.BoolField2Name != null) csv.WriteField(inv.BoolField2Name);
        if (inv.BoolField3Name != null) csv.WriteField(inv.BoolField3Name);
        await csv.NextRecordAsync();

        foreach (var item in inv.Items)
        {
            csv.WriteField(item.Id); csv.WriteField(item.CustomId); csv.WriteField(item.CreatedAt.ToString("yyyy-MM-dd"));
            if (inv.StringField1Name != null) csv.WriteField(item.StringValue1 ?? "");
            if (inv.StringField2Name != null) csv.WriteField(item.StringValue2 ?? "");
            if (inv.StringField3Name != null) csv.WriteField(item.StringValue3 ?? "");
            if (inv.TextField1Name != null) csv.WriteField(item.TextValue1 ?? "");
            if (inv.TextField2Name != null) csv.WriteField(item.TextValue2 ?? "");
            if (inv.TextField3Name != null) csv.WriteField(item.TextValue3 ?? "");
            if (inv.NumberField1Name != null) csv.WriteField(item.NumberValue1?.ToString() ?? "");
            if (inv.NumberField2Name != null) csv.WriteField(item.NumberValue2?.ToString() ?? "");
            if (inv.NumberField3Name != null) csv.WriteField(item.NumberValue3?.ToString() ?? "");
            if (inv.LinkField1Name != null) csv.WriteField(item.LinkValue1 ?? "");
            if (inv.LinkField2Name != null) csv.WriteField(item.LinkValue2 ?? "");
            if (inv.LinkField3Name != null) csv.WriteField(item.LinkValue3 ?? "");
            if (inv.BoolField1Name != null) csv.WriteField(item.BoolValue1?.ToString() ?? "");
            if (inv.BoolField2Name != null) csv.WriteField(item.BoolValue2?.ToString() ?? "");
            if (inv.BoolField3Name != null) csv.WriteField(item.BoolValue3?.ToString() ?? "");
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

    private static InventoryDetailDto MapInventoryDetail(Inventory inv, bool canEdit, bool canWrite)
    {
        static FieldDefDto F(string? name, string? desc, bool show) => new(name, desc, show);
        var fields = new FieldsDto(
            F(inv.StringField1Name, inv.StringField1Desc, inv.StringField1Show),
            F(inv.StringField2Name, inv.StringField2Desc, inv.StringField2Show),
            F(inv.StringField3Name, inv.StringField3Desc, inv.StringField3Show),
            F(inv.TextField1Name, inv.TextField1Desc, inv.TextField1Show),
            F(inv.TextField2Name, inv.TextField2Desc, inv.TextField2Show),
            F(inv.TextField3Name, inv.TextField3Desc, inv.TextField3Show),
            F(inv.NumberField1Name, inv.NumberField1Desc, inv.NumberField1Show),
            F(inv.NumberField2Name, inv.NumberField2Desc, inv.NumberField2Show),
            F(inv.NumberField3Name, inv.NumberField3Desc, inv.NumberField3Show),
            F(inv.LinkField1Name, inv.LinkField1Desc, inv.LinkField1Show),
            F(inv.LinkField2Name, inv.LinkField2Desc, inv.LinkField2Show),
            F(inv.LinkField3Name, inv.LinkField3Desc, inv.LinkField3Show),
            F(inv.BoolField1Name, inv.BoolField1Desc, inv.BoolField1Show),
            F(inv.BoolField2Name, inv.BoolField2Desc, inv.BoolField2Show),
            F(inv.BoolField3Name, inv.BoolField3Desc, inv.BoolField3Show));

        return new InventoryDetailDto(inv.Id, inv.Title, inv.Description, inv.Category, inv.ImageUrl,
            inv.Tags, inv.IsPublic, inv.CreatedAt, inv.UpdatedAt, inv.OwnerId, inv.Owner.DisplayName,
            inv.CustomIdFormat, fields, canEdit, canWrite, inv.Version);
    }

    private static void ApplyFields(Inventory inv, FieldDefinitionsDto f)
    {
        inv.StringField1Name = f.String1; inv.StringField1Desc = f.String1Desc; inv.StringField1Show = f.String1Show;
        inv.StringField2Name = f.String2; inv.StringField2Desc = f.String2Desc; inv.StringField2Show = f.String2Show;
        inv.StringField3Name = f.String3; inv.StringField3Desc = f.String3Desc; inv.StringField3Show = f.String3Show;
        inv.TextField1Name = f.Text1; inv.TextField1Desc = f.Text1Desc; inv.TextField1Show = f.Text1Show;
        inv.TextField2Name = f.Text2; inv.TextField2Desc = f.Text2Desc; inv.TextField2Show = f.Text2Show;
        inv.TextField3Name = f.Text3; inv.TextField3Desc = f.Text3Desc; inv.TextField3Show = f.Text3Show;
        inv.NumberField1Name = f.Number1; inv.NumberField1Desc = f.Number1Desc; inv.NumberField1Show = f.Number1Show;
        inv.NumberField2Name = f.Number2; inv.NumberField2Desc = f.Number2Desc; inv.NumberField2Show = f.Number2Show;
        inv.NumberField3Name = f.Number3; inv.NumberField3Desc = f.Number3Desc; inv.NumberField3Show = f.Number3Show;
        inv.LinkField1Name = f.Link1; inv.LinkField1Desc = f.Link1Desc; inv.LinkField1Show = f.Link1Show;
        inv.LinkField2Name = f.Link2; inv.LinkField2Desc = f.Link2Desc; inv.LinkField2Show = f.Link2Show;
        inv.LinkField3Name = f.Link3; inv.LinkField3Desc = f.Link3Desc; inv.LinkField3Show = f.Link3Show;
        inv.BoolField1Name = f.Bool1; inv.BoolField1Desc = f.Bool1Desc; inv.BoolField1Show = f.Bool1Show;
        inv.BoolField2Name = f.Bool2; inv.BoolField2Desc = f.Bool2Desc; inv.BoolField2Show = f.Bool2Show;
        inv.BoolField3Name = f.Bool3; inv.BoolField3Desc = f.Bool3Desc; inv.BoolField3Show = f.Bool3Show;
    }
}
