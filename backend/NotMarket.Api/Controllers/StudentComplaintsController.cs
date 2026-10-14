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
[Route("api/student/complaints")]
[Authorize(Policy = "StudentOnly")]
public sealed class StudentComplaintsController(
    AppDbContext db,
    IAuditService auditService)
    : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<StudentComplaintItemResponse>>
        Create(
            [FromBody]
            CreateStudentComplaintRequest request,
            CancellationToken cancellationToken = default)
    {
        var userId =
            GetUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        if (
            string.IsNullOrWhiteSpace(
                request.Category) ||
            !Enum.TryParse<ComplaintCategory>(
                request.Category.Trim(),
                true,
                out var category) ||
            !Enum.IsDefined(
                typeof(ComplaintCategory),
                category)
        )
        {
            return BadRequest(new
            {
                message =
                    "Geçersiz şikâyet kategorisi."
            });
        }

        var subject =
            request.Subject?.Trim();

        var description =
            request.Description?.Trim();

        if (
            string.IsNullOrWhiteSpace(
                subject) ||
            subject.Length < 5 ||
            subject.Length > 180)
        {
            return BadRequest(new
            {
                message =
                    "Konu 5 ile 180 karakter arasında olmalıdır."
            });
        }

        if (
            string.IsNullOrWhiteSpace(
                description) ||
            description.Length < 20 ||
            description.Length > 2000)
        {
            return BadRequest(new
            {
                message =
                    "Açıklama 20 ile 2000 karakter arasında olmalıdır."
            });
        }

        string? relatedEntityType =
            null;

        string? relatedEntityId =
            null;

        switch (category)
        {
            case ComplaintCategory.Verification:
            {
                if (
                    request.RelatedEntityId is null)
                {
                    return BadRequest(new
                    {
                        message =
                            "Doğrulama itirazı için doğrulama kaydı seçilmelidir."
                    });
                }

                var exists =
                    await db.StudentVerifications
                        .AsNoTracking()
                        .AnyAsync(
                            x =>
                                x.Id ==
                                    request.RelatedEntityId.Value &&
                                x.UserId ==
                                    userId.Value,
                            cancellationToken);

                if (!exists)
                {
                    return NotFound(new
                    {
                        message =
                            "Bu doğrulama kaydı bulunamadı veya size ait değil."
                    });
                }

                relatedEntityType =
                    "StudentVerification";

                relatedEntityId =
                    request.RelatedEntityId
                        .Value
                        .ToString();

                break;
            }

            case ComplaintCategory.Note:
            {
                if (
                    request.RelatedEntityId is null)
                {
                    return BadRequest(new
                    {
                        message =
                            "Not itirazı için not gönderimi seçilmelidir."
                    });
                }

                var exists =
                    await db.NoteSubmissions
                        .AsNoTracking()
                        .AnyAsync(
                            x =>
                                x.Id ==
                                    request.RelatedEntityId.Value &&
                                x.SellerId ==
                                    userId.Value,
                            cancellationToken);

                if (!exists)
                {
                    return NotFound(new
                    {
                        message =
                            "Bu not gönderimi bulunamadı veya size ait değil."
                    });
                }

                relatedEntityType =
                    "NoteSubmission";

                relatedEntityId =
                    request.RelatedEntityId
                        .Value
                        .ToString();

                break;
            }

            case ComplaintCategory.Order:
            {
                if (
                    request.RelatedEntityId is null)
                {
                    return BadRequest(new
                    {
                        message =
                            "Sipariş şikâyeti için sipariş seçilmelidir."
                    });
                }

                var exists =
                    await db.Orders
                        .AsNoTracking()
                        .AnyAsync(
                            x =>
                                x.Id ==
                                    request.RelatedEntityId.Value &&
                                (
                                    x.BuyerId ==
                                        userId.Value ||
                                    x.SellerId ==
                                        userId.Value
                                ),
                            cancellationToken);

                if (!exists)
                {
                    return NotFound(new
                    {
                        message =
                            "Bu sipariş bulunamadı veya sizinle ilişkili değil."
                    });
                }

                relatedEntityType =
                    "Order";

                relatedEntityId =
                    request.RelatedEntityId
                        .Value
                        .ToString();

                break;
            }

            case ComplaintCategory.Account:
            {
                if (
                    request.RelatedEntityId is not null &&
                    request.RelatedEntityId.Value !=
                        userId.Value)
                {
                    return BadRequest(new
                    {
                        message =
                            "Başka bir kullanıcı hesabı adına itiraz oluşturamazsınız."
                    });
                }

                relatedEntityType =
                    "ApplicationUser";

                relatedEntityId =
                    userId.Value.ToString();

                break;
            }

            case ComplaintCategory.Other:
            {
                if (
                    request.RelatedEntityId is not null)
                {
                    return BadRequest(new
                    {
                        message =
                            "Diğer kategorisinde ilişkili kayıt gönderilmemelidir."
                    });
                }

                break;
            }

            default:
                return BadRequest(new
                {
                    message =
                        "Geçersiz şikâyet kategorisi."
                });
        }

        /*
         * Aynı kayıt için hâlihazırda açık veya
         * incelenmekte olan bir başvuru varsa
         * ikinci kez başvuru açılmasını engelliyoruz.
         */
        if (
            relatedEntityType is not null &&
            relatedEntityId is not null)
        {
            var duplicateExists =
                await db.Complaints
                    .AsNoTracking()
                    .AnyAsync(
                        x =>
                            x.UserId ==
                                userId.Value &&
                            x.Category ==
                                category &&
                            x.RelatedEntityType ==
                                relatedEntityType &&
                            x.RelatedEntityId ==
                                relatedEntityId &&
                            (
                                x.Status ==
                                    ComplaintStatus.Open ||
                                x.Status ==
                                    ComplaintStatus.InReview
                            ),
                        cancellationToken);

            if (duplicateExists)
            {
                return Conflict(new
                {
                    message =
                        "Bu kayıt için zaten açık veya incelenmekte olan bir başvurunuz var."
                });
            }
        }

        var now =
            DateTimeOffset.UtcNow;

        var complaint =
            new Complaint
            {
                UserId =
                    userId.Value,

                Category =
                    category,

                Subject =
                    subject,

                Description =
                    description,

                RelatedEntityType =
                    relatedEntityType,

                RelatedEntityId =
                    relatedEntityId,

                Status =
                    ComplaintStatus.Open,

                CreatedAt =
                    now,

                UpdatedAt =
                    now
            };

        db.Complaints.Add(
            complaint);

        await db.SaveChangesAsync(
            cancellationToken);

        await auditService.WriteAsync(
            userId.Value,
            "COMPLAINT_CREATED",
            "Complaint",
            complaint.Id.ToString(),
            new
            {
                Category =
                    complaint.Category.ToString(),

                complaint.Subject,

                complaint.RelatedEntityType,

                complaint.RelatedEntityId
            },
            cancellationToken);

        return StatusCode(
            StatusCodes.Status201Created,
            ToResponse(
                complaint));
    }

    [HttpGet("mine")]
    public async Task<
        ActionResult<
            IReadOnlyList<StudentComplaintItemResponse>>>
        GetMine(
            CancellationToken cancellationToken = default)
    {
        var userId =
            GetUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var complaints =
            await db.Complaints
                .AsNoTracking()
                .Where(
                    x =>
                        x.UserId ==
                            userId.Value)
                .OrderByDescending(
                    x => x.CreatedAt)
                .Take(100)
                .ToListAsync(
                    cancellationToken);

        return Ok(
            complaints
                .Select(
                    ToResponse)
                .ToList());
    }

    private static StudentComplaintItemResponse
        ToResponse(
            Complaint complaint)
    {
        return
            new StudentComplaintItemResponse(
                complaint.Id,
                complaint.Category.ToString(),
                complaint.Subject,
                complaint.Description,
                complaint.RelatedEntityType,
                complaint.RelatedEntityId,
                complaint.Status.ToString(),
                complaint.AdminResponse,
                complaint.ReviewedAt,
                complaint.CreatedAt,
                complaint.UpdatedAt);
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
