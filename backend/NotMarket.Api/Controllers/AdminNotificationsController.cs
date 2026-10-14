using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NotMarket.Api.Contracts;
using NotMarket.Api.Data;
using NotMarket.Api.Domain;

namespace NotMarket.Api.Controllers;

[ApiController]
[Route("api/admin/notifications")]
[Authorize(Policy = "AdminOnly")]
public sealed class AdminNotificationsController(
    AppDbContext db)
    : ControllerBase
{
    /*
     * Admin panelinde müdahale gerektiren
     * operasyon kayıtlarını tek akışta döndürür.
     *
     * GET /api/admin/notifications
     */
    [HttpGet]
    public async Task<
        ActionResult<AdminNotificationSummaryDto>>
        Get(
            CancellationToken cancellationToken)
    {
        var pendingVerificationCount =
            await db.StudentVerifications
                .AsNoTracking()
                .CountAsync(
                    x =>
                        x.Status ==
                        VerificationStatus.Pending,
                    cancellationToken);

        var manualReviewCount =
            await db.NoteSubmissions
                .AsNoTracking()
                .CountAsync(
                    x =>
                        x.Status ==
                        NoteSubmissionStatus.ManualReview,
                    cancellationToken);

        var pdfFailedCount =
            await db.NoteSubmissions
                .AsNoTracking()
                .CountAsync(
                    x =>
                        x.Status ==
                        NoteSubmissionStatus
                            .PdfGenerationFailed,
                    cancellationToken);

        var pendingVerifications =
            await db.StudentVerifications
                .AsNoTracking()
                .Include(x => x.User)
                .Where(
                    x =>
                        x.Status ==
                        VerificationStatus.Pending)
                .OrderByDescending(
                    x => x.CreatedAt)
                .Take(15)
                .Select(
                    x => new
                    {
                        x.Id,
                        UserName =
                            x.User.DisplayName,
                        x.UniversityName,
                        x.DepartmentName,
                        x.CreatedAt
                    })
                .ToListAsync(
                    cancellationToken);

        var manualReviews =
            await db.NoteSubmissions
                .AsNoTracking()
                .Include(x => x.Seller)
                .Include(x => x.Request)
                .Where(
                    x =>
                        x.Status ==
                        NoteSubmissionStatus
                            .ManualReview)
                .OrderByDescending(
                    x => x.CreatedAt)
                .Take(15)
                .Select(
                    x => new
                    {
                        x.Id,
                        x.Title,
                        SellerName =
                            x.Seller.DisplayName,
                        CourseName =
                            x.Request.CourseName,
                        x.CreatedAt
                    })
                .ToListAsync(
                    cancellationToken);

        var pdfFailures =
            await db.NoteSubmissions
                .AsNoTracking()
                .Where(
                    x =>
                        x.Status ==
                        NoteSubmissionStatus
                            .PdfGenerationFailed)
                .OrderByDescending(
                    x => x.CreatedAt)
                .Take(15)
                .Select(
                    x => new
                    {
                        x.Id,
                        x.Title,
                        x.CreatedAt
                    })
                .ToListAsync(
                    cancellationToken);

        var items =
            new List<AdminNotificationDto>();

        items.AddRange(
            pendingVerifications.Select(
                x =>
                    new AdminNotificationDto(
                        $"verification:{x.Id}",
                        "verification",
                        "Öğrenci doğrulaması bekliyor",
                        $"{x.UserName} · " +
                        $"{x.UniversityName} · " +
                        $"{x.DepartmentName}",
                        "/verifications",
                        "warning",
                        x.CreatedAt)));

        items.AddRange(
            manualReviews.Select(
                x =>
                    new AdminNotificationDto(
                        $"note-review:{x.Id}",
                        "note-review",
                        "Not manuel inceleme bekliyor",
                        $"{x.Title} · " +
                        $"{x.CourseName} · " +
                        $"{x.SellerName}",
                        $"/notes/{x.Id}",
                        "info",
                        x.CreatedAt)));

        items.AddRange(
            pdfFailures.Select(
                x =>
                    new AdminNotificationDto(
                        $"pdf-failed:{x.Id}",
                        "pdf-failed",
                        "PDF üretimi başarısız",
                        $"{x.Title} için PDF " +
                        "üretimi yeniden denenmeli.",
                        $"/notes/{x.Id}",
                        "danger",
                        x.CreatedAt)));

        var orderedItems =
            items
                .OrderByDescending(
                    x => x.CreatedAt)
                .Take(30)
                .ToList();

        return Ok(
            new AdminNotificationSummaryDto(
                pendingVerificationCount +
                manualReviewCount +
                pdfFailedCount,
                orderedItems));
    }
}
