using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NotMarket.Api.Contracts;
using NotMarket.Api.Data;
using NotMarket.Api.Domain;
using NotMarket.Api.Services;
using Npgsql;

namespace NotMarket.Api.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize(Policy = "StudentOnly")]
public sealed class OrdersController(
    AppDbContext db,
    INoteDocumentStorage storage) : ControllerBase
{
    /*
     * Platformun her satıştan aldığı
     * yüzde 20 komisyon oranı.
     */
    private const decimal PlatformCommissionRate =
        0.20m;

    /*
     * Öğrencinin kendi siparişlerini listeler.
     *
     * GET /api/orders
     */
    [HttpGet]
    public async Task<
        ActionResult<IReadOnlyList<OrderResponse>>>
        GetMine(
            CancellationToken cancellationToken)
    {
        var buyerId =
            GetUserId();

        if (buyerId is null)
        {
            return Unauthorized();
        }

        var orders =
            await db.Orders
                .AsNoTracking()
                .Where(
                    x =>
                        x.BuyerId ==
                        buyerId.Value)
                .OrderByDescending(
                    x => x.CreatedAt)
                .Select(
                    x => new OrderResponse(
                        x.Id,
                        x.NoteSubmissionId,
                        x.NoteTitleSnapshot,
                        x.GrossAmount,
                        x.Currency,
                        x.Status.ToString(),
                        x.CreatedAt,
                        x.PaidAt,
                        x.CancelledAt))
                .ToListAsync(
                    cancellationToken);

        return Ok(orders);
    }

    /*
     * Öğrencinin kendisine ait tek bir
     * siparişin detayını getirir.
     *
     * GET /api/orders/{orderId}
     */
    [HttpGet("{orderId:guid}")]
    public async Task<ActionResult<OrderResponse>>
        GetById(
            Guid orderId,
            CancellationToken cancellationToken)
    {
        var buyerId =
            GetUserId();

        if (buyerId is null)
        {
            return Unauthorized();
        }

        var order =
            await db.Orders
                .AsNoTracking()
                .Where(
                    x =>
                        x.Id == orderId &&
                        x.BuyerId ==
                            buyerId.Value)
                .Select(
                    x => new OrderResponse(
                        x.Id,
                        x.NoteSubmissionId,
                        x.NoteTitleSnapshot,
                        x.GrossAmount,
                        x.Currency,
                        x.Status.ToString(),
                        x.CreatedAt,
                        x.PaidAt,
                        x.CancelledAt))
                .SingleOrDefaultAsync(
                    cancellationToken);

        if (order is null)
        {
            return NotFound(new
            {
                message =
                    "Sipariş bulunamadı."
            });
        }

        return Ok(order);
    }

    /*
     * Yalnızca ödeme işlemi başarıyla
     * tamamlanmış siparişin sahibi,
     * satın aldığı üretilmiş PDF'i
     * indirebilir.
     *
     * GET /api/orders/{orderId}/download
     */
    [HttpGet("{orderId:guid}/download")]
    public async Task<IActionResult>
        Download(
            Guid orderId,
            CancellationToken cancellationToken)
    {
        var buyerId =
            GetUserId();

        if (buyerId is null)
        {
            return Unauthorized();
        }

        /*
         * Token üretildikten sonra hesap askıya
         * alınmış veya kapatılmış olabilir.
         */
        var buyerIsActive =
            await db.Users
                .AsNoTracking()
                .AnyAsync(
                    x =>
                        x.Id == buyerId.Value &&
                        x.Status ==
                            AccountStatus.Active,
                    cancellationToken);

        if (!buyerIsActive)
        {
            return Forbid();
        }

        /*
         * BuyerId sorguya dahil edilerek başka
         * kullanıcıların sipariş varlığını dahi
         * öğrenmesi engellenir.
         */
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
                            buyerId.Value,
                    cancellationToken);

        if (order is null)
        {
            return NotFound(new
            {
                message =
                    "Sipariş bulunamadı."
            });
        }

        /*
         * Sadece hem sipariş hem de ödeme kaydı
         * başarılı durumdaysa teslim yetkisi verilir.
         */
        if (
            order.Status !=
                OrderStatus.Paid ||
            order.Payment is null ||
            order.Payment.Status !=
                PaymentStatus.Succeeded
        )
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new
                {
                    message =
                        "PDF yalnızca başarılı ödeme sonrasında indirilebilir."
                });
        }

        var generatedPdfPath =
            order.NoteSubmission
                .GeneratedPdfBlobPath;

        if (
            string.IsNullOrWhiteSpace(
                generatedPdfPath)
        )
        {
            return Problem(
                statusCode:
                    StatusCodes
                        .Status503ServiceUnavailable,
                title:
                    "Satın alınan PDF şu anda teslim edilemiyor.");
        }

        var document =
            await storage.OpenReadAsync(
                generatedPdfPath,
                cancellationToken);

        if (document is null)
        {
            return Problem(
                statusCode:
                    StatusCodes
                        .Status503ServiceUnavailable,
                title:
                    "Satın alınan PDF dosyası storage üzerinde bulunamadı.");
        }

        /*
         * Ücretli içeriğin proxy veya tarayıcı
         * cache'lerinde kalmasını engeller.
         */
        Response.Headers.CacheControl =
            "private, no-store, max-age=0";

        Response.Headers.Pragma =
            "no-cache";

        var downloadFileName =
            $"notmark-{order.NoteSubmissionId:N}.pdf";

        return File(
            document,
            "application/pdf",
            downloadFileName,
            enableRangeProcessing:
                true);
    }

    /*
     * Onaylanmış bir not için ödeme
     * bekleyen sipariş oluşturur.
     *
     * POST /api/orders
     */
    [HttpPost]
    public async Task<ActionResult<OrderResponse>>
        Create(
            CreateOrderRequest request,
            CancellationToken cancellationToken)
    {
        var buyerId =
            GetUserId();

        if (buyerId is null)
        {
            return Unauthorized();
        }

        if (
            request.NoteSubmissionId ==
            Guid.Empty
        )
        {
            return BadRequest(new
            {
                message =
                    "Satın alınacak not seçilmelidir."
            });
        }

        /*
         * JWT oluşturulduktan sonra hesabın durumu
         * değişmiş olabileceği için kullanıcı tekrar
         * veritabanından kontrol edilir.
         */
        var buyerIsActive =
            await db.Users
                .AsNoTracking()
                .AnyAsync(
                    x =>
                        x.Id == buyerId.Value &&
                        x.Status ==
                            AccountStatus.Active,
                    cancellationToken);

        if (!buyerIsActive)
        {
            return Forbid();
        }

        var note =
            await db.NoteSubmissions
                .AsNoTracking()
                .Include(x => x.Request)
                .Include(x => x.Seller)
                .SingleOrDefaultAsync(
                    x =>
                        x.Id ==
                        request.NoteSubmissionId,
                    cancellationToken);

        if (note is null)
        {
            return NotFound(new
            {
                message =
                    "Satın alınacak not bulunamadı."
            });
        }

        /*
         * Yalnızca admin tarafından onaylanmış,
         * fiyatı belirlenmiş ve teslim edilebilir
         * PDF dosyası bulunan notlar satılabilir.
         */
        if (
            note.Status !=
                NoteSubmissionStatus.Approved ||
            note.SalePrice is null ||
            note.SalePrice <= 0 ||
            string.IsNullOrWhiteSpace(
                note.GeneratedPdfBlobPath)
        )
        {
            return Conflict(new
            {
                message =
                    "Bu not şu anda satın alınmaya uygun değil."
            });
        }

        if (
            note.SellerId ==
            buyerId.Value
        )
        {
            return Conflict(new
            {
                message =
                    "Kendi yüklediğiniz notu satın alamazsınız."
            });
        }

        if (
            note.Seller.Status !=
            AccountStatus.Active
        )
        {
            return Conflict(new
            {
                message =
                    "Satıcının hesabı aktif olmadığı için bu not satın alınamaz."
            });
        }

        var now =
            DateTimeOffset.UtcNow;

        /*
         * Alıcının:
         * - onaylanmış,
         * - süresi dolmamış,
         * - not ile aynı üniversite ve bölüme ait
         *
         * öğrenci doğrulaması bulunmalıdır.
         */
        var hasMatchingVerification =
            await db.StudentVerifications
                .AsNoTracking()
                .AnyAsync(
                    x =>
                        x.UserId ==
                            buyerId.Value &&
                        x.Status ==
                            VerificationStatus.Approved &&
                        (
                            x.ExpiresAt == null ||
                            x.ExpiresAt > now
                        ) &&
                        x.UniversityName ==
                            note.Request.UniversityName &&
                        x.DepartmentName ==
                            note.Request.DepartmentName,
                    cancellationToken);

        if (!hasMatchingVerification)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new
                {
                    message =
                        "Bu notu satın almak için aynı üniversite ve bölüme ait geçerli bir öğrenci doğrulamanız bulunmalıdır."
                });
        }

        /*
         * Aynı öğrenci aynı not için yalnızca
         * bir aktif siparişe sahip olabilir.
         */
        var activeOrderExists =
            await db.Orders
                .AsNoTracking()
                .AnyAsync(
                    x =>
                        x.BuyerId ==
                            buyerId.Value &&
                        x.NoteSubmissionId ==
                            note.Id &&
                        (
                            x.Status ==
                                OrderStatus.PendingPayment ||
                            x.Status ==
                                OrderStatus.Paid
                        ),
                    cancellationToken);

        if (activeOrderExists)
        {
            return Conflict(new
            {
                message =
                    "Bu not için zaten aktif bir siparişiniz bulunuyor."
            });
        }

        var grossAmount =
            decimal.Round(
                note.SalePrice.Value,
                2,
                MidpointRounding.AwayFromZero);

        var commissionAmount =
            decimal.Round(
                grossAmount *
                PlatformCommissionRate,
                2,
                MidpointRounding.AwayFromZero);

        /*
         * Satıcı kazancı brüt tutardan komisyon
         * çıkarılarak hesaplanır. Böylece üç para
         * alanının toplam dengesi her zaman korunur.
         */
        var sellerEarningAmount =
            grossAmount -
            commissionAmount;

        var order =
            new Order
            {
                BuyerId =
                    buyerId.Value,

                SellerId =
                    note.SellerId,

                NoteSubmissionId =
                    note.Id,

                NoteTitleSnapshot =
                    note.Title,

                GrossAmount =
                    grossAmount,

                PlatformCommissionAmount =
                    commissionAmount,

                SellerEarningAmount =
                    sellerEarningAmount,

                Currency =
                    "TRY",

                Status =
                    OrderStatus.PendingPayment,

                CreatedAt =
                    now
            };

        db.Orders.Add(order);

        try
        {
            await db.SaveChangesAsync(
                cancellationToken);
        }
        catch (DbUpdateException exception)
            when (
                exception.InnerException
                    is PostgresException
                {
                    SqlState:
                            PostgresErrorCodes
                                .UniqueViolation
                }
            )
        {
            /*
             * İki eş zamanlı istek ön kontrolden
             * geçse bile veritabanındaki unique
             * indeks ikinci siparişi engeller.
             */
            return Conflict(new
            {
                message =
                    "Bu not için zaten aktif bir siparişiniz bulunuyor."
            });
        }

        var response =
            new OrderResponse(
                order.Id,
                order.NoteSubmissionId,
                order.NoteTitleSnapshot,
                order.GrossAmount,
                order.Currency,
                order.Status.ToString(),
                order.CreatedAt,
                order.PaidAt,
                order.CancelledAt);

        return CreatedAtAction(
            nameof(GetById),
            new
            {
                orderId =
                    order.Id
            },
            response);
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