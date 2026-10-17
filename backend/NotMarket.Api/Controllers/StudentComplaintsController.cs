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
    /*
     * Öğrencinin satın aldığı belirli bir sipariş için
     * bildirebileceği kontrollü sistem sorunlarını döndürür.
     *
     * GET /api/student/complaints/order-options/{orderId}
     */
    [HttpGet("order-options/{orderId:guid}")]
    public async Task<
        ActionResult<StudentOrderComplaintOptionsResponse>>
        GetOrderComplaintOptions(
            Guid orderId,
            CancellationToken cancellationToken = default)
    {
        var userId =
            GetUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var order =
            await db.Orders
                .AsNoTracking()
                .Include(
                    x => x.Payment)
                .Include(
                    x => x.NoteSubmission)
                .SingleOrDefaultAsync(
                    x =>
                        x.Id == orderId &&
                        x.BuyerId ==
                            userId.Value,
                    cancellationToken);

        if (order is null)
        {
            return NotFound(new
            {
                message =
                    "Sipariş bulunamadı veya size ait değil."
            });
        }

        var issues =
            BuildOrderIssueOptions(
                order);

        return Ok(
            new StudentOrderComplaintOptionsResponse(
                order.Id,
                order.NoteTitleSnapshot,
                order.Status.ToString(),
                issues));
    }

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

        var issueCode =
            request.IssueCode?
                .Trim()
                .ToUpperInvariant();

        if (
            category !=
                ComplaintCategory.Order &&
            (
                string.IsNullOrWhiteSpace(
                    subject) ||
                subject.Length < 5 ||
                subject.Length > 180
            ))
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
                    !string.IsNullOrWhiteSpace(
                        issueCode))
                {
                    return BadRequest(new
                    {
                        message =
                            "Doğrulama itirazlarında teknik sorun kodu gönderilemez."
                    });
                }

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
                                    userId.Value &&
                                x.Status ==
                                    VerificationStatus.Rejected,
                            cancellationToken);

                if (!exists)
                {
                    return NotFound(new
                    {
                        message =
                            "Yalnızca size ait reddedilmiş bir doğrulama için itiraz oluşturabilirsiniz."
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
                    !string.IsNullOrWhiteSpace(
                        issueCode))
                {
                    return BadRequest(new
                    {
                        message =
                            "Not itirazlarında teknik sorun kodu gönderilemez."
                    });
                }

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
                                    userId.Value &&
                                x.Status ==
                                    NoteSubmissionStatus.Rejected,
                            cancellationToken);

                if (!exists)
                {
                    return NotFound(new
                    {
                        message =
                            "Yalnızca size ait reddedilmiş bir not gönderimi için itiraz oluşturabilirsiniz."
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
                            "Sorun bildirilecek sipariş seçilmelidir."
                    });
                }

                var order =
                    await db.Orders
                        .AsNoTracking()
                        .Include(
                            x => x.Payment)
                        .Include(
                            x => x.NoteSubmission)
                        .SingleOrDefaultAsync(
                            x =>
                                x.Id ==
                                    request.RelatedEntityId.Value &&
                                x.BuyerId ==
                                    userId.Value,
                            cancellationToken);

                if (order is null)
                {
                    return NotFound(new
                    {
                        message =
                            "Bu sipariş bulunamadı veya size ait değil."
                    });
                }

                if (
                    string.IsNullOrWhiteSpace(
                        issueCode))
                {
                    return BadRequest(new
                    {
                        message =
                            "Geçerli bir sistem sorunu seçilmelidir."
                    });
                }

                var availableIssues =
                    BuildOrderIssueOptions(
                        order);

                var selectedIssue =
                    availableIssues
                        .SingleOrDefault(
                            x =>
                                string.Equals(
                                    x.Code,
                                    issueCode,
                                    StringComparison.OrdinalIgnoreCase));

                if (selectedIssue is null)
                {
                    return BadRequest(new
                    {
                        message =
                            "Seçilen sorun bu sipariş için geçerli değil."
                    });
                }

                issueCode =
                    selectedIssue.Code;

                /*
                 * Sipariş sorunlarında başlığı
                 * kullanıcı belirlemez.
                 */
                subject =
                    selectedIssue.Label;

                relatedEntityType =
                    "Order";

                relatedEntityId =
                    order.Id.ToString();

                break;
            }

            case ComplaintCategory.Account:
            case ComplaintCategory.Other:
            {
                return BadRequest(new
                {
                    message =
                        "Serbest şikâyet oluşturma desteklenmiyor. Başvurunuzu ilgili işlem üzerinden oluşturun."
                });
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

                IssueCode =
                    issueCode,

                Subject =
                    subject!,

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

                complaint.IssueCode,

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

    private static IReadOnlyList<
        StudentOrderIssueOptionResponse>
        BuildOrderIssueOptions(
            Order order)
    {
        var issues =
            new List<
                StudentOrderIssueOptionResponse>();

        var paymentSucceeded =
            order.Payment?.Status ==
                PaymentStatus.Succeeded;

        /*
         * Ödeme başarılı olduğu hâlde sipariş
         * Paid durumuna geçmemişse erişim
         * yetkisi açılmamış demektir.
         */
        if (
            paymentSucceeded &&
            order.Status !=
                OrderStatus.Paid)
        {
            issues.Add(
                GetOrderIssue(
                    "PAYMENT_ACCESS_NOT_GRANTED"));
        }

        /*
         * PDF ile ilgili sorunlar yalnızca
         * başarılı ödeme yapılmış ve sipariş
         * Paid durumundaysa bildirilebilir.
         */
        if (
            paymentSucceeded &&
            order.Status ==
                OrderStatus.Paid)
        {
            issues.Add(
                GetOrderIssue(
                    "DOWNLOAD_FAILED"));

            if (
                !string.IsNullOrWhiteSpace(
                    order.NoteSubmission
                        .GeneratedPdfBlobPath))
            {
                issues.Add(
                    GetOrderIssue(
                        "PDF_CORRUPTED"));

                issues.Add(
                    GetOrderIssue(
                        "PDF_INCOMPLETE"));

                issues.Add(
                    GetOrderIssue(
                        "WRONG_DOCUMENT_DELIVERED"));
            }
        }

        /*
         * Başarılı tahsilattaki tutar veya
         * para birimi sipariş snapshot'ıyla
         * uyuşmuyorsa bu seçenek açılır.
         */
        if (
            paymentSucceeded &&
            order.Payment is not null &&
            (
                order.Payment.Amount !=
                    order.GrossAmount ||
                !string.Equals(
                    order.Payment.Currency,
                    order.Currency,
                    StringComparison.OrdinalIgnoreCase)
            ))
        {
            issues.Add(
                GetOrderIssue(
                    "PAYMENT_AMOUNT_MISMATCH"));
        }

        return issues;
    }

    private static StudentOrderIssueOptionResponse
        GetOrderIssue(
            string code)
    {
        return code switch
        {
            "PAYMENT_ACCESS_NOT_GRANTED" =>
                new(
                    code,
                    "Ödeme yaptım fakat nota erişemiyorum",
                    "Ödeme başarılı olmasına rağmen satın alınan nota erişim yetkisi açılmadı."),

            "DOWNLOAD_FAILED" =>
                new(
                    code,
                    "PDF indirilemiyor",
                    "Satın alınan PDF indirme işlemi teknik bir nedenle tamamlanamıyor."),

            "PDF_CORRUPTED" =>
                new(
                    code,
                    "PDF açılmıyor veya dosya bozuk",
                    "İndirilen PDF dosyası açılmıyor ya da geçerli bir PDF olarak görüntülenemiyor."),

            "PDF_INCOMPLETE" =>
                new(
                    code,
                    "PDF'de sayfalar eksik veya boş",
                    "Teslim edilen PDF'de teknik üretim sürecinden kaynaklanan eksik veya boş sayfalar bulunuyor."),

            "WRONG_DOCUMENT_DELIVERED" =>
                new(
                    code,
                    "Satın aldığım not yerine farklı bir not teslim edildi",
                    "Teslim edilen PDF, satın alınan not kaydıyla eşleşmiyor."),

            "PAYMENT_AMOUNT_MISMATCH" =>
                new(
                    code,
                    "Tahsil edilen tutar sipariş tutarıyla uyuşmuyor",
                    "Başarılı ödeme kaydındaki tutar veya para birimi sipariş tutarıyla eşleşmiyor."),

            _ =>
                throw new ArgumentOutOfRangeException(
                    nameof(code),
                    code,
                    "Bilinmeyen sipariş sorun kodu.")
        };
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
                complaint.UpdatedAt,
                complaint.IssueCode);
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
