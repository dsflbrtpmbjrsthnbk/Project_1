using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace InventoryApp.Services;

public interface IImageService
{
    Task<string> UploadAsync(IFormFile file);
    Task DeleteAsync(string url);
}

public class CloudinaryImageService : IImageService
{
    private readonly Cloudinary _cloudinary;

    public CloudinaryImageService(IConfiguration config)
    {
        var account = new Account(
            config["Cloudinary:CloudName"],
            config["Cloudinary:ApiKey"],
            config["Cloudinary:ApiSecret"]
        );
        _cloudinary = new Cloudinary(account);
        _cloudinary.Api.Secure = true;
    }

    public async Task<string> UploadAsync(IFormFile file)
    {
        await using var stream = file.OpenReadStream();
        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(file.FileName, stream),
            Folder = "inventory-app",
            Transformation = new Transformation().Width(800).Height(600).Crop("limit")
        };
        var result = await _cloudinary.UploadAsync(uploadParams);
        if (result.Error != null)
            throw new Exception(result.Error.Message);
        return result.SecureUrl.ToString();
    }

    public async Task DeleteAsync(string url)
    {
        var publicId = ExtractPublicId(url);
        if (!string.IsNullOrEmpty(publicId))
            await _cloudinary.DestroyAsync(new DeletionParams(publicId));
    }

    private static string? ExtractPublicId(string url)
    {
        try
        {
            var uri = new Uri(url);
            var path = uri.AbsolutePath;
            var idx = path.IndexOf("/upload/");
            if (idx < 0) return null;
            var after = path[(idx + 8)..];
            // Remove version if present (v1234567/)
            if (after.StartsWith('v') && after.Contains('/'))
                after = after[(after.IndexOf('/') + 1)..];
            // Remove extension
            var dotIdx = after.LastIndexOf('.');
            if (dotIdx > 0) after = after[..dotIdx];
            return after;
        }
        catch { return null; }
    }
}
