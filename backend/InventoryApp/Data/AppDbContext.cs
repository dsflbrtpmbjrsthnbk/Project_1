using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using InventoryApp.Models;

namespace InventoryApp.Data;

public class AppDbContext : IdentityDbContext<AppUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Inventory> Inventories => Set<Inventory>();
    public DbSet<Item> Items => Set<Item>();
    public DbSet<InventoryAccess> InventoryAccesses => Set<InventoryAccess>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Like> Likes => Set<Like>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<AppUser>(e =>
        {
            e.HasMany(u => u.OwnedInventories).WithOne(i => i.Owner).HasForeignKey(i => i.OwnerId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(u => u.Comments).WithOne(c => c.Author).HasForeignKey(c => c.AuthorId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(u => u.Likes).WithOne(l => l.User).HasForeignKey(l => l.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Inventory>(e =>
        {
            e.HasIndex(i => i.Title);
            e.HasMany(i => i.Items).WithOne(item => item.Inventory).HasForeignKey(item => item.InventoryId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(i => i.Comments).WithOne(c => c.Inventory).HasForeignKey(c => c.InventoryId).OnDelete(DeleteBehavior.SetNull);
            e.HasMany(i => i.Accesses).WithOne(a => a.Inventory).HasForeignKey(a => a.InventoryId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Item>(e =>
        {
            e.Property(i => i.RowVersion).IsRowVersion();
            e.HasIndex(i => i.InventoryId);
            e.HasIndex(i => i.CustomId);
            // PostgreSQL full-text search index
            e.HasIndex(i => i.SearchVector).HasMethod("GIN");
        });

        builder.Entity<InventoryAccess>(e =>
        {
            e.HasIndex(a => new { a.InventoryId, a.UserId }).IsUnique();
        });

        builder.Entity<Like>(e =>
        {
            e.HasIndex(l => new { l.UserId, l.ItemId }).IsUnique();
        });
    }
}
