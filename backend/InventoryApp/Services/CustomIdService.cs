using System.Text.Json;
using InventoryApp.Data;
using Microsoft.EntityFrameworkCore;

namespace InventoryApp.Services;

public interface ICustomIdService
{
    Task<string> GenerateAsync(int inventoryId, string formatJson);
}

public class CustomIdService : ICustomIdService
{
    private readonly AppDbContext _db;
    private static readonly Random _rng = new();

    public CustomIdService(AppDbContext db) => _db = db;

    public async Task<string> GenerateAsync(int inventoryId, string formatJson)
    {
        var elements = JsonSerializer.Deserialize<List<CustomIdElement>>(formatJson) ?? [];
        if (elements.Count == 0)
            return $"ITEM-{Guid.NewGuid().ToString()[..8].ToUpper()}";

        // Get next sequence number for this inventory
        int nextSeq = await _db.Items.Where(i => i.InventoryId == inventoryId).CountAsync() + 1;

        var parts = new List<string>();
        foreach (var el in elements)
        {
            parts.Add(el.Type switch
            {
                "fixed" => el.Value ?? "",
                "random" => GenerateRandom(el.Value ?? "X5"),
                "sequence" => FormatSequence(nextSeq, el.Value ?? "D3"),
                "datetime" => FormatDate(el.Value ?? "yyyy"),
                _ => ""
            });
        }
        return string.Concat(parts);
    }

    private static string GenerateRandom(string format)
    {
        // Parse format like "X5" (hex, 5 chars) or "D6" (decimal, 6 digits)
        if (format.Length < 2) return "RAND";
        char type = format[0];
        if (!int.TryParse(format[1..], out int len)) len = 5;

        if (type == 'X' || type == 'x')
        {
            var bytes = new byte[(len + 1) / 2];
            _rng.NextBytes(bytes);
            return Convert.ToHexString(bytes)[..len];
        }
        else // decimal
        {
            var digits = new char[len];
            for (int i = 0; i < len; i++)
                digits[i] = (char)('0' + _rng.Next(10));
            return new string(digits);
        }
    }

    private static string FormatSequence(int seq, string format)
    {
        if (format.StartsWith('D') && int.TryParse(format[1..], out int width))
            return seq.ToString($"D{width}");
        return seq.ToString();
    }

    private static string FormatDate(string format)
    {
        return format switch
        {
            "yyyy" => DateTime.UtcNow.Year.ToString(),
            "yy" => DateTime.UtcNow.ToString("yy"),
            "MM" => DateTime.UtcNow.ToString("MM"),
            "dd" => DateTime.UtcNow.ToString("dd"),
            "ddd" => DateTime.UtcNow.ToString("ddd"),
            _ => DateTime.UtcNow.ToString(format)
        };
    }
}

public record CustomIdElement(string Type, string? Value);
