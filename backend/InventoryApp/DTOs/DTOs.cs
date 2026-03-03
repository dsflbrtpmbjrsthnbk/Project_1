namespace InventoryApp.DTOs;

// Auth
public record LoginResponse(string Token, UserDto User);
public record UserDto(string Id, string DisplayName, string? Email, string? AvatarUrl, bool IsBlocked, IList<string> Roles);

// Inventory
public record InventoryListDto(int Id, string Title, string Description, string? Category, string? ImageUrl,
    string Tags, bool IsPublic, DateTime CreatedAt, string OwnerName, int ItemCount);

public record InventoryDetailDto(int Id, string Title, string Description, string? Category, string? ImageUrl,
    string Tags, bool IsPublic, DateTime CreatedAt, DateTime UpdatedAt, string OwnerId, string OwnerName,
    string CustomIdFormat, FieldDefinitionsDto Fields, bool CanEdit, bool CanWrite);

public record FieldDefinitionsDto(
    string? String1, string? String2, string? String3,
    string? Text1, string? Text2, string? Text3,
    string? Number1, string? Number2, string? Number3,
    string? Link1, string? Link2, string? Link3,
    string? Bool1, string? Bool2, string? Bool3);

public record CreateInventoryDto(string Title, string Description, string? Category, string? ImageUrl,
    string Tags, bool IsPublic, string CustomIdFormat, FieldDefinitionsDto Fields);

public record UpdateInventoryDto(string Title, string Description, string? Category, string? ImageUrl,
    string Tags, bool IsPublic, string CustomIdFormat, FieldDefinitionsDto Fields);

// Item
public record ItemListDto(int Id, string CustomId, DateTime CreatedAt, DateTime UpdatedAt,
    string? String1, string? String2, string? String3,
    string? Text1, string? Text2, string? Text3,
    double? Number1, double? Number2, double? Number3,
    string? Link1, string? Link2, string? Link3,
    bool? Bool1, bool? Bool2, bool? Bool3,
    int LikeCount);

public record ItemDetailDto(int Id, string CustomId, int InventoryId, DateTime CreatedAt, DateTime UpdatedAt,
    string? String1, string? String2, string? String3,
    string? Text1, string? Text2, string? Text3,
    double? Number1, double? Number2, double? Number3,
    string? Link1, string? Link2, string? Link3,
    bool? Bool1, bool? Bool2, bool? Bool3,
    int LikeCount, bool UserLiked,
    IList<CommentDto> Comments);

public record CreateItemDto(
    string? String1, string? String2, string? String3,
    string? Text1, string? Text2, string? Text3,
    double? Number1, double? Number2, double? Number3,
    string? Link1, string? Link2, string? Link3,
    bool? Bool1, bool? Bool2, bool? Bool3);

public record UpdateItemDto(
    string? String1, string? String2, string? String3,
    string? Text1, string? Text2, string? Text3,
    double? Number1, double? Number2, double? Number3,
    string? Link1, string? Link2, string? Link3,
    bool? Bool1, bool? Bool2, bool? Bool3,
    string RowVersion);

// Comments
public record CommentDto(int Id, string Text, DateTime CreatedAt, string AuthorId, string AuthorName, string? AuthorAvatar);
public record CreateCommentDto(string Text);

// Access
public record AccessUserDto(string Id, string DisplayName, string? Email);
public record AddAccessDto(string UserIdOrEmail);

// Search
public record SearchResultDto(string Type, int Id, string Title, string? Subtitle, string? InventoryTitle);

// Stats
public record InventoryStatsDto(int TotalItems, int TotalLikes, Dictionary<string, int> ItemsByMonth);

// Admin
public record AdminUserDto(string Id, string DisplayName, string? Email, bool IsBlocked, DateTime CreatedAt, IList<string> Roles, int OwnedInventoryCount);
