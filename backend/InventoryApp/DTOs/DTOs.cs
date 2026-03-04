namespace InventoryApp.DTOs;

// Auth
public record LoginResponse(string Token, UserDto User);
public record UserDto(string Id, string DisplayName, string? Email, string? AvatarUrl, bool IsBlocked, IList<string> Roles);

// Field definition with description and show-in-table flag
public record FieldDefDto(string? Name, string? Desc, bool Show);

// Inventory
public record InventoryListDto(int Id, string Title, string Description, string? Category, string? ImageUrl,
    string Tags, bool IsPublic, DateTime CreatedAt, string OwnerName, int ItemCount);

public record InventoryDetailDto(int Id, string Title, string Description, string? Category, string? ImageUrl,
    string Tags, bool IsPublic, DateTime CreatedAt, DateTime UpdatedAt, string OwnerId, string OwnerName,
    string CustomIdFormat, FieldsDto Fields, bool CanEdit, bool CanWrite, int Version);

public record FieldsDto(
    FieldDefDto Str1, FieldDefDto Str2, FieldDefDto Str3,
    FieldDefDto Txt1, FieldDefDto Txt2, FieldDefDto Txt3,
    FieldDefDto Num1, FieldDefDto Num2, FieldDefDto Num3,
    FieldDefDto Lnk1, FieldDefDto Lnk2, FieldDefDto Lnk3,
    FieldDefDto Bol1, FieldDefDto Bol2, FieldDefDto Bol3);

// Keep legacy flat DTO for create/update (easier from form)
public record FieldDefinitionsDto(
    string? String1, string? String2, string? String3,
    string? Text1, string? Text2, string? Text3,
    string? Number1, string? Number2, string? Number3,
    string? Link1, string? Link2, string? Link3,
    string? Bool1, string? Bool2, string? Bool3,
    // Descriptions
    string? String1Desc, string? String2Desc, string? String3Desc,
    string? Text1Desc, string? Text2Desc, string? Text3Desc,
    string? Number1Desc, string? Number2Desc, string? Number3Desc,
    string? Link1Desc, string? Link2Desc, string? Link3Desc,
    string? Bool1Desc, string? Bool2Desc, string? Bool3Desc,
    // ShowInTable
    bool String1Show, bool String2Show, bool String3Show,
    bool Text1Show, bool Text2Show, bool Text3Show,
    bool Number1Show, bool Number2Show, bool Number3Show,
    bool Link1Show, bool Link2Show, bool Link3Show,
    bool Bool1Show, bool Bool2Show, bool Bool3Show);

public record CreateInventoryDto(string Title, string Description, string? Category, string? ImageUrl,
    string Tags, bool IsPublic, string CustomIdFormat, FieldDefinitionsDto Fields);

public record UpdateInventoryDto(string Title, string Description, string? Category, string? ImageUrl,
    string Tags, bool IsPublic, string CustomIdFormat, FieldDefinitionsDto Fields, int Version);

// Item
public record ItemListDto(int Id, string CustomId, string CreatedById, DateTime CreatedAt, DateTime UpdatedAt,
    string? String1, string? String2, string? String3,
    string? Text1, string? Text2, string? Text3,
    double? Number1, double? Number2, double? Number3,
    string? Link1, string? Link2, string? Link3,
    bool? Bool1, bool? Bool2, bool? Bool3,
    int LikeCount);

public record ItemDetailDto(int Id, string CustomId, int InventoryId, string CreatedById, DateTime CreatedAt, DateTime UpdatedAt,
    string? String1, string? String2, string? String3,
    string? Text1, string? Text2, string? Text3,
    double? Number1, double? Number2, double? Number3,
    string? Link1, string? Link2, string? Link3,
    bool? Bool1, bool? Bool2, bool? Bool3,
    int LikeCount, bool UserLiked,
    IList<CommentDto> Comments);

public record CreateItemDto(
    string? CustomId,
    string? String1, string? String2, string? String3,
    string? Text1, string? Text2, string? Text3,
    double? Number1, double? Number2, double? Number3,
    string? Link1, string? Link2, string? Link3,
    bool? Bool1, bool? Bool2, bool? Bool3);

public record UpdateItemDto(
    string? CustomId,
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
public record SearchResultDto(string Type, int Id, string Title, string? Subtitle, string? InventoryTitle, int? InventoryId);

// Stats
public record InventoryStatsDto(int TotalItems, int TotalLikes, Dictionary<string, int> ItemsByMonth,
    List<FieldStatDto> NumericStats, List<FieldStatDto> StringStats);
public record FieldStatDto(string FieldName, double? Min, double? Max, double? Avg, string? MostUsed, int Count);

// Admin
public record AdminUserDto(string Id, string DisplayName, string? Email, bool IsBlocked, DateTime CreatedAt, IList<string> Roles, int OwnedInventoryCount);
