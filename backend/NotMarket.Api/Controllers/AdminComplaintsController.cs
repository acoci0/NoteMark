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
[Route("api/admin/complaints")]
[Authorize(Policy = "AdminOnly")]
public sealed class AdminComplaintsController(
    AppDbContext db,
    IAuditService auditService)
    : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AdminComplaintPageResponse>>
        GetAll(
            [FromQuery]
            int page = 1,
            [FromQuery]
            int pageSize = 25,
            [FromQuery]
            string? status = null,
            [FromQuery]
            string? category = null,
            [FromQuery]
            string? search = null,
            CancellationToken cancellationToken = default)
    {
        page =
            Math.Max(
                1,
                page);

        pageSize =
            Math.Clamp(
                pageSize,
                1,
                100);

        ComplaintStatus? statusFilter =
            null;

        if (
            !string.IsNullOrWhiteSpace(
                status))
        {
            if (
                !Enum.TryParse<ComplaintStatus>(
                    status.Trim(),
                    true,
                    out var parsedStatus) ||
                !Enum.IsDefined(
                    typeof(ComplaintStatus),
                    parsedStatus))
            {
                return BadRequest(new
                {
                    message =
                        "Geçersiz şikâyet durumu."
                });
            }

            statusFilter =
                parsedStatus;
        }

        ComplaintCategory? categoryFilter =
            null;

        if (
            !string.IsNullOrWhiteSpace(
                category))
        {
            if (
                !Enum.TryParse<ComplaintCategory>(
                    category.Trim(),
                    true,
                    out var parsedCategory) ||
                !Enum.IsDefined(
                    typeof(ComplaintCategory),
                    parsedCategory))
            {
                return BadRequest(new
                {
                    message =
                        "Geçersiz şikâyet kategorisi."
                });
            }

            categoryFilter =
                parsedCategory;
        }

        var query =
            db.Complaints
                .AsNoTracking()
                .Include(
                    x => x.User)
                .AsQueryable();

        if (
            statusFilter.HasValue)
        {
            query =
                query.Where(
                    x =>
                        x.Status ==
                        statusFilter.Value);
        }

        if (
            categoryFilter.HasValue)
        {
            query =
                query.Where(
                    x =>
                        x.Category ==
                        categoryFilter.Value);
        }

        if (
            !string.IsNullOrWhiteSpace(
                search))
        {
            var normalized =
                search
                    .Trim()
                    .ToLower();

            query =
                query.Where(
                    x =>
                        x.Subject
                            .ToLower()
                            .Contains(
                                normalized) ||
                        x.Description
                            .ToLower()
                            .Contains(
                                normalized) ||
                        x.User.DisplayName
                            .ToLower()
                            .Contains(
                                normalized) ||
                        x.User.Email
                            .ToLower()
                            .Contains(
                                normalized) ||
                        (
                            x.RelatedEntityId != null &&
                            x.RelatedEntityId
                                .ToLower()
                                .Contains(
                                    normalized)
                        ));
        }

        var totalCount =
            await query.CountAsync(
                cancellationToken);

        var rows =
            await query
                .OrderByDescending(
                    x => x.CreatedAt)
                .Skip(
                    (page - 1) *
                    pageSize)
                .Take(
                    pageSize)
                .Select(
                    x => new
                    {
                        x.Id,
                        x.UserId,
                        x.User.DisplayName,
                        x.User.Email,
                        x.Category,
                        x.Subject,
                        x.RelatedEntityType,
                        x.RelatedEntityId,
                        x.Status,
                        x.CreatedAt,
                        x.UpdatedAt
                    })
                .ToListAsync(
                    cancellationToken);

        var items =
            rows
                .Select(
                    x =>
                        new AdminComplaintListItemResponse(
                            x.Id,
                            x.UserId,
                            x.DisplayName,
                            x.Email,
                            x.Category.ToString(),
                            x.Subject,
                            x.RelatedEntityType,
                            x.RelatedEntityId,
                            x.Status.ToString(),
                            x.CreatedAt,
                            x.UpdatedAt))
                .ToList();

        var totalPages =
            totalCount == 0
                ? 0
                : (int)Math.Ceiling(
                    totalCount /
                    (double)pageSize);

        return Ok(
            new AdminComplaintPageResponse(
                page,
                pageSize,
                totalCount,
                totalPages,
                Enum.GetNames<ComplaintStatus>(),
                Enum.GetNames<ComplaintCategory>(),
                items));
    }

    [HttpGet("{complaintId:guid}")]
    public async Task<ActionResult<AdminComplaintDetailResponse>>
        GetDetail(
            Guid complaintId,
            CancellationToken cancellationToken = default)
    {
        var complaint =
            await db.Complaints
                .AsNoTracking()
                .Include(
                    x => x.User)
                .Include(
                    x => x.ReviewedByUser)
                .FirstOrDefaultAsync(
                    x =>
                        x.Id ==
                        complaintId,
                    cancellationToken);

        if (complaint is null)
        {
            return NotFound(new
            {
                message =
                    "Şikâyet veya itiraz kaydı bulunamadı."
            });
        }

        var relatedEntityTitle =
            await GetRelatedEntityTitleAsync(
                complaint,
                cancellationToken);

        return Ok(
            new AdminComplaintDetailResponse(
                complaint.Id,
                complaint.UserId,
                complaint.User.DisplayName,
                complaint.User.Email,
                complaint.Category.ToString(),
                complaint.Subject,
                complaint.Description,
                complaint.RelatedEntityType,
                complaint.RelatedEntityId,
                relatedEntityTitle,
                complaint.Status.ToString(),
                complaint.AdminResponse,
                complaint.ReviewedByUserId,
                complaint.ReviewedByUser?.DisplayName,
                complaint.ReviewedByUser?.Email,
                complaint.ReviewedAt,
                complaint.CreatedAt,
                complaint.UpdatedAt));
    }

    [HttpPost("{complaintId:guid}/decision")]
    public async Task<ActionResult<AdminComplaintDetailResponse>>
        Decide(
            Guid complaintId,
            [FromBody]
            AdminComplaintDecisionRequest request,
            CancellationToken cancellationToken = default)
    {
        var adminUserId =
            GetUserId();

        if (adminUserId is null)
        {
            return Unauthorized();
        }

        if (
            string.IsNullOrWhiteSpace(
                request.Status) ||
            !Enum.TryParse<ComplaintStatus>(
                request.Status.Trim(),
                true,
                out var newStatus) ||
            !Enum.IsDefined(
                typeof(ComplaintStatus),
                newStatus))
        {
            return BadRequest(new
            {
                message =
                    "Geçersiz karar durumu."
            });
        }

        if (
            newStatus !=
                ComplaintStatus.InReview &&
            newStatus !=
                ComplaintStatus.Resolved &&
            newStatus !=
                ComplaintStatus.Rejected)
        {
            return BadRequest(new
            {
                message =
                    "Admin kararı yalnızca InReview, Resolved veya Rejected olabilir."
            });
        }

        var complaint =
            await db.Complaints
                .Include(
                    x => x.User)
                .Include(
                    x => x.ReviewedByUser)
                .FirstOrDefaultAsync(
                    x =>
                        x.Id ==
                        complaintId,
                    cancellationToken);

        if (complaint is null)
        {
            return NotFound(new
            {
                message =
                    "Şikâyet veya itiraz kaydı bulunamadı."
            });
        }

        if (
            complaint.Status ==
                ComplaintStatus.Resolved ||
            complaint.Status ==
                ComplaintStatus.Rejected)
        {
            return Conflict(new
            {
                message =
                    "Sonuçlandırılmış bir başvurunun kararı değiştirilemez."
            });
        }

        if (
            complaint.Status ==
                ComplaintStatus.InReview &&
            newStatus ==
                ComplaintStatus.InReview)
        {
            return Conflict(new
            {
                message =
                    "Başvuru zaten inceleniyor."
            });
        }

        var adminResponse =
            request.AdminResponse?.Trim();

        if (
            (
                newStatus ==
                    ComplaintStatus.Resolved ||
                newStatus ==
                    ComplaintStatus.Rejected
            ) &&
            (
                string.IsNullOrWhiteSpace(
                    adminResponse) ||
                adminResponse.Length < 5
            ))
        {
            return BadRequest(new
            {
                message =
                    "Sonuçlandırma veya ret işleminde en az 5 karakterlik admin açıklaması zorunludur."
            });
        }

        if (
            adminResponse is not null &&
            adminResponse.Length > 2000)
        {
            return BadRequest(new
            {
                message =
                    "Admin açıklaması en fazla 2000 karakter olabilir."
            });
        }

        var previousStatus =
            complaint.Status;

        var now =
            DateTimeOffset.UtcNow;

        complaint.Status =
            newStatus;

        complaint.AdminResponse =
            adminResponse;

        complaint.ReviewedByUserId =
            adminUserId.Value;

        complaint.UpdatedAt =
            now;

        if (
            newStatus ==
                ComplaintStatus.Resolved ||
            newStatus ==
                ComplaintStatus.Rejected)
        {
            complaint.ReviewedAt =
                now;
        }

        await db.SaveChangesAsync(
            cancellationToken);

        var auditAction =
            newStatus switch
            {
                ComplaintStatus.InReview =>
                    "COMPLAINT_IN_REVIEW",

                ComplaintStatus.Resolved =>
                    "COMPLAINT_RESOLVED",

                ComplaintStatus.Rejected =>
                    "COMPLAINT_REJECTED",

                _ =>
                    "COMPLAINT_UPDATED"
            };

        await auditService.WriteAsync(
            adminUserId.Value,
            auditAction,
            "Complaint",
            complaint.Id.ToString(),
            new
            {
                UserId =
                    complaint.UserId,

                PreviousStatus =
                    previousStatus.ToString(),

                NewStatus =
                    newStatus.ToString(),

                Category =
                    complaint.Category.ToString(),

                complaint.Subject,

                complaint.AdminResponse,

                complaint.RelatedEntityType,

                complaint.RelatedEntityId
            },
            cancellationToken);

        /*
         * Audit kaydından sonra reviewer navigation'ı
         * henüz yüklenmemiş olabilir; admin bilgisini
         * doğrudan Users tablosundan alıyoruz.
         */
        var reviewer =
            await db.Users
                .AsNoTracking()
                .Where(
                    x =>
                        x.Id ==
                        adminUserId.Value)
                .Select(
                    x => new
                    {
                        x.DisplayName,
                        x.Email
                    })
                .FirstOrDefaultAsync(
                    cancellationToken);

        var relatedEntityTitle =
            await GetRelatedEntityTitleAsync(
                complaint,
                cancellationToken);

        return Ok(
            new AdminComplaintDetailResponse(
                complaint.Id,
                complaint.UserId,
                complaint.User.DisplayName,
                complaint.User.Email,
                complaint.Category.ToString(),
                complaint.Subject,
                complaint.Description,
                complaint.RelatedEntityType,
                complaint.RelatedEntityId,
                relatedEntityTitle,
                complaint.Status.ToString(),
                complaint.AdminResponse,
                complaint.ReviewedByUserId,
                reviewer?.DisplayName,
                reviewer?.Email,
                complaint.ReviewedAt,
                complaint.CreatedAt,
                complaint.UpdatedAt));
    }

    private async Task<string?>
        GetRelatedEntityTitleAsync(
            Complaint complaint,
            CancellationToken cancellationToken)
    {
        if (
            string.IsNullOrWhiteSpace(
                complaint.RelatedEntityType) ||
            string.IsNullOrWhiteSpace(
                complaint.RelatedEntityId) ||
            !Guid.TryParse(
                complaint.RelatedEntityId,
                out var entityId))
        {
            return null;
        }

        switch (
            complaint.RelatedEntityType)
        {
            case "StudentVerification":
                return await db.StudentVerifications
                    .AsNoTracking()
                    .Where(
                        x =>
                            x.Id ==
                            entityId)
                    .Select(
                        x =>
                            x.UniversityName +
                            " / " +
                            x.DepartmentName)
                    .FirstOrDefaultAsync(
                        cancellationToken);

            case "NoteSubmission":
                return await db.NoteSubmissions
                    .AsNoTracking()
                    .Where(
                        x =>
                            x.Id ==
                            entityId)
                    .Select(
                        x => x.Title)
                    .FirstOrDefaultAsync(
                        cancellationToken);

            case "Order":
                return await db.Orders
                    .AsNoTracking()
                    .Where(
                        x =>
                            x.Id ==
                            entityId)
                    .Select(
                        x =>
                            x.NoteTitleSnapshot)
                    .FirstOrDefaultAsync(
                        cancellationToken);

            case "ApplicationUser":
                return await db.Users
                    .AsNoTracking()
                    .Where(
                        x =>
                            x.Id ==
                            entityId)
                    .Select(
                        x =>
                            x.DisplayName)
                    .FirstOrDefaultAsync(
                        cancellationToken);

            default:
                return null;
        }
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
