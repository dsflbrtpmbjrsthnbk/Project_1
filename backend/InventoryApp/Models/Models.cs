using Microsoft.AspNetCore.Identity;

namespace InventoryApp.Models;

public class AppUser : IdentityUser
{
    public string DisplayName { get; set; } = "";
    public string? AvatarUrl { get; set; }
    public bool IsBlocked { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Inventory> OwnedInventories { get; set; } = [];
    public ICollection<InventoryAccess> InventoryAccesses { get; set; } = [];
    public ICollection<Comment> Comments { get; set; } = [];
    public ICollection<Like> Likes { get; set; } = [];
}

public class Inventory
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string? Category { get; set; }
    public string? ImageUrl { get; set; }
    public string Tags { get; set; } = ""; // comma-separated
    public bool IsPublic { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string OwnerId { get; set; } = "";
    public AppUser Owner { get; set; } = null!;

    // Custom ID format config (JSON string)
    public string CustomIdFormat { get; set; } = "[]";

    // Custom field definitions (up to 3 of each type)
    public string? StringField1Name { get; set; }
    public string? StringField2Name { get; set; }
    public string? StringField3Name { get; set; }
    public string? TextField1Name { get; set; }
    public string? TextField2Name { get; set; }
    public string? TextField3Name { get; set; }
    public string? NumberField1Name { get; set; }
    public string? NumberField2Name { get; set; }
    public string? NumberField3Name { get; set; }
    public string? LinkField1Name { get; set; }
    public string? LinkField2Name { get; set; }
    public string? LinkField3Name { get; set; }
    public string? BoolField1Name { get; set; }
    public string? BoolField2Name { get; set; }
    public string? BoolField3Name { get; set; }

    public ICollection<Item> Items { get; set; } = [];
    public ICollection<InventoryAccess> Accesses { get; set; } = [];
    public ICollection<Comment> Comments { get; set; } = [];
}

public class InventoryAccess
{
    public int Id { get; set; }
    public int InventoryId { get; set; }
    public Inventory Inventory { get; set; } = null!;
    public string UserId { get; set; } = "";
    public AppUser User { get; set; } = null!;
}

public class Item
{
    public int Id { get; set; }
    public string CustomId { get; set; } = "";
    public int InventoryId { get; set; }
    public Inventory Inventory { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Optimistic concurrency token
    public byte[] RowVersion { get; set; } = [];

    // Custom field values
    public string? StringValue1 { get; set; }
    public string? StringValue2 { get; set; }
    public string? StringValue3 { get; set; }
    public string? TextValue1 { get; set; }
    public string? TextValue2 { get; set; }
    public string? TextValue3 { get; set; }
    public double? NumberValue1 { get; set; }
    public double? NumberValue2 { get; set; }
    public double? NumberValue3 { get; set; }
    public string? LinkValue1 { get; set; }
    public string? LinkValue2 { get; set; }
    public string? LinkValue3 { get; set; }
    public bool? BoolValue1 { get; set; }
    public bool? BoolValue2 { get; set; }
    public bool? BoolValue3 { get; set; }

    // Full-text search vector (stored as string, computed in DB)
    public string SearchVector { get; set; } = "";

    public ICollection<Comment> Comments { get; set; } = [];
    public ICollection<Like> Likes { get; set; } = [];
}

public class Comment
{
    public int Id { get; set; }
    public string Text { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string AuthorId { get; set; } = "";
    public AppUser Author { get; set; } = null!;
    public int? InventoryId { get; set; }
    public Inventory? Inventory { get; set; }
    public int? ItemId { get; set; }
    public Item? Item { get; set; }
}

public class Like
{
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    public AppUser User { get; set; } = null!;
    public int? ItemId { get; set; }
    public Item? Item { get; set; }
}
