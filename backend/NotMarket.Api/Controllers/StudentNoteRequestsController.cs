using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NotMarket.Api.Contracts;
using NotMarket.Api.Data;
using NotMarket.Api.Domain;

namespace NotMarket.Api.Controllers;

[ApiController]
[Route("api/student/note-requests")]
[Authorize(Policy = "StudentOnly")]
public sealed class StudentNoteRequestsController(
    AppDbContext db)
    : ControllerBase
{
    private static readonly int[]
        AllowedQuestionCounts =
        [
            10,
            15,
            20,
            25,
            30
        ];

    /*
     * Öğrencinin kendi oluşturduğu
     * not taleplerini listeler.
     *
     * GET /api/student/note-requests/mine
     */
    [HttpGet("mine")]
    public async Task<
        ActionResult<IReadOnlyList<NoteRequestResponse>>>
        GetMine(
            CancellationToken cancellationToken)
    {
        var buyerId =
            GetUserId();

        if (buyerId is null)
        {
            return Unauthorized();
        }

        var requests =
            await db.NoteRequests
                .AsNoTracking()
                .Where(
                    x =>
                        x.BuyerId ==
                        buyerId.Value)
                .OrderByDescending(
                    x => x.CreatedAt)
                .Take(100)
                .ToListAsync(
                    cancellationToken);

        var response =
            requests
                .Select(MapResponse)
                .ToArray();

        return Ok(response);
    }

    /*
     * Öğrenci kendi oluşturduğu tek bir
     * talebin ayrıntısını görüntüler.
     *
     * GET /api/student/note-requests/{requestId}
     */
    [HttpGet("{requestId:guid}")]
    public async Task<
        ActionResult<NoteRequestResponse>>
        GetById(
            Guid requestId,
            CancellationToken cancellationToken)
    {
        var buyerId =
            GetUserId();

        if (buyerId is null)
        {
            return Unauthorized();
        }

        var request =
            await db.NoteRequests
                .AsNoTracking()
                .SingleOrDefaultAsync(
                    x =>
                        x.Id == requestId &&
                        x.BuyerId ==
                            buyerId.Value,
                    cancellationToken);

        if (request is null)
        {
            return NotFound(new
            {
                message =
                    "Not talebi bulunamadı."
            });
        }

        return Ok(
            MapResponse(request));
    }

    /*
     * Yeni bir not talebi oluşturur.
     *
     * POST /api/student/note-requests
     */
    [HttpPost]
    public async Task<
        ActionResult<NoteRequestResponse>>
        Create(
            CreateNoteRequestRequest request,
            CancellationToken cancellationToken)
    {
        var buyerId =
            GetUserId();

        if (buyerId is null)
        {
            return Unauthorized();
        }

        var buyerIsActive =
            await db.Users
                .AsNoTracking()
                .AnyAsync(
                    x =>
                        x.Id ==
                            buyerId.Value &&
                        x.Status ==
                            AccountStatus.Active,
                    cancellationToken);

        if (!buyerIsActive)
        {
            return Forbid();
        }

        if (
            request.VerificationId ==
            Guid.Empty
        )
        {
            return BadRequest(new
            {
                message =
                    "Öğrenci doğrulaması seçilmelidir."
            });
        }

        if (
            request.ClassLevel < 1 ||
            request.ClassLevel > 6
        )
        {
            return BadRequest(new
            {
                message =
                    "Sınıf seviyesi 1 ile 6 arasında olmalıdır."
            });
        }

        var courseName =
            request.CourseName?.Trim() ??
            string.Empty;

        if (
            string.IsNullOrWhiteSpace(
                courseName) ||
            courseName.Length > 180
        )
        {
            return BadRequest(new
            {
                message =
                    "Ders adı 1-180 karakter arasında olmalıdır."
            });
        }

        var topic =
            request.Topic?.Trim() ??
            string.Empty;

        if (
            string.IsNullOrWhiteSpace(
                topic) ||
            topic.Length > 180
        )
        {
            return BadRequest(new
            {
                message =
                    "Ders konusu 1-180 karakter arasında olmalıdır."
            });
        }

        if (
            !Enum.TryParse<
                NoteRequestContentType>(
                    request.ContentType,
                    ignoreCase: true,
                    out var contentType) ||
            !Enum.IsDefined(
                contentType)
        )
        {
            return BadRequest(new
            {
                message =
                    "Geçerli içerik türleri: NoteOnly, DetailedSummary ve StudyQuestions."
            });
        }

        int? questionCount =
            request.QuestionCount;

        if (
            contentType ==
            NoteRequestContentType
                .StudyQuestions
        )
        {
            if (
                !questionCount.HasValue ||
                !AllowedQuestionCounts.Contains(
                    questionCount.Value)
            )
            {
                return BadRequest(new
                {
                    message =
                        "Çalışma soruları için soru sayısı 10, 15, 20, 25 veya 30 olmalıdır."
                });
            }
        }
        else
        {
            if (questionCount.HasValue)
            {
                return BadRequest(new
                {
                    message =
                        "Soru sayısı yalnızca çalışma soruları seçildiğinde kullanılabilir."
                });
            }

            questionCount =
                null;
        }

        var additionalNotes =
            string.IsNullOrWhiteSpace(
                request.AdditionalNotes)
                ? null
                : request
                    .AdditionalNotes
                    .Trim();

        if (
            additionalNotes is not null &&
            additionalNotes.Length > 600
        )
        {
            return BadRequest(new
            {
                message =
                    "Ek açıklama en fazla 600 karakter olabilir."
            });
        }

        var now =
            DateTimeOffset.UtcNow;

        /*
         * Üniversite ve bölüm bilgileri
         * istemciden serbest metin olarak alınmaz.
         *
         * Kullanıcının onaylanmış öğrenci
         * doğrulamasından elde edilir.
         */
        var verification =
            await db.StudentVerifications
                .AsNoTracking()
                .SingleOrDefaultAsync(
                    x =>
                        x.Id ==
                            request.VerificationId &&
                        x.UserId ==
                            buyerId.Value &&
                        x.Status ==
                            VerificationStatus
                                .Approved &&
                        (
                            x.ExpiresAt == null ||
                            x.ExpiresAt > now
                        ),
                    cancellationToken);

        if (verification is null)
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new
                {
                    message =
                        "Bu talep için geçerli ve onaylanmış bir öğrenci doğrulaması bulunamadı."
                });
        }

        var priceRange =
            CalculatePrice(
                contentType,
                questionCount);

        /*
         * CriteriaJson, mevcut AI değerlendirme
         * pipeline'ıyla geriye dönük uyumluluk
         * amacıyla korunur.
         */
        var criteriaJson =
            JsonSerializer.Serialize(
                new
                {
                    topic,
                    contentType =
                        contentType.ToString(),
                    questionCount,
                    additionalNotes
                });

        var noteRequest =
            new NoteRequest
            {
                BuyerId =
                    buyerId.Value,

                UniversityName =
                    verification
                        .UniversityName,

                DepartmentName =
                    verification
                        .DepartmentName,

                CourseName =
                    courseName,

                ClassLevel =
                    request.ClassLevel,

                Topic =
                    topic,

                ContentType =
                    contentType,

                QuestionCount =
                    questionCount,

                AdditionalNotes =
                    additionalNotes,

                CriteriaJson =
                    criteriaJson,

                SuggestedMinPrice =
                    priceRange.Min,

                SuggestedMaxPrice =
                    priceRange.Max,

                CreatedAt =
                    now
            };

        db.NoteRequests.Add(
            noteRequest);

        await db.SaveChangesAsync(
            cancellationToken);

        var response =
            MapResponse(
                noteRequest);

        return CreatedAtAction(
            nameof(GetById),
            new
            {
                requestId =
                    noteRequest.Id
            },
            response);
    }

    private static (
        decimal Min,
        decimal Max)
        CalculatePrice(
            NoteRequestContentType contentType,
            int? questionCount)
    {
        if (
            contentType ==
            NoteRequestContentType.NoteOnly
        )
        {
            return (
                90m,
                140m);
        }

        if (
            contentType ==
            NoteRequestContentType
                .DetailedSummary
        )
        {
            return (
                100m,
                150m);
        }

        var multiplier =
            questionCount switch
            {
                10 => 1.00m,
                15 => 1.10m,
                20 => 1.20m,
                25 => 1.30m,
                30 => 1.40m,

                _ =>
                    throw new
                        InvalidOperationException(
                            "Geçersiz soru sayısı.")
            };

        return (
            decimal.Round(
                90m * multiplier,
                2,
                MidpointRounding
                    .AwayFromZero),

            decimal.Round(
                140m * multiplier,
                2,
                MidpointRounding
                    .AwayFromZero)
        );
    }

    private static NoteRequestResponse
        MapResponse(
            NoteRequest request)
    {
        return new NoteRequestResponse(
            request.Id,
            request.UniversityName,
            request.DepartmentName,
            request.CourseName,
            request.ClassLevel,
            request.Topic ??
                "Belirtilmemiş",
            request.ContentType?
                .ToString() ??
                "Legacy",
            request.QuestionCount,
            request.AdditionalNotes,
            request.SuggestedMinPrice,
            request.SuggestedMaxPrice,
            request.CreatedAt);
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
