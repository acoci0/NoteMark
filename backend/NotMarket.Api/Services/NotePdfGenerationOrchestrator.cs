using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NotMarket.Api.Data;
using NotMarket.Api.Domain;

namespace NotMarket.Api.Services;

public sealed class NotePdfGenerationOrchestrator(
    AppDbContext db,
    INoteDocumentStorage storage,
    INoteContentConversionService
        contentConversionService,
    ILatexDocumentRenderer documentRenderer,
    ILatexPdfCompiler pdfCompiler,
    IOptions<OpenAiOptions> openAiOptions,
    IOptions<NotePdfGenerationOptions>
        pdfGenerationOptions,
    ILogger<NotePdfGenerationOrchestrator> logger)
    : INotePdfGenerationOrchestrator
{
    private static readonly JsonSerializerOptions
        ArtifactJsonOptions =
            new(JsonSerializerDefaults.Web)
            {
                PropertyNameCaseInsensitive =
                    true
            };

    private readonly OpenAiOptions
        _openAiOptions =
            openAiOptions.Value;

    private readonly NotePdfGenerationOptions
        _pdfGenerationOptions =
            pdfGenerationOptions.Value;

    public async Task<NotePdfGenerationResult>
        GenerateAsync(
            Guid noteSubmissionId,
            CancellationToken cancellationToken)
    {
        if (noteSubmissionId == Guid.Empty)
        {
            throw new ArgumentException(
                "PDF üretilecek not gönderim ID'si geçersiz.",
                nameof(noteSubmissionId));
        }

        /*
         * Aynı notun iki worker tarafından aynı
         * anda işlenmesini engellemek için kayıt
         * atomik olarak PdfGenerating durumuna
         * geçirilir.
         */
        var claimed =
            await db.NoteSubmissions
                .Where(
                    x =>
                        x.Id ==
                            noteSubmissionId &&
                        x.Status ==
                            NoteSubmissionStatus
                                .PdfGeneration)
                .ExecuteUpdateAsync(
                    setters =>
                        setters
                            .SetProperty(
                                x => x.Status,
                                NoteSubmissionStatus
                                    .PdfGenerating)
                            .SetProperty(
                                x =>
                                    x.PdfGenerationAttemptCount,
                                x =>
                                    x.PdfGenerationAttemptCount +
                                    1)
                            .SetProperty(
                                x =>
                                    x.PdfGenerationError,
                                (string?)null),
                    cancellationToken);

        if (claimed == 0)
        {
            var exists =
                await db.NoteSubmissions
                    .AsNoTracking()
                    .AnyAsync(
                        x =>
                            x.Id ==
                                noteSubmissionId,
                        cancellationToken);

            if (!exists)
            {
                throw new KeyNotFoundException(
                    "PDF üretilecek not bulunamadı.");
            }

            throw new InvalidOperationException(
                "Not PDF üretimine uygun durumda değil veya hâlihazırda işleniyor.");
        }

        string? newlyGeneratedPath =
            null;

        try
        {
            var submission =
                await db.NoteSubmissions
                    .Include(
                        x => x.Request)
                    .Include(
                        x => x.PdfGenerationArtifact)
                    .SingleAsync(
                        x =>
                            x.Id ==
                                noteSubmissionId,
                        cancellationToken);

            /*
             * PdfGeneration durumuna yalnızca:
             *
             * - AI AutoApprove kararı veya
             * - admin manuel onayı
             *
             * sonucunda geçilmiş olmalıdır.
             */
            await ValidateGenerationApprovalAsync(
                submission,
                cancellationToken);

            await using var originalDocument =
                await storage.OpenReadAsync(
                    submission.OriginalBlobPath,
                    cancellationToken);

            if (originalDocument is null)
            {
                throw new FileNotFoundException(
                    "PDF üretimi için orijinal not dosyası bulunamadı.",
                    submission.OriginalBlobPath);
            }

            var documentBytes =
                await ReadWithLimitAsync(
                    originalDocument,
                    _openAiOptions
                        .MaxDocumentBytes,
                    cancellationToken);

            if (
                documentBytes.Length >
                _openAiOptions.MaxDocumentBytes
            )
            {
                throw new InvalidOperationException(
                    "Orijinal not PDF'i izin verilen dosya boyutunu aşıyor.");
            }

            var sourceDocumentSha256 =
                CalculateSha256(
                    documentBytes);

            var artifact =
                submission
                    .PdfGenerationArtifact;

            NoteDocumentModel? document =
                null;

            /*
             * Birinci seviye cache:
             *
             * Kaynak PDF, model ve prompt
             * değişmemişse OpenAI tekrar
             * çağrılmaz.
             */
            var conversionCacheHit =
                artifact is not null &&
                string.Equals(
                    artifact.SourceDocumentSha256,
                    sourceDocumentSha256,
                    StringComparison
                        .OrdinalIgnoreCase) &&
                string.Equals(
                    artifact.ModelName,
                    _pdfGenerationOptions.Model,
                    StringComparison.Ordinal) &&
                string.Equals(
                    artifact.PromptVersion,
                    _pdfGenerationOptions
                        .PromptVersion,
                    StringComparison.Ordinal) &&
                !string.IsNullOrWhiteSpace(
                    artifact.DocumentModelJson);

            if (conversionCacheHit)
            {
                try
                {
                    document =
                        JsonSerializer
                            .Deserialize<
                                NoteDocumentModel>(
                                artifact!
                                    .DocumentModelJson,
                                ArtifactJsonOptions);

                    if (document is null)
                    {
                        conversionCacheHit =
                            false;
                    }
                }
                catch (JsonException exception)
                {
                    conversionCacheHit =
                        false;

                    logger.LogWarning(
                        exception,
                        "PDF artifact belge modeli okunamadı. OpenAI dönüşümü yeniden yapılacak. NoteSubmissionId: {NoteSubmissionId}",
                        submission.Id);
                }
            }

            string modelName;
            string promptVersion;
            DateTimeOffset convertedAt;

            if (!conversionCacheHit)
            {
                var conversionInput =
                    new NoteContentConversionInput(
                        submission.Id,
                        submission.Title,
                        submission.Request
                            .UniversityName,
                        submission.Request
                            .DepartmentName,
                        submission.Request
                            .CourseName,
                        submission.Request
                            .CriteriaJson,
                        Path.GetFileName(
                            submission
                                .OriginalBlobPath),
                        "application/pdf",
                        documentBytes);

                /*
                 * Cache geçersizse orijinal PDF
                 * yeniden yapılandırılmış belge
                 * modeline dönüştürülür.
                 */
                var conversionResult =
                    await contentConversionService
                        .ConvertAsync(
                            conversionInput,
                            cancellationToken);

                document =
                    conversionResult.Document;

                modelName =
                    conversionResult.ModelName;

                promptVersion =
                    conversionResult
                        .PromptVersion;

                convertedAt =
                    conversionResult
                        .ConvertedAt;
            }
            else
            {
                modelName =
                    artifact!.ModelName;

                promptVersion =
                    artifact.PromptVersion;

                convertedAt =
                    artifact.ConvertedAt;

                logger.LogInformation(
                    "PDF içerik dönüşüm artifact cache hit. OpenAI çağrısı atlandı. NoteSubmissionId: {NoteSubmissionId}",
                    submission.Id);
            }

            /*
             * İkinci seviye cache:
             *
             * İçerik modeli geçerliyse ve
             * LaTeX şablon sürümü de aynıysa
             * mevcut LaTeX kaynağı kullanılır.
             *
             * Yalnızca şablon değişmişse OpenAI
             * çağrılmadan yeniden render edilir.
             */
            var latexCacheHit =
                conversionCacheHit &&
                artifact is not null &&
                string.Equals(
                    artifact.TemplateVersion,
                    _pdfGenerationOptions
                        .TemplateVersion,
                    StringComparison.Ordinal) &&
                !string.IsNullOrWhiteSpace(
                    artifact.LatexSource);

            string latexSource;
            string templateVersion;
            DateTimeOffset renderedAt;

            if (latexCacheHit)
            {
                latexSource =
                    artifact!.LatexSource;

                templateVersion =
                    artifact.TemplateVersion;

                renderedAt =
                    artifact.RenderedAt;

                logger.LogInformation(
                    "PDF LaTeX artifact cache hit. Render işlemi atlandı. NoteSubmissionId: {NoteSubmissionId}",
                    submission.Id);
            }
            else
            {
                var generatedAt =
                    DateTimeOffset.UtcNow;

                var renderInput =
                    new LatexDocumentRenderInput(
                        new LatexDocumentMetadata(
                            submission.Id,
                            submission.Title,
                            submission.Request
                                .UniversityName,
                            submission.Request
                                .DepartmentName,
                            submission.Request
                                .CourseName,
                            generatedAt),
                        document ??
                        throw new InvalidOperationException(
                            "PDF üretimi için belge modeli oluşturulamadı."));

                var renderResult =
                    documentRenderer.Render(
                        renderInput);

                latexSource =
                    renderResult.Source;

                templateVersion =
                    renderResult
                        .TemplateVersion;

                renderedAt =
                    DateTimeOffset.UtcNow;
            }

            /*
             * Cache miss olduğunda veya yalnızca
             * template değiştiğinde artifact
             * güncellenir.
             *
             * Bu kayıt PDF derlenmeden önce
             * saklanır. Böylece derleme daha sonra
             * başarısız olsa bile OpenAI dönüşümü
             * retry sırasında tekrar yapılmaz.
             */
            if (
                !conversionCacheHit ||
                !latexCacheHit
            )
            {
                var documentModelJson =
                    conversionCacheHit
                        ? artifact!
                            .DocumentModelJson
                        : JsonSerializer.Serialize(
                            document ??
                            throw new InvalidOperationException(
                                "Artifact için belge modeli bulunamadı."),
                            ArtifactJsonOptions);

                if (artifact is null)
                {
                    artifact =
                        new NotePdfGenerationArtifact
                        {
                            NoteSubmissionId =
                                submission.Id,
                            NoteSubmission =
                                submission,
                            SourceDocumentSha256 =
                                sourceDocumentSha256,
                            DocumentModelJson =
                                documentModelJson,
                            LatexSource =
                                latexSource,
                            ModelName =
                                modelName,
                            PromptVersion =
                                promptVersion,
                            TemplateVersion =
                                templateVersion,
                            ConvertedAt =
                                convertedAt,
                            RenderedAt =
                                renderedAt,
                            UpdatedAt =
                                DateTimeOffset.UtcNow
                        };

                    db.NotePdfGenerationArtifacts
                        .Add(artifact);

                    submission
                        .PdfGenerationArtifact =
                            artifact;
                }
                else
                {
                    artifact
                        .SourceDocumentSha256 =
                            sourceDocumentSha256;

                    artifact.DocumentModelJson =
                        documentModelJson;

                    artifact.LatexSource =
                        latexSource;

                    artifact.ModelName =
                        modelName;

                    artifact.PromptVersion =
                        promptVersion;

                    artifact.TemplateVersion =
                        templateVersion;

                    artifact.ConvertedAt =
                        convertedAt;

                    artifact.RenderedAt =
                        renderedAt;

                    artifact.UpdatedAt =
                        DateTimeOffset.UtcNow;
                }

                await db.SaveChangesAsync(
                    cancellationToken);
            }

            /*
             * LaTeX kaynağı izole geçici klasörde
             * gerçek PDF dosyasına dönüştürülür.
             */
            var compilationResult =
                await pdfCompiler.CompileAsync(
                    new LatexPdfCompilationInput(
                        submission.Id,
                        latexSource),
                    cancellationToken);

            await using var generatedDocument =
                new MemoryStream(
                    compilationResult.PdfBytes,
                    writable:
                        false);

            /*
             * Yeni PDF önce storage'a yazılır.
             * Veritabanı güncellenemezse bu dosya
             * catch bloğunda temizlenecektir.
             */
            newlyGeneratedPath =
                await storage.SaveGeneratedAsync(
                    submission.Id,
                    generatedDocument,
                    cancellationToken);

            var previousGeneratedPath =
                submission.GeneratedPdfBlobPath;

            submission.GeneratedPdfBlobPath =
                newlyGeneratedPath;

            submission.PdfGeneratedAt =
                compilationResult.CompiledAt;

            submission.PdfGenerationModelName =
                modelName;

            submission.PdfConversionPromptVersion =
                promptVersion;

            submission.PdfTemplateVersion =
                templateVersion;

            submission.PdfCompilerName =
                compilationResult.CompilerName;

            submission.PdfGenerationError =
                null;

            /*
             * Approved durumu yalnızca PDF
             * storage'a kaydedildikten sonra verilir.
             */
            submission.Status =
                NoteSubmissionStatus.Approved;

            await db.SaveChangesAsync(
                cancellationToken);

            /*
             * Yeniden üretim yapılmışsa eski PDF,
             * yeni kayıt başarıyla veritabanına
             * yazıldıktan sonra temizlenir.
             */
            if (
                !string.IsNullOrWhiteSpace(
                    previousGeneratedPath) &&
                !string.Equals(
                    previousGeneratedPath,
                    newlyGeneratedPath,
                    StringComparison.Ordinal)
            )
            {
                await TryDeleteOldDocumentAsync(
                    previousGeneratedPath);
            }

            return new NotePdfGenerationResult(
                submission.Id,
                newlyGeneratedPath,
                compilationResult
                    .PdfBytes
                    .Length,
                modelName,
                promptVersion,
                templateVersion,
                compilationResult.CompilerName,
                compilationResult.CompiledAt);
        }
        catch (OperationCanceledException)
            when (
                cancellationToken
                    .IsCancellationRequested
            )
        {
            /*
             * Uygulama kapanışı sırasında işlem
             * yarım kalırsa kayıt PdfGenerating
             * olarak bırakılır. Background service
             * sonraki başlangıçta tekrar kuyruğa alır.
             */
            if (
                !string.IsNullOrWhiteSpace(
                    newlyGeneratedPath)
            )
            {
                await TryDeleteNewDocumentAsync(
                    newlyGeneratedPath);
            }

            throw;
        }
        catch (Exception exception)
        {
            if (
                !string.IsNullOrWhiteSpace(
                    newlyGeneratedPath)
            )
            {
                await TryDeleteNewDocumentAsync(
                    newlyGeneratedPath);
            }

            await MarkGenerationFailedAsync(
                noteSubmissionId,
                exception);

            throw;
        }
    }

    private static string CalculateSha256(
        ReadOnlySpan<byte> bytes)
    {
        return Convert.ToHexString(
                SHA256.HashData(bytes))
            .ToLowerInvariant();
    }

    private async Task
        ValidateGenerationApprovalAsync(
            NoteSubmission submission,
            CancellationToken cancellationToken)
    {
        /*
         * Admin onayında ReviewedByUserId
         * dolu olacaktır.
         */
        if (
            submission.ReviewedByUserId
            is not null
        )
        {
            return;
        }

        /*
         * Admin onayı yoksa son AI incelemesinin
         * AutoApprove olması gerekir.
         */
        var latestDecision =
            await db.NoteAiReviews
                .AsNoTracking()
                .Where(
                    x =>
                        x.NoteSubmissionId ==
                            submission.Id)
                .OrderByDescending(
                    x => x.ReviewedAt)
                .Select(
                    x =>
                        (NoteReviewDecision?)
                            x.Decision)
                .FirstOrDefaultAsync(
                    cancellationToken);

        if (
            latestDecision !=
            NoteReviewDecision.AutoApprove
        )
        {
            throw new InvalidOperationException(
                "Not için geçerli AI otomatik onayı veya admin onayı bulunmuyor.");
        }
    }

    private async Task MarkGenerationFailedAsync(
        Guid noteSubmissionId,
        Exception exception)
    {
        var errorMessage =
            CreateErrorMessage(
                exception);

        try
        {
            /*
             * Takip edilen entity üzerinde başarısız
             * değişiklik kalmış olabileceği için
             * doğrudan güncellemeden önce temizlenir.
             */
            db.ChangeTracker.Clear();

            await db.NoteSubmissions
                .Where(
                    x =>
                        x.Id ==
                            noteSubmissionId &&
                        x.Status ==
                            NoteSubmissionStatus
                                .PdfGenerating)
                .ExecuteUpdateAsync(
                    setters =>
                        setters
                            .SetProperty(
                                x => x.Status,
                                NoteSubmissionStatus
                                    .PdfGenerationFailed)
                            .SetProperty(
                                x =>
                                    x.PdfGenerationError,
                                errorMessage),
                    CancellationToken.None);
        }
        catch (Exception updateException)
        {
            logger.LogError(
                updateException,
                "Başarısız PDF üretim durumu veritabanına yazılamadı. NoteSubmissionId: {NoteSubmissionId}",
                noteSubmissionId);
        }
    }

    private async Task TryDeleteNewDocumentAsync(
        string relativePath)
    {
        try
        {
            await storage.DeleteAsync(
                relativePath,
                CancellationToken.None);
        }
        catch (Exception cleanupException)
        {
            logger.LogWarning(
                cleanupException,
                "Başarısız PDF üretiminin yeni dosyası temizlenemedi. Path: {DocumentPath}",
                relativePath);
        }
    }

    private async Task TryDeleteOldDocumentAsync(
        string relativePath)
    {
        try
        {
            await storage.DeleteAsync(
                relativePath,
                CancellationToken.None);
        }
        catch (Exception cleanupException)
        {
            /*
             * Yeni PDF ve veritabanı kaydı
             * başarılı olduğundan eski dosyanın
             * temizlenememesi ana işlemi bozmaz.
             */
            logger.LogWarning(
                cleanupException,
                "Eski oluşturulmuş PDF temizlenemedi. Path: {DocumentPath}",
                relativePath);
        }
    }

    private static string CreateErrorMessage(
        Exception exception)
    {
        const int maximumLength =
            2000;

        var message =
            exception
                .GetBaseException()
                .Message
                .Replace(
                    '\r',
                    ' ')
                .Replace(
                    '\n',
                    ' ')
                .Trim();

        if (string.IsNullOrWhiteSpace(message))
        {
            message =
                "Bilinmeyen PDF üretim hatası.";
        }

        if (message.Length <= maximumLength)
        {
            return message;
        }

        return
            message[..maximumLength];
    }

    private static async Task<byte[]>
        ReadWithLimitAsync(
            Stream source,
            int maximumBytes,
            CancellationToken cancellationToken)
    {
        await using var target =
            new MemoryStream();

        var buffer =
            new byte[81920];

        while (
            target.Length <=
            maximumBytes
        )
        {
            var remaining =
                maximumBytes +
                1L -
                target.Length;

            var requested =
                (int)Math.Min(
                    buffer.Length,
                    remaining);

            if (requested <= 0)
            {
                break;
            }

            var read =
                await source.ReadAsync(
                    buffer.AsMemory(
                        0,
                        requested),
                    cancellationToken);

            if (read == 0)
            {
                break;
            }

            await target.WriteAsync(
                buffer.AsMemory(
                    0,
                    read),
                cancellationToken);
        }

        return target.ToArray();
    }
}
