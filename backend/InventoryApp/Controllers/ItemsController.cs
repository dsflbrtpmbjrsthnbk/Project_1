using InventoryApp.Data;
using InventoryApp.DTOs;
using InventoryApp.Models;
using InventoryApp.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace InventoryApp.Controllers;

[ApiController]
[Route("api/inventories/{inventoryId}/items")]
public class ItemsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICustomIdService _customIdService;

    public ItemsController(AppDbContext db, ICustomIdService customId)
    {
        _db = db;
        _customIdService = customId;
    }

    private string? UserId => User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    private bool IsAdmin => User.IsInRole("Admin");

    private async Task<(bool canWrite, bool canEdit, Inventory? inv)> CheckAccessAsync(int inventoryId)
    {
        var inv = await _db.Inventories.Include(i => i.Accesses).FirstOrDefaultAsync(i => i.Id == inventoryId);
        if (inv == null) return (false, false, null);
        var uid = UserId;
        bool canEdit = IsAdmin || inv.OwnerId == uid;
        bool canWrite = canEdit || inv.IsPublic || (uid != null && inv.Accesses.Any(a => a.UserId == uid));
        return (canWrite, canEdit, inv);
    }

    // GET /api/inventories/{inventoryId}/items
    [HttpGet]
    public async Task<IActionResult> GetAll(int inventoryId, [FromQuery] int page = 1, [FromQuery] int pageSize = 25)
    {
        var inv = await _db.Inventories.FindAsync(inventoryId);
        if (inv == null) return NotFound();

        var query = _db.Items.Where(i => i.InventoryId == inventoryId).OrderByDescending(i => i.CreatedAt);
        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(i => new ItemListDto(i.Id, i.CustomId, i.CreatedAt, i.UpdatedAt,
                i.StringValue1, i.StringValue2, i.StringValue3,
                i.TextValue1, i.TextValue2, i.TextValue3,
                i.NumberValue1, i.NumberValue2, i.NumberValue3,
                i.LinkValue1, i.LinkValue2, i.LinkValue3,
                i.BoolValue1, i.BoolValue2, i.BoolValue3,
                i.Likes.Count))
            .ToListAsync();

        return Ok(new { Total = total, Items = items });
    }

    // GET /api/inventories/{inventoryId}/items/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int inventoryId, int id)
    {
        var item = await _db.Items
            .Include(i => i.Likes)
            .Include(i => i.Comments).ThenInclude(c => c.Author)
            .FirstOrDefaultAsync(i => i.Id == id && i.InventoryId == inventoryId);
        if (item == null) return NotFound();

        var uid = UserId;
        return Ok(new ItemDetailDto(item.Id, item.CustomId, item.InventoryId, item.CreatedAt, item.UpdatedAt,
            item.StringValue1, item.StringValue2, item.StringValue3,
            item.TextValue1, item.TextValue2, item.TextValue3,
            item.NumberValue1, item.NumberValue2, item.NumberValue3,
            item.LinkValue1, item.LinkValue2, item.LinkValue3,
            item.BoolValue1, item.BoolValue2, item.BoolValue3,
            item.Likes.Count,
            uid != null && item.Likes.Any(l => l.UserId == uid),
            item.Comments.OrderBy(c => c.CreatedAt)
                .Select(c => new CommentDto(c.Id, c.Text, c.CreatedAt, c.AuthorId, c.Author.DisplayName, c.Author.AvatarUrl))
                .ToList()));
    }

    // POST /api/inventories/{inventoryId}/items
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create(int inventoryId, [FromBody] CreateItemDto dto)
    {
        var (canWrite, _, inv) = await CheckAccessAsync(inventoryId);
        if (inv == null) return NotFound();
        if (!canWrite) return Forbid();

        var customId = await _customIdService.GenerateAsync(inventoryId, inv.CustomIdFormat);

        var item = new Item
        {
            InventoryId = inventoryId,
            CustomId = customId,
            StringValue1 = dto.String1, StringValue2 = dto.String2, StringValue3 = dto.String3,
            TextValue1 = dto.Text1, TextValue2 = dto.Text2, TextValue3 = dto.Text3,
            NumberValue1 = dto.Number1, NumberValue2 = dto.Number2, NumberValue3 = dto.Number3,
            LinkValue1 = dto.Link1, LinkValue2 = dto.Link2, LinkValue3 = dto.Link3,
            BoolValue1 = dto.Bool1, BoolValue2 = dto.Bool2, BoolValue3 = dto.Bool3
        };
        UpdateSearchVector(item, inv);
        _db.Items.Add(item);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { inventoryId, id = item.Id }, new { item.Id, item.CustomId });
    }

    // PUT /api/inventories/{inventoryId}/items/{id}
    [Authorize]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int inventoryId, int id, [FromBody] UpdateItemDto dto)
    {
        var (canWrite, _, inv) = await CheckAccessAsync(inventoryId);
        if (inv == null) return NotFound();
        if (!canWrite) return Forbid();

        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == id && i.InventoryId == inventoryId);
        if (item == null) return NotFound();

        // Optimistic locking check
        var incoming = Convert.FromBase64String(dto.RowVersion);
        if (!item.RowVersion.SequenceEqual(incoming))
            return Conflict("Item was modified by another user. Please refresh and try again.");

        item.StringValue1 = dto.String1; item.StringValue2 = dto.String2; item.StringValue3 = dto.String3;
        item.TextValue1 = dto.Text1; item.TextValue2 = dto.Text2; item.TextValue3 = dto.Text3;
        item.NumberValue1 = dto.Number1; item.NumberValue2 = dto.Number2; item.NumberValue3 = dto.Number3;
        item.LinkValue1 = dto.Link1; item.LinkValue2 = dto.Link2; item.LinkValue3 = dto.Link3;
        item.BoolValue1 = dto.Bool1; item.BoolValue2 = dto.Bool2; item.BoolValue3 = dto.Bool3;
        item.UpdatedAt = DateTime.UtcNow;

        UpdateSearchVector(item, inv);

        try { await _db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict("Concurrency conflict detected.");
        }
        return Ok(new { item.Id, RowVersion = Convert.ToBase64String(item.RowVersion) });
    }

    // DELETE /api/inventories/{inventoryId}/items/{id}
    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int inventoryId, int id)
    {
        var (_, canEdit, inv) = await CheckAccessAsync(inventoryId);
        if (inv == null) return NotFound();
        if (!canEdit) return Forbid();

        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == id && i.InventoryId == inventoryId);
        if (item == null) return NotFound();
        _db.Items.Remove(item);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/inventories/{inventoryId}/items/{id}/like
    [Authorize]
    [HttpPost("{id}/like")]
    public async Task<IActionResult> ToggleLike(int inventoryId, int id)
    {
        var uid = UserId!;
        var item = await _db.Items.FindAsync(id);
        if (item == null || item.InventoryId != inventoryId) return NotFound();

        var existing = await _db.Likes.FirstOrDefaultAsync(l => l.ItemId == id && l.UserId == uid);
        if (existing != null)
            _db.Likes.Remove(existing);
        else
            _db.Likes.Add(new Like { ItemId = id, UserId = uid });

        await _db.SaveChangesAsync();
        var count = await _db.Likes.CountAsync(l => l.ItemId == id);
        return Ok(new { Count = count, Liked = existing == null });
    }

    // POST /api/inventories/{inventoryId}/items/{id}/comments
    [Authorize]
    [HttpPost("{id}/comments")]
    public async Task<IActionResult> AddComment(int inventoryId, int id, [FromBody] CreateCommentDto dto)
    {
        var item = await _db.Items.FindAsync(id);
        if (item == null || item.InventoryId != inventoryId) return NotFound();

        var comment = new Comment { Text = dto.Text, ItemId = id, AuthorId = UserId! };
        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();

        var author = await _db.Users.FindAsync(UserId);
        return Ok(new CommentDto(comment.Id, comment.Text, comment.CreatedAt, comment.AuthorId,
            author?.DisplayName ?? "Unknown", author?.AvatarUrl));
    }

    // DELETE /api/inventories/{inventoryId}/items/{itemId}/comments/{commentId}
    [Authorize]
    [HttpDelete("{itemId}/comments/{commentId}")]
    public async Task<IActionResult> DeleteComment(int inventoryId, int itemId, int commentId)
    {
        var comment = await _db.Comments.FindAsync(commentId);
        if (comment == null) return NotFound();
        if (!IsAdmin && comment.AuthorId != UserId) return Forbid();
        _db.Comments.Remove(comment);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static void UpdateSearchVector(Item item, Inventory inv)
    {
        var parts = new List<string>();
        if (item.StringValue1 != null) parts.Add(item.StringValue1);
        if (item.StringValue2 != null) parts.Add(item.StringValue2);
        if (item.StringValue3 != null) parts.Add(item.StringValue3);
        if (item.TextValue1 != null) parts.Add(item.TextValue1);
        if (item.TextValue2 != null) parts.Add(item.TextValue2);
        if (item.TextValue3 != null) parts.Add(item.TextValue3);
        item.SearchVector = string.Join(" ", parts).ToLower();
    }
}
