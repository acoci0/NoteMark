namespace NotMarket.Api.Contracts;

public sealed record SellerEarningsSummaryResponse(
    int TotalSales,
    int TotalPurchases,
    decimal SalesIncome,
    decimal PurchaseExpense,
    decimal NetProfit,
    decimal PendingRevenue,
    string Currency,
    IReadOnlyList<SellerRecentSaleResponse> RecentSales,
    IReadOnlyList<EarningsTimelinePointResponse> Timeline);

public sealed record SellerRecentSaleResponse(
    Guid OrderId,
    Guid NoteSubmissionId,
    string NoteTitle,
    decimal GrossAmount,
    decimal SellerEarningAmount,
    string Currency,
    DateTimeOffset SoldAt);

public sealed record EarningsTimelinePointResponse(
    DateOnly Date,
    decimal SalesIncome,
    decimal PurchaseExpense);
