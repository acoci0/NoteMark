namespace NotMarket.Api.Contracts;

public sealed record AdminAuditLogItemDto(
    long Id,
    Guid? ActorUserId,
    string? ActorDisplayName,
    string? ActorEmail,
    string Action,
    string EntityType,
    string EntityId,
    string? DetailsJson,
    DateTimeOffset CreatedAt);

public sealed record AdminAuditLogPageDto(
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages,
    IReadOnlyList<string> AvailableActions,
    IReadOnlyList<string> AvailableEntityTypes,
    IReadOnlyList<AdminAuditLogItemDto> Items);
