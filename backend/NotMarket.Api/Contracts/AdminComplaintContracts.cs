namespace NotMarket.Api.Contracts;

public sealed record AdminComplaintListItemResponse(
    Guid Id,
    Guid UserId,
    string UserDisplayName,
    string UserEmail,
    string Category,
    string Subject,
    string? RelatedEntityType,
    string? RelatedEntityId,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record AdminComplaintPageResponse(
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages,
    IReadOnlyList<string> AvailableStatuses,
    IReadOnlyList<string> AvailableCategories,
    IReadOnlyList<AdminComplaintListItemResponse> Items);

public sealed record AdminComplaintDetailResponse(
    Guid Id,
    Guid UserId,
    string UserDisplayName,
    string UserEmail,
    string Category,
    string Subject,
    string Description,
    string? RelatedEntityType,
    string? RelatedEntityId,
    string? RelatedEntityTitle,
    string Status,
    string? AdminResponse,
    Guid? ReviewedByUserId,
    string? ReviewedByDisplayName,
    string? ReviewedByEmail,
    DateTimeOffset? ReviewedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record AdminComplaintDecisionRequest(
    string Status,
    string? AdminResponse);
