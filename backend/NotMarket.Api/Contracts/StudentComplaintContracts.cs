namespace NotMarket.Api.Contracts;

public sealed record CreateStudentComplaintRequest(
    string Category,
    string Subject,
    string Description,
    Guid? RelatedEntityId,
    string? IssueCode = null);

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
    DateTimeOffset UpdatedAt,
    string? IssueCode = null);

public sealed record StudentOrderIssueOptionResponse(
    string Code,
    string Label,
    string Description);

public sealed record StudentOrderComplaintOptionsResponse(
    Guid OrderId,
    string NoteTitle,
    string OrderStatus,
    IReadOnlyList<StudentOrderIssueOptionResponse> Issues);
