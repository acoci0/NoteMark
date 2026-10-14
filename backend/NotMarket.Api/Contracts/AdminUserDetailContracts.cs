namespace NotMarket.Api.Contracts;

public sealed record AdminUserDetailDto(
    Guid Id,
    string Email,
    string DisplayName,
    string Role,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastLoginAt,
    AdminUserActivitySummaryDto Summary,
    IReadOnlyList<AdminUserVerificationItemDto> Verifications,
    IReadOnlyList<AdminUserNoteRequestItemDto> NoteRequests,
    IReadOnlyList<AdminUserNoteSubmissionItemDto> NoteSubmissions,
    IReadOnlyList<AdminUserOrderItemDto> Purchases,
    IReadOnlyList<AdminUserOrderItemDto> Sales,
    IReadOnlyList<AdminUserRelatedAuditItemDto> RecentActivity);

public sealed record AdminUserActivitySummaryDto(
    int VerificationCount,
    int NoteRequestCount,
    int NoteSubmissionCount,
    int TotalPurchases,
    int TotalSales,
    decimal PurchaseExpense,
    decimal SalesIncome,
    decimal PendingSalesIncome,
    string Currency);

public sealed record AdminUserVerificationItemDto(
    Guid Id,
    string UniversityName,
    string FacultyName,
    string DepartmentName,
    DateOnly DocumentIssueDate,
    string Status,
    string? ReviewNote,
    DateTimeOffset? ReviewedAt,
    DateTimeOffset? ExpiresAt,
    DateTimeOffset CreatedAt);

public sealed record AdminUserNoteRequestItemDto(
    Guid Id,
    string UniversityName,
    string DepartmentName,
    string CourseName,
    int ClassLevel,
    string? Topic,
    string? ContentType,
    int? QuestionCount,
    decimal SuggestedMinPrice,
    decimal SuggestedMaxPrice,
    int SubmissionCount,
    DateTimeOffset CreatedAt);

public sealed record AdminUserNoteSubmissionItemDto(
    Guid Id,
    Guid RequestId,
    string Title,
    string CourseName,
    string Status,
    int MatchScore,
    int ReadabilityScore,
    int OriginalityRiskScore,
    decimal? SalePrice,
    DateTimeOffset CreatedAt);

public sealed record AdminUserOrderItemDto(
    Guid OrderId,
    Guid NoteSubmissionId,
    string NoteTitle,
    decimal GrossAmount,
    decimal PlatformCommissionAmount,
    decimal SellerEarningAmount,
    string Currency,
    string Status,
    DateTimeOffset? PaidAt,
    DateTimeOffset CreatedAt);

public sealed record AdminUserRelatedAuditItemDto(
    long Id,
    string Action,
    string EntityType,
    string EntityId,
    string? DetailsJson,
    DateTimeOffset CreatedAt);
