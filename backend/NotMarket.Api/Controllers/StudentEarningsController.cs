using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NotMarket.Api.Contracts;
using NotMarket.Api.Data;
using NotMarket.Api.Domain;

namespace NotMarket.Api.Controllers;

[ApiController]
[Route("api/student/earnings")]
[Authorize(Policy = "StudentOnly")]
public sealed class StudentEarningsController(
    AppDbContext db)
    : ControllerBase
{
    [HttpGet]
    public async Task<
        ActionResult<SellerEarningsSummaryResponse>>
        Get(
            [FromQuery]
            string range = "month",
            CancellationToken cancellationToken = default)
    {
        var userId =
            GetUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var normalizedRange =
            range
                .Trim()
                .ToLowerInvariant();

        var allowedRanges =
            new[]
            {
                "week",
                "month",
                "sixmonths",
                "year",
                "all"
            };

        if (
            !allowedRanges.Contains(
                normalizedRange)
        )
        {
            return BadRequest(new
            {
                message =
                    "Geçersiz grafik zaman aralığı."
            });
        }

        var paidSales =
            db.Orders
                .AsNoTracking()
                .Where(
                    x =>
                        x.SellerId ==
                            userId.Value &&
                        x.Status ==
                            OrderStatus.Paid &&
                        x.Payment != null &&
                        x.Payment.Status ==
                            PaymentStatus.Succeeded);

        var paidPurchases =
            db.Orders
                .AsNoTracking()
                .Where(
                    x =>
                        x.BuyerId ==
                            userId.Value &&
                        x.Status ==
                            OrderStatus.Paid &&
                        x.Payment != null &&
                        x.Payment.Status ==
                            PaymentStatus.Succeeded);

        var totalSales =
            await paidSales.CountAsync(
                cancellationToken);

        var totalPurchases =
            await paidPurchases.CountAsync(
                cancellationToken);

        var salesIncome =
            await paidSales
                .SumAsync(
                    x =>
                        (decimal?)
                        x.SellerEarningAmount,
                    cancellationToken)
            ?? 0m;

        var purchaseExpense =
            await paidPurchases
                .SumAsync(
                    x =>
                        (decimal?)
                        x.GrossAmount,
                    cancellationToken)
            ?? 0m;

        var netProfit =
            salesIncome -
            purchaseExpense;

        var pendingRevenue =
            await db.Orders
                .AsNoTracking()
                .Where(
                    x =>
                        x.SellerId ==
                            userId.Value &&
                        x.Status ==
                            OrderStatus.PendingPayment)
                .SumAsync(
                    x =>
                        (decimal?)
                        x.SellerEarningAmount,
                    cancellationToken)
            ?? 0m;

        var recentSales =
            await paidSales
                .OrderByDescending(
                    x =>
                        x.PaidAt ??
                        x.CreatedAt)
                .Take(10)
                .Select(
                    x =>
                        new SellerRecentSaleResponse(
                            x.Id,
                            x.NoteSubmissionId,
                            x.NoteTitleSnapshot,
                            x.GrossAmount,
                            x.SellerEarningAmount,
                            x.Currency,
                            x.PaidAt ??
                            x.CreatedAt))
                .ToListAsync(
                    cancellationToken);

        var today =
            DateOnly.FromDateTime(
                DateTime.UtcNow);

        DateOnly firstDay;

        if (
            normalizedRange ==
            "all"
        )
        {
            /*
             * Tüm zamanlar grafiği
             * 2015 yılından başlar.
             */
            firstDay =
                new DateOnly(
                    2015,
                    1,
                    1);
        }
        else
        {
            firstDay =
                normalizedRange switch
                {
                    /*
                     * Son 1 hafta:
                     * bugün ve tam 7 gün önceki
                     * tarih dahil.
                     *
                     * Örnek:
                     * 12 Ekim -> 5 Ekim - 12 Ekim
                     */
                    "week" =>
                        today.AddDays(-7),

                    "month" =>
                        today.AddDays(-29),

                    "sixmonths" =>
                        today.AddMonths(-6),

                    "year" =>
                        today.AddYears(-1),

                    _ =>
                        today.AddDays(-29)
                };
        }

        var startUtc =
            new DateTimeOffset(
                firstDay.ToDateTime(
                    TimeOnly.MinValue),
                TimeSpan.Zero);

        var salesSource =
            await paidSales
                .Where(
                    x =>
                        (
                            x.PaidAt ??
                            x.CreatedAt
                        ) >= startUtc)
                .Select(
                    x => new
                    {
                        Date =
                            x.PaidAt ??
                            x.CreatedAt,

                        Amount =
                            x.SellerEarningAmount
                    })
                .ToListAsync(
                    cancellationToken);

        var purchasesSource =
            await paidPurchases
                .Where(
                    x =>
                        (
                            x.PaidAt ??
                            x.CreatedAt
                        ) >= startUtc)
                .Select(
                    x => new
                    {
                        Date =
                            x.PaidAt ??
                            x.CreatedAt,

                        Amount =
                            x.GrossAmount
                    })
                .ToListAsync(
                    cancellationToken);

        IReadOnlyList<
            EarningsTimelinePointResponse>
            timeline =
                normalizedRange switch
                {
                    "week" =>
                        BuildDailyTimeline(
                            firstDay,
                            today,
                            salesSource
                                .Select(
                                    x =>
                                        (
                                            x.Date,
                                            x.Amount
                                        ))
                                .ToList(),
                            purchasesSource
                                .Select(
                                    x =>
                                        (
                                            x.Date,
                                            x.Amount
                                        ))
                                .ToList()),

                    "month" =>
                        BuildDailyTimeline(
                            firstDay,
                            today,
                            salesSource
                                .Select(
                                    x =>
                                        (
                                            x.Date,
                                            x.Amount
                                        ))
                                .ToList(),
                            purchasesSource
                                .Select(
                                    x =>
                                        (
                                            x.Date,
                                            x.Amount
                                        ))
                                .ToList()),

                    "sixmonths" =>
                        BuildWeeklyTimeline(
                            firstDay,
                            today,
                            salesSource
                                .Select(
                                    x =>
                                        (
                                            x.Date,
                                            x.Amount
                                        ))
                                .ToList(),
                            purchasesSource
                                .Select(
                                    x =>
                                        (
                                            x.Date,
                                            x.Amount
                                        ))
                                .ToList()),

                    "year" =>
                        BuildMonthlyTimeline(
                            firstDay,
                            today,
                            salesSource
                                .Select(
                                    x =>
                                        (
                                            x.Date,
                                            x.Amount
                                        ))
                                .ToList(),
                            purchasesSource
                                .Select(
                                    x =>
                                        (
                                            x.Date,
                                            x.Amount
                                        ))
                                .ToList()),

                    "all" =>
                        BuildYearlyTimeline(
                            firstDay,
                            today,
                            salesSource
                                .Select(
                                    x =>
                                        (
                                            x.Date,
                                            x.Amount
                                        ))
                                .ToList(),
                            purchasesSource
                                .Select(
                                    x =>
                                        (
                                            x.Date,
                                            x.Amount
                                        ))
                                .ToList()),

                    _ =>
                        []
                };

        return Ok(
            new SellerEarningsSummaryResponse(
                totalSales,
                totalPurchases,
                salesIncome,
                purchaseExpense,
                netProfit,
                pendingRevenue,
                "TRY",
                recentSales,
                timeline));
    }

    private static IReadOnlyList<
        EarningsTimelinePointResponse>
        BuildDailyTimeline(
            DateOnly firstDay,
            DateOnly today,
            IReadOnlyList<
                (
                    DateTimeOffset Date,
                    decimal Amount
                )> sales,
            IReadOnlyList<
                (
                    DateTimeOffset Date,
                    decimal Amount
                )> purchases)
    {
        var result =
            new List<
                EarningsTimelinePointResponse>();

        for (
            var date = firstDay;
            date <= today;
            date =
                date.AddDays(1))
        {
            var salesAmount =
                sales
                    .Where(
                        x =>
                            DateOnly.FromDateTime(
                                x.Date.UtcDateTime) ==
                            date)
                    .Sum(
                        x =>
                            x.Amount);

            var purchaseAmount =
                purchases
                    .Where(
                        x =>
                            DateOnly.FromDateTime(
                                x.Date.UtcDateTime) ==
                            date)
                    .Sum(
                        x =>
                            x.Amount);

            result.Add(
                new EarningsTimelinePointResponse(
                    date,
                    salesAmount,
                    purchaseAmount));
        }

        return result;
    }

    private static IReadOnlyList<
        EarningsTimelinePointResponse>
        BuildWeeklyTimeline(
            DateOnly firstDay,
            DateOnly today,
            IReadOnlyList<
                (
                    DateTimeOffset Date,
                    decimal Amount
                )> sales,
            IReadOnlyList<
                (
                    DateTimeOffset Date,
                    decimal Amount
                )> purchases)
    {
        var result =
            new List<
                EarningsTimelinePointResponse>();

        var start =
            firstDay;

        while (
            start <= today)
        {
            var end =
                start.AddDays(6);

            if (
                end > today)
            {
                end =
                    today;
            }

            var salesAmount =
                sales
                    .Where(
                        x =>
                        {
                            var date =
                                DateOnly.FromDateTime(
                                    x.Date.UtcDateTime);

                            return
                                date >= start &&
                                date <= end;
                        })
                    .Sum(
                        x =>
                            x.Amount);

            var purchaseAmount =
                purchases
                    .Where(
                        x =>
                        {
                            var date =
                                DateOnly.FromDateTime(
                                    x.Date.UtcDateTime);

                            return
                                date >= start &&
                                date <= end;
                        })
                    .Sum(
                        x =>
                            x.Amount);

            result.Add(
                new EarningsTimelinePointResponse(
                    start,
                    salesAmount,
                    purchaseAmount));

            start =
                start.AddDays(7);
        }

        return result;
    }

    private static IReadOnlyList<
        EarningsTimelinePointResponse>
        BuildMonthlyTimeline(
            DateOnly firstDay,
            DateOnly today,
            IReadOnlyList<
                (
                    DateTimeOffset Date,
                    decimal Amount
                )> sales,
            IReadOnlyList<
                (
                    DateTimeOffset Date,
                    decimal Amount
                )> purchases)
    {
        var result =
            new List<
                EarningsTimelinePointResponse>();

        var cursor =
            new DateOnly(
                firstDay.Year,
                firstDay.Month,
                1);

        var finalMonth =
            new DateOnly(
                today.Year,
                today.Month,
                1);

        while (
            cursor <= finalMonth)
        {
            var year =
                cursor.Year;

            var month =
                cursor.Month;

            var salesAmount =
                sales
                    .Where(
                        x =>
                            x.Date.UtcDateTime.Year ==
                                year &&
                            x.Date.UtcDateTime.Month ==
                                month)
                    .Sum(
                        x =>
                            x.Amount);

            var purchaseAmount =
                purchases
                    .Where(
                        x =>
                            x.Date.UtcDateTime.Year ==
                                year &&
                            x.Date.UtcDateTime.Month ==
                                month)
                    .Sum(
                        x =>
                            x.Amount);

            result.Add(
                new EarningsTimelinePointResponse(
                    cursor,
                    salesAmount,
                    purchaseAmount));

            cursor =
                cursor.AddMonths(1);
        }

        return result;
    }

    private static IReadOnlyList<
        EarningsTimelinePointResponse>
        BuildYearlyTimeline(
            DateOnly firstDay,
            DateOnly today,
            IReadOnlyList<
                (
                    DateTimeOffset Date,
                    decimal Amount
                )> sales,
            IReadOnlyList<
                (
                    DateTimeOffset Date,
                    decimal Amount
                )> purchases)
    {
        var result =
            new List<
                EarningsTimelinePointResponse>();

        for (
            var year =
                firstDay.Year;
            year <= today.Year;
            year++)
        {
            var salesAmount =
                sales
                    .Where(
                        x =>
                            x.Date
                                .UtcDateTime
                                .Year ==
                            year)
                    .Sum(
                        x =>
                            x.Amount);

            var purchaseAmount =
                purchases
                    .Where(
                        x =>
                            x.Date
                                .UtcDateTime
                                .Year ==
                            year)
                    .Sum(
                        x =>
                            x.Amount);

            result.Add(
                new EarningsTimelinePointResponse(
                    new DateOnly(
                        year,
                        1,
                        1),
                    salesAmount,
                    purchaseAmount));
        }

        return result;
    }

    private Guid? GetUserId()
    {
        var value =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier);

        return Guid.TryParse(
            value,
            out var userId)
                ? userId
                : null;
    }
}
