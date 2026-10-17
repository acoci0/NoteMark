namespace NotMarket.Api.Contracts;

public sealed record CreateStudentComplaintRequest(
    string Category,
    string Subject,
    string Description,
    Guid? RelatedEntityId);

public sealed record StudentComplaintItemResponse(
    Guid Id,
    string Category,
    string Subject,
    string Description,
    string? RelatedEntityType,
    string? RelatedEntityId,
    string Status,
    string? AdminResponse,
    DateTimeOffset? ReviewedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
