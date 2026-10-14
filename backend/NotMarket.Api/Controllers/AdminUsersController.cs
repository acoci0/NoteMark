using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NotMarket.Api.Contracts;
using NotMarket.Api.Data;
using NotMarket.Api.Domain;
using NotMarket.Api.Services;

namespace NotMarket.Api.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Policy = "AdminOnly")]
public sealed class AdminUsersController(
    AppDbContext db,
    IAuditService auditService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminUserListItemDto>>> Get(
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var query = db.Users
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(x =>
                x.Email.ToLower().Contains(term) ||
                x.DisplayName.ToLower().Contains(term));
        }

        var users = await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new AdminUserListItemDto(
                x.Id,
                x.Email,
                x.DisplayName,
                x.Role.ToString(),
                x.Status.ToString(),
                x.StudentVerifications.Count,
                x.CreatedAt))
            .ToListAsync(cancellationToken);

        return Ok(users);
    }

    [HttpGet("{userId:guid}")]
    public async Task<ActionResult<AdminUserDetailDto>> GetDetail(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var user = await db.Users
            .AsNoTracking()
            .SingleOrDefaultAsync(
                x => x.Id == userId,
                cancellationToken);

        if (user is null)
        {
            return NotFound(new
            {
                message = "Kullanıcı bulunamadı."
            });
        }

        var verificationCount =
            await db.StudentVerifications
                .AsNoTracking()
                .CountAsync(
                    x => x.UserId == userId,
                    cancellationToken);

        var noteRequestCount =
            await db.NoteRequests
                .AsNoTracking()
                .CountAsync(
                    x => x.BuyerId == userId,
                    cancellationToken);

        var noteSubmissionCount =
            await db.NoteSubmissions
                .AsNoTracking()
                .CountAsync(
                    x => x.SellerId == userId,
                    cancellationToken);

        var paidPurchases =
            db.Orders
                .AsNoTracking()
                .Where(
                    x =>
                        x.BuyerId == userId &&
                        x.Status == OrderStatus.Paid &&
                        x.Payment != null &&
                        x.Payment.Status ==
                            PaymentStatus.Succeeded);

        var paidSales =
            db.Orders
                .AsNoTracking()
                .Where(
                    x =>
                        x.SellerId == userId &&
                        x.Status == OrderStatus.Paid &&
                        x.Payment != null &&
                        x.Payment.Status ==
                            PaymentStatus.Succeeded);

        var totalPurchases =
            await paidPurchases.CountAsync(
                cancellationToken);

        var totalSales =
            await paidSales.CountAsync(
                cancellationToken);

        var purchaseExpense =
            await paidPurchases
                .SumAsync(
                    x => (decimal?)x.GrossAmount,
                    cancellationToken)
            ?? 0m;

        var salesIncome =
            await paidSales
                .SumAsync(
                    x => (decimal?)x.SellerEarningAmount,
                    cancellationToken)
            ?? 0m;

        var pendingSalesIncome =
            await db.Orders
                .AsNoTracking()
                .Where(
                    x =>
                        x.SellerId == userId &&
                        x.Status ==
                            OrderStatus.PendingPayment)
                .SumAsync(
                    x => (decimal?)x.SellerEarningAmount,
                    cancellationToken)
            ?? 0m;

        var verifications =
            await db.StudentVerifications
                .AsNoTracking()
                .Where(
                    x => x.UserId == userId)
                .OrderByDescending(
                    x => x.CreatedAt)
                .Take(20)
                .Select(
                    x =>
                        new AdminUserVerificationItemDto(
                            x.Id,
                            x.UniversityName,
                            x.FacultyName,
                            x.DepartmentName,
                            x.DocumentIssueDate,
                            x.Status.ToString(),
                            x.ReviewNote,
                            x.ReviewedAt,
                            x.ExpiresAt,
                            x.CreatedAt))
                .ToListAsync(
                    cancellationToken);

        var noteRequests =
            await db.NoteRequests
                .AsNoTracking()
                .Where(
                    x => x.BuyerId == userId)
                .OrderByDescending(
                    x => x.CreatedAt)
                .Take(20)
                .Select(
                    x =>
                        new AdminUserNoteRequestItemDto(
                            x.Id,
                            x.UniversityName,
                            x.DepartmentName,
                            x.CourseName,
                            x.ClassLevel,
                            x.Topic,
                            x.ContentType.HasValue
                                ? x.ContentType.Value.ToString()
                                : null,
                            x.QuestionCount,
                            x.SuggestedMinPrice,
                            x.SuggestedMaxPrice,
                            x.Submissions.Count,
                            x.CreatedAt))
                .ToListAsync(
                    cancellationToken);

        var noteSubmissions =
            await db.NoteSubmissions
                .AsNoTracking()
                .Where(
                    x => x.SellerId == userId)
                .OrderByDescending(
                    x => x.CreatedAt)
                .Take(20)
                .Select(
                    x =>
                        new AdminUserNoteSubmissionItemDto(
                            x.Id,
                            x.RequestId,
                            x.Title,
                            x.Request.CourseName,
                            x.Status.ToString(),
                            x.MatchScore,
                            x.ReadabilityScore,
                            x.OriginalityRiskScore,
                            x.SalePrice,
                            x.CreatedAt))
                .ToListAsync(
                    cancellationToken);

        var purchases =
            await paidPurchases
                .OrderByDescending(
                    x =>
                        x.PaidAt ??
                        x.CreatedAt)
                .Take(20)
                .Select(
                    x =>
                        new AdminUserOrderItemDto(
                            x.Id,
                            x.NoteSubmissionId,
                            x.NoteTitleSnapshot,
                            x.GrossAmount,
                            x.PlatformCommissionAmount,
                            x.SellerEarningAmount,
                            x.Currency,
                            x.Status.ToString(),
                            x.PaidAt,
                            x.CreatedAt))
                .ToListAsync(
                    cancellationToken);

        var sales =
            await paidSales
                .OrderByDescending(
                    x =>
                        x.PaidAt ??
                        x.CreatedAt)
                .Take(20)
                .Select(
                    x =>
                        new AdminUserOrderItemDto(
                            x.Id,
                            x.NoteSubmissionId,
                            x.NoteTitleSnapshot,
                            x.GrossAmount,
                            x.PlatformCommissionAmount,
                            x.SellerEarningAmount,
                            x.Currency,
                            x.Status.ToString(),
                            x.PaidAt,
                            x.CreatedAt))
                .ToListAsync(
                    cancellationToken);

        /*
         * Kullanıcıyla ilişkili Audit Log kayıtları:
         *
         * - kullanıcı hesabı
         * - öğrenci doğrulamaları
         * - gönderdiği notlar
         */
        var verificationIds =
            await db.StudentVerifications
                .AsNoTracking()
                .Where(
                    x => x.UserId == userId)
                .Select(
                    x => x.Id)
                .ToListAsync(
                    cancellationToken);

        var submissionIds =
            await db.NoteSubmissions
                .AsNoTracking()
                .Where(
                    x => x.SellerId == userId)
                .Select(
                    x => x.Id)
                .ToListAsync(
                    cancellationToken);

        var verificationEntityIds =
            verificationIds
                .Select(
                    x => x.ToString())
                .ToList();

        var submissionEntityIds =
            submissionIds
                .Select(
                    x => x.ToString())
                .ToList();

        var userEntityId =
            userId.ToString();

        var recentActivity =
            await db.AuditLogs
                .AsNoTracking()
                .Where(
                    x =>
                        (
                            x.EntityType ==
                                nameof(ApplicationUser) &&
                            x.EntityId ==
                                userEntityId
                        ) ||
                        (
                            x.EntityType ==
                                nameof(StudentVerification) &&
                            verificationEntityIds.Contains(
                                x.EntityId)
                        ) ||
                        (
                            x.EntityType ==
                                nameof(NoteSubmission) &&
                            submissionEntityIds.Contains(
                                x.EntityId)
                        ))
                .OrderByDescending(
                    x => x.CreatedAt)
                .Take(20)
                .Select(
                    x =>
                        new AdminUserRelatedAuditItemDto(
                            x.Id,
                            x.Action,
                            x.EntityType,
                            x.EntityId,
                            x.DetailsJson,
                            x.CreatedAt))
                .ToListAsync(
                    cancellationToken);

        var summary =
            new AdminUserActivitySummaryDto(
                verificationCount,
                noteRequestCount,
                noteSubmissionCount,
                totalPurchases,
                totalSales,
                purchaseExpense,
                salesIncome,
                pendingSalesIncome,
                "TRY");

        return Ok(
            new AdminUserDetailDto(
                user.Id,
                user.Email,
                user.DisplayName,
                user.Role.ToString(),
                user.Status.ToString(),
                user.CreatedAt,
                user.LastLoginAt,
                summary,
                verifications,
                noteRequests,
                noteSubmissions,
                purchases,
                sales,
                recentActivity));
    }

    [HttpPatch("{userId:guid}/status")]
    public async Task<IActionResult> UpdateStatus(
        Guid userId,
        AccountStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<AccountStatus>(
                request.Status,
                ignoreCase: true,
                out var newStatus))
        {
            return BadRequest(new
            {
                message = "Geçersiz hesap durumu."
            });
        }

        var user = await db.Users.FindAsync([userId], cancellationToken);

        if (user is null)
        {
            return NotFound();
        }

        user.Status = newStatus;
        await db.SaveChangesAsync(cancellationToken);

        await auditService.WriteAsync(
            GetAdminId(),
            "USER_STATUS_CHANGED",
            nameof(ApplicationUser),
            user.Id.ToString(),
            new { status = newStatus.ToString() },
            cancellationToken);

        return NoContent();
    }

    private Guid? GetAdminId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out var id) ? id : null;
    }
}
