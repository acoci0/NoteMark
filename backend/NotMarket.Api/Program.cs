using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading.RateLimiting;
using Amazon.Runtime;
using Amazon.S3;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using NotMarket.Api.Data;
using NotMarket.Api.Data.AcademicCatalog;
using NotMarket.Api.Services;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

/*
 * Yapılandırma seçenekleri
 */
builder.Services.Configure<AcademicCatalogImportOptions>(
    builder.Configuration.GetSection(
        AcademicCatalogImportOptions.SectionName));

builder.Services
    .AddOptions<NoteReviewOptions>()
    .Bind(
        builder.Configuration.GetSection(
            NoteReviewOptions.SectionName))
    .Validate(
        options =>
            options.AutoApproveThreshold
                is >= 0 and <= 100,
        "Otomatik onay sınırı 0-100 arasında olmalıdır.")
    .Validate(
        options =>
            options.Weights.Total == 100,
        "Not inceleme ağırlıklarının toplamı 100 olmalıdır.")
    .ValidateOnStart();

builder.Services
    .AddOptions<OpenAiOptions>()
    .Bind(
        builder.Configuration.GetSection(
            OpenAiOptions.SectionName))
    .Validate(
        options =>
            !string.IsNullOrWhiteSpace(
                options.ApiKey),
        "OpenAI API anahtarı tanımlı olmalıdır.")
    .Validate(
        options =>
            !string.IsNullOrWhiteSpace(
                options.Model),
        "OpenAI model adı tanımlı olmalıdır.")
    .Validate(
        options =>
            Uri.TryCreate(
                options.BaseUrl,
                UriKind.Absolute,
                out _),
        "OpenAI BaseUrl geçerli bir adres olmalıdır.")
    .Validate(
        options =>
            options.MaxOutputTokens > 0,
        "OpenAI çıktı token sınırı pozitif olmalıdır.")
    .Validate(
        options =>
            options.MaxDocumentBytes > 0,
        "OpenAI belge boyutu sınırı pozitif olmalıdır.")
    .ValidateOnStart();

builder.Services
    .AddOptions<NotePdfGenerationOptions>()
    .Bind(
        builder.Configuration.GetSection(
            NotePdfGenerationOptions
                .SectionName))
    .Validate(
        options =>
            !options.Enabled ||
            !string.IsNullOrWhiteSpace(
                options.Model),
        "PDF üretim modeli tanımlı olmalıdır.")
    .Validate(
        options =>
            !options.Enabled ||
            !string.IsNullOrWhiteSpace(
                options.CompilerPath),
        "LaTeX derleyici yolu tanımlı olmalıdır.")
    .Validate(
        options =>
            options.MaxOutputTokens > 0,
        "PDF içerik dönüşümü çıktı token sınırı pozitif olmalıdır.")
    .Validate(
        options =>
            options.TimeoutSeconds > 0,
        "PDF derleme zaman aşımı pozitif olmalıdır.")
    .Validate(
        options =>
            options.MaxSourceCharacters > 0,
        "Maksimum LaTeX kaynak uzunluğu pozitif olmalıdır.")
    .Validate(
        options =>
            options.MaxGeneratedPdfBytes > 0,
        "Maksimum oluşturulan PDF boyutu pozitif olmalıdır.")
    .Validate(
        options =>
            !string.IsNullOrWhiteSpace(
                options.TemplateVersion),
        "LaTeX şablon sürümü tanımlı olmalıdır.")
    .ValidateOnStart();

/*
 * Controller ve OpenAPI
 */
builder.Services.AddControllers();
builder.Services.AddOpenApi();

/*
 * Veritabanı
 */
var defaultConnectionString =
    builder.Configuration
        .GetConnectionString(
            "DefaultConnection")
    ??
    throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection tanımlı değil.");

if (!builder.Environment.IsDevelopment())
{
    var parsedConnectionString =
        new NpgsqlConnectionStringBuilder(
            defaultConnectionString);

    var usesDevelopmentDatabase =
        string.Equals(
            parsedConnectionString.Host,
            "localhost",
            StringComparison.OrdinalIgnoreCase) ||
        string.Equals(
            parsedConnectionString.Host,
            "127.0.0.1",
            StringComparison.OrdinalIgnoreCase) ||
        string.Equals(
            parsedConnectionString.Password,
            "notmarket_dev",
            StringComparison.Ordinal);

    if (usesDevelopmentDatabase)
    {
        throw new InvalidOperationException(
            "Production ortamında development veritabanı bağlantısı kullanılamaz.");
    }
}

builder.Services.AddDbContext<AppDbContext>(
    options =>
        options.UseNpgsql(
            defaultConnectionString));

/*
 * Akademik katalog servisleri
 */
builder.Services.AddScoped<AcademicCatalogLoader>();
builder.Services.AddScoped<AcademicCatalogValidator>();
builder.Services.AddScoped<AcademicCatalogImporter>();

/*
 * Uygulama servisleri
 */
builder.Services.AddScoped<
    ITokenService,
    TokenService>();

builder.Services.AddScoped<
    IAuditService,
    AuditService>();

/*
 * Belge saklama servisleri
 *
 * Development:
 * - local App_Data
 *
 * Production:
 * - private Supabase Storage bucket'ları
 */
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddSingleton<
        IVerificationDocumentStorage,
        LocalVerificationDocumentStorage>();

    builder.Services.AddSingleton<
        INoteDocumentStorage,
        LocalNoteDocumentStorage>();
}
else
{
    builder.Services
        .AddOptions<SupabaseStorageOptions>()
        .Bind(
            builder.Configuration.GetSection(
                SupabaseStorageOptions.SectionName))
        .Validate(
            options =>
                Uri.TryCreate(
                    options.Endpoint,
                    UriKind.Absolute,
                    out _),
            "Supabase Storage endpoint geçerli değildir.")
        .Validate(
            options =>
                !string.IsNullOrWhiteSpace(
                    options.Region),
            "Supabase Storage region tanımlı olmalıdır.")
        .Validate(
            options =>
                !string.IsNullOrWhiteSpace(
                    options.AccessKeyId),
            "Supabase Storage access key tanımlı olmalıdır.")
        .Validate(
            options =>
                !string.IsNullOrWhiteSpace(
                    options.SecretAccessKey),
            "Supabase Storage secret key tanımlı olmalıdır.")
        .Validate(
            options =>
                !string.IsNullOrWhiteSpace(
                    options.VerificationBucket),
            "Doğrulama belgesi bucket adı tanımlı olmalıdır.")
        .Validate(
            options =>
                !string.IsNullOrWhiteSpace(
                    options.NotesBucket),
            "Not belgesi bucket adı tanımlı olmalıdır.")
        .ValidateOnStart();

    builder.Services.AddSingleton<IAmazonS3>(
        serviceProvider =>
        {
            var options =
                serviceProvider
                    .GetRequiredService<
                        IOptions<SupabaseStorageOptions>>()
                    .Value;

            var credentials =
                new BasicAWSCredentials(
                    options.AccessKeyId,
                    options.SecretAccessKey);

            var configuration =
                new AmazonS3Config
                {
                    ServiceURL =
                        options.Endpoint.TrimEnd('/'),

                    AuthenticationRegion =
                        options.Region,

                    ForcePathStyle =
                        true,

                    RequestChecksumCalculation =
                        RequestChecksumCalculation
                            .WHEN_REQUIRED,

                    ResponseChecksumValidation =
                        ResponseChecksumValidation
                            .WHEN_REQUIRED
                };

            return new AmazonS3Client(
                credentials,
                configuration);
        });

    builder.Services.AddSingleton<
        SupabaseS3ObjectStore>();

    builder.Services.AddSingleton<
        IVerificationDocumentStorage,
        SupabaseVerificationDocumentStorage>();

    builder.Services.AddSingleton<
        INoteDocumentStorage,
        SupabaseNoteDocumentStorage>();
}

/*
 * AI not inceleme servisleri
 */
builder.Services.AddSingleton<
    NoteReviewScoreCalculator>();

builder.Services.AddHttpClient<
    INoteReviewService,
    OpenAiNoteReviewService>(
        (serviceProvider, client) =>
        {
            var openAiOptions =
                serviceProvider
                    .GetRequiredService<
                        IOptions<OpenAiOptions>>()
                    .Value;

            client.BaseAddress =
                new Uri(
                    openAiOptions.BaseUrl);

            client.Timeout =
                TimeSpan.FromMinutes(5);
        });

builder.Services.AddScoped<
    INoteReviewOrchestrator,
    NoteReviewOrchestrator>();

/*
 * AI inceleme kuyruğu uygulama boyunca
 * tek örnek olarak çalışır.
 */
builder.Services.AddSingleton<
    INoteReviewQueue,
    NoteReviewQueue>();

/*
 * Kuyruktaki notları arka planda işler.
 */
builder.Services.AddHostedService<
    NoteReviewBackgroundService>();

/*
 * OpenAI belge içerik dönüştürme servisi
 */
builder.Services.AddHttpClient<
    INoteContentConversionService,
    OpenAiNoteContentConversionService>(
        (serviceProvider, client) =>
        {
            var openAiOptions =
                serviceProvider
                    .GetRequiredService<
                        IOptions<OpenAiOptions>>()
                    .Value;

            client.BaseAddress =
                new Uri(
                    openAiOptions.BaseUrl);

            client.Timeout =
                TimeSpan.FromMinutes(10);
        });

/*
 * Güvenli LaTeX oluşturma ve PDF
 * derleme servisleri
 */
builder.Services.AddSingleton<
    LatexSecurityValidator>();

builder.Services.AddSingleton<
    ILatexDocumentRenderer,
    LatexDocumentRenderer>();

builder.Services.AddSingleton<
    ILatexPdfCompiler,
    TectonicLatexPdfCompiler>();

/*
 * PDF üretim orchestrator'ı her işlemde
 * yeni DbContext kullanabilmek için scoped
 * olarak kaydedilir.
 */
builder.Services.AddScoped<
    INotePdfGenerationOrchestrator,
    NotePdfGenerationOrchestrator>();

/*
 * PDF üretim kuyruğu uygulama boyunca
 * tek örnek olarak çalışır.
 */
builder.Services.AddSingleton<
    INotePdfGenerationQueue,
    NotePdfGenerationQueue>();

/*
 * PDF üretim kuyruğunu arka planda işler.
 */
builder.Services.AddHostedService<
    NotePdfGenerationBackgroundService>();

/*
 * Rate limiter
 */
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy(
        "AnalyticsVisits",
        httpContext =>
        {
            var partitionKey =
                httpContext.Connection
                    .RemoteIpAddress
                    ?.ToString() ??
                "unknown";

            return RateLimitPartition
                .GetFixedWindowLimiter(
                    partitionKey,
                    _ =>
                        new FixedWindowRateLimiterOptions
                        {
                            PermitLimit =
                                60,

                            Window =
                                TimeSpan.FromMinutes(1),

                            QueueLimit =
                                0,

                            AutoReplenishment =
                                true
                        });
        });
});

/*
 * JWT yapılandırması
 */
var jwtKey =
    builder.Configuration["Jwt:Key"]
    ??
    throw new InvalidOperationException(
        "Jwt:Key tanımlı değil.");

if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
{
    throw new InvalidOperationException(
        "Jwt:Key en az 32 byte uzunluğunda olmalıdır.");
}

if (
    !builder.Environment.IsDevelopment() &&
    string.Equals(
        jwtKey,
        "NOTMARKET-DEV-KEY-CHANGE-THIS-AT-LEAST-32-CHARS",
        StringComparison.Ordinal)
)
{
    throw new InvalidOperationException(
        "Production ortamında development JWT anahtarı kullanılamaz.");
}

builder.Services
    .AddAuthentication(
        JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer =
                    true,

                ValidIssuer =
                    builder.Configuration[
                        "Jwt:Issuer"],

                ValidateAudience =
                    true,

                ValidAudience =
                    builder.Configuration[
                        "Jwt:Audience"],

                ValidateLifetime =
                    true,

                ValidateIssuerSigningKey =
                    true,

                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(
                            jwtKey)),

                ClockSkew =
                    TimeSpan.FromMinutes(1)
            };
    });

/*
 * Yetkilendirme politikaları
 */
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(
        "AdminOnly",
        policy =>
            policy.RequireRole(
                "Admin"));

    options.AddPolicy(
        "StudentOnly",
        policy =>
            policy.RequireRole(
                "Student"));
});

/*
 * Development ortamında:
 * - localhost:5173
 * - 127.0.0.1:5173
 * - 192.168.x.x:5173
 * - 10.x.x.x:5173
 * - 172.16.x.x - 172.31.x.x:5173
 *
 * adreslerinden gelen frontend isteklerine
 * izin verir.
 */
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "Frontend",
        policy =>
        {
            if (builder.Environment.IsDevelopment())
            {
                policy
                    .SetIsOriginAllowed(
                        IsAllowedDevelopmentOrigin)
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            }
            else
            {
                var allowedOrigins =
                    builder.Configuration
                        .GetSection(
                            "Cors:AllowedOrigins")
                        .Get<string[]>() ??
                    [];

                policy
                    .WithOrigins(
                        allowedOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            }
        });
});

var app = builder.Build();

/*
 * HTTP pipeline
 */
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHttpsRedirection();
}

app.UseRouting();
app.UseCors("Frontend");
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet(
    "/health",
    () =>
        Results.Ok(
            new
            {
                status = "ok"
            }))
    .AllowAnonymous();

app.MapControllers();

/*
 * Migration, seed ve akademik katalog
 * başlangıç işlemleri
 */
await using (var scope =
    app.Services.CreateAsyncScope())
{
    var db =
        scope.ServiceProvider
            .GetRequiredService<AppDbContext>();

    var migrateOnStartup =
        app.Environment.IsDevelopment() ||
        app.Configuration.GetValue<bool>(
            "DatabaseInitialization:MigrateOnStartup");

    if (migrateOnStartup)
    {
        await db.Database.MigrateAsync();
    }

    await DbSeeder.SeedAsync(
        db,
        builder.Configuration,
        app.Environment);

    if (
        app.Configuration.GetValue<bool>(
            "AcademicCatalog:ImportOnStartup")
    )
    {
        var importer =
            scope.ServiceProvider
                .GetRequiredService<
                    AcademicCatalogImporter>();

        var importResult =
            await importer.ImportAsync();

        app.Logger.LogInformation(
            "Academic catalog startup import tamamlandı. " +
            "Version: {CatalogVersion}, " +
            "DryRun: {DryRun}, " +
            "DatabaseModified: {DatabaseModified}, " +
            "UniversitiesAdded: {UniversitiesAdded}, " +
            "UnitsAdded: {UnitsAdded}, " +
            "ProgramsAdded: {ProgramsAdded}",
            importResult.CatalogVersion,
            importResult.DryRun,
            importResult.DatabaseModified,
            importResult.UniversitiesAdded,
            importResult.UnitsAdded,
            importResult.ProgramsAdded);
    }
}

app.Run();

static bool IsAllowedDevelopmentOrigin(
    string origin)
{
    if (
        !Uri.TryCreate(
            origin,
            UriKind.Absolute,
            out var uri)
    )
    {
        return false;
    }

    var isHttp =
        string.Equals(
            uri.Scheme,
            Uri.UriSchemeHttp,
            StringComparison.OrdinalIgnoreCase);

    var isHttps =
        string.Equals(
            uri.Scheme,
            Uri.UriSchemeHttps,
            StringComparison.OrdinalIgnoreCase);

    if (!isHttp && !isHttps)
    {
        return false;
    }

    /*
     * Vite geliştirme sunucusunun portu.
     */
    if (uri.Port != 5173)
    {
        return false;
    }

    if (
        string.Equals(
            uri.Host,
            "localhost",
            StringComparison.OrdinalIgnoreCase)
    )
    {
        return true;
    }

    if (uri.Host is "127.0.0.1" or "::1")
    {
        return true;
    }

    if (
        !IPAddress.TryParse(
            uri.Host,
            out var ip)
    )
    {
        return false;
    }

    if (
        ip.AddressFamily !=
        AddressFamily.InterNetwork
    )
    {
        return false;
    }

    var bytes =
        ip.GetAddressBytes();

    /*
     * 10.0.0.0/8
     */
    if (bytes[0] == 10)
    {
        return true;
    }

    /*
     * 172.16.0.0/12
     */
    if (
        bytes[0] == 172 &&
        bytes[1] >= 16 &&
        bytes[1] <= 31
    )
    {
        return true;
    }

    /*
     * 192.168.0.0/16
     */
    return
        bytes[0] == 192 &&
        bytes[1] == 168;
}