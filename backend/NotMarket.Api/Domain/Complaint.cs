using System.ComponentModel.DataAnnotations;

namespace NotMarket.Api.Domain;

public sealed class Complaint
{
    public Guid Id { get; set; } =
        Guid.NewGuid();

    public Guid UserId { get; set; }

    public ApplicationUser User { get; set; } =
        null!;

    public ComplaintCategory Category { get; set; }

    /*
     * Sipariş kaynaklı teknik sorunlarda
     * sistem tarafından tanımlanan sabit kod.
     *
     * Verification / Note itirazlarında null kalır.
     */
    [MaxLength(80)]
    public string? IssueCode { get; set; }

    [MaxLength(180)]
    public required string Subject { get; set; }

    [MaxLength(2000)]
    public required string Description { get; set; }

    /*
     * İtiraz belirli bir kayda bağlıysa kullanılır.
     *
     * Örnek:
     * StudentVerification
     * NoteSubmission
     * Order
     * ApplicationUser
     */
    [MaxLength(100)]
    public string? RelatedEntityType { get; set; }

    [MaxLength(100)]
    public string? RelatedEntityId { get; set; }

    public ComplaintStatus Status { get; set; } =
        ComplaintStatus.Open;

    [MaxLength(2000)]
    public string? AdminResponse { get; set; }

    public Guid? ReviewedByUserId { get; set; }

    public ApplicationUser? ReviewedByUser { get; set; }

    public DateTimeOffset? ReviewedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; } =
        DateTimeOffset.UtcNow;

    public DateTimeOffset UpdatedAt { get; set; } =
        DateTimeOffset.UtcNow;
}
