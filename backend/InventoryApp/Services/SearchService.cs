using InventoryApp.Data;
using InventoryApp.DTOs;
using Microsoft.EntityFrameworkCore;

namespace InventoryApp.Services;

public interface ISearchService
{
    Task<IList<SearchResultDto>> SearchAsync(string query, string? userId);
}

public class SearchService : ISearchService
{
    private readonly AppDbContext _db;
    public SearchService(AppDbContext db) => _db = db;

    public async Task<IList<SearchResultDto>> SearchAsync(string query, string? userId)
    {
        if (string.IsNullOrWhiteSpace(query)) return [];

        var results = new List<SearchResultDto>();
        var lower = query.ToLower();

        var inventories = await _db.Inventories
            .Include(i => i.Owner)
            .Where(i =>
                EF.Functions.ILike(i.Title, $"%{lower}%") ||
                EF.Functions.ILike(i.Description, $"%{lower}%") ||
                EF.Functions.ILike(i.Tags, $"%{lower}%"))
            .Take(10)
            .Select(i => new SearchResultDto("inventory", i.Id, i.Title, i.Description, null, null))
            .ToListAsync();

        results.AddRange(inventories);

        var items = await _db.Items
            .Include(i => i.Inventory)
            .Where(i =>
                EF.Functions.ILike(i.StringValue1 ?? "", $"%{lower}%") ||
                EF.Functions.ILike(i.StringValue2 ?? "", $"%{lower}%") ||
                EF.Functions.ILike(i.StringValue3 ?? "", $"%{lower}%") ||
                EF.Functions.ILike(i.TextValue1 ?? "", $"%{lower}%") ||
                EF.Functions.ILike(i.TextValue2 ?? "", $"%{lower}%") ||
                EF.Functions.ILike(i.TextValue3 ?? "", $"%{lower}%") ||
                EF.Functions.ILike(i.CustomId, $"%{lower}%"))
            .Take(10)
            .Select(i => new SearchResultDto("item", i.Id, i.CustomId,
                i.StringValue1 ?? i.StringValue2 ?? i.TextValue1,
                i.Inventory.Title, i.InventoryId))
            .ToListAsync();

        results.AddRange(items);
        return results;
    }
}
