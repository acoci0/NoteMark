using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NotMarket.Api.Contracts;
using NotMarket.Api.Data;

namespace NotMarket.Api.Controllers;

[ApiController]
[Route("api/admin/audit-logs")]
[Authorize(Policy = "AdminOnly")]
public sealed class AdminAuditLogsController(
    AppDbContext db) : ControllerBase
{
    private static readonly TimeZoneInfo TurkeyTimeZone =
        ResolveTurkeyTimeZone();

    [HttpGet]
    public async Task<ActionResult<AdminAuditLogPageDto>> Get(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? action = null,
        [FromQuery] string? entityType = null,
        [FromQuery] Guid? actorUserId = null,
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(
            page,
            1);

        pageSize = Math.Clamp(
            pageSize,
            1,
            100);

        /*
         * Filtre seçenekleri veritabanındaki
         * gerçek AuditLog değerlerinden üretilir.
         */
        var availableActions =
            await db.AuditLogs
                .AsNoTracking()
                .Select(x => x.Action)
                .Distinct()
                .OrderBy(x => x)
                .ToListAsync(
                    cancellationToken);

        var availableEntityTypes =
            await db.AuditLogs
                .AsNoTracking()
                .Select(x => x.EntityType)
                .Distinct()
                .OrderBy(x => x)
                .ToListAsync(
                    cancellationToken);

        /*
         * Actor için navigation olmadığı için
         * LEFT JOIN kullanıyoruz.
         */
        var query =
            from log in db.AuditLogs.AsNoTracking()
            join user in db.Users.AsNoTracking()
                on log.ActorUserId equals
                   (Guid?)user.Id
                into actorUsers
            from actor in actorUsers.DefaultIfEmpty()
            select new
            {
                Log = log,

                ActorDisplayName =
                    actor == null
                        ? null
                        : actor.DisplayName,

                ActorEmail =
                    actor == null
                        ? null
                        : actor.Email
            };

        if (
            !string.IsNullOrWhiteSpace(
                action)
        )
        {
            var normalizedAction =
                action.Trim();

            query =
                query.Where(
                    x =>
                        x.Log.Action ==
                        normalizedAction);
        }

        if (
            !string.IsNullOrWhiteSpace(
                entityType)
        )
        {
            var normalizedEntityType =
                entityType.Trim();

            query =
                query.Where(
                    x =>
                        x.Log.EntityType ==
                        normalizedEntityType);
        }

        if (
            actorUserId.HasValue)
        {
            query =
                query.Where(
                    x =>
                        x.Log.ActorUserId ==
                        actorUserId.Value);
        }

        /*
         * Kullanıcı tarihi Türkiye gününe göre seçer.
         *
         * Örnek:
         * 12 Ekim 00:00 Türkiye
         * =
         * 11 Ekim 21:00 UTC
         */
        if (
            from.HasValue)
        {
            var localStart =
                DateTime.SpecifyKind(
                    from.Value.ToDateTime(
                        TimeOnly.MinValue),
                    DateTimeKind.Unspecified);

            var utcStart =
                TimeZoneInfo.ConvertTimeToUtc(
                    localStart,
                    TurkeyTimeZone);

            var fromUtc =
                new DateTimeOffset(
                    utcStart);

            query =
                query.Where(
                    x =>
                        x.Log.CreatedAt >=
                        fromUtc);
        }

        /*
         * Bitiş günü tamamen dahil edilir.
         *
         * Seçilen günün ertesi günü
         * 00:00 Türkiye saati exclusive sınırdır.
         */
        if (
            to.HasValue)
        {
            var localEndExclusive =
                DateTime.SpecifyKind(
                    to.Value
                        .AddDays(1)
                        .ToDateTime(
                            TimeOnly.MinValue),
                    DateTimeKind.Unspecified);

            var utcEndExclusive =
                TimeZoneInfo.ConvertTimeToUtc(
                    localEndExclusive,
                    TurkeyTimeZone);

            var toExclusiveUtc =
                new DateTimeOffset(
                    utcEndExclusive);

            query =
                query.Where(
                    x =>
                        x.Log.CreatedAt <
                        toExclusiveUtc);
        }

        if (
            !string.IsNullOrWhiteSpace(
                search)
        )
        {
            var term =
                search
                    .Trim()
                    .ToLower();

            query =
                query.Where(
                    x =>
                        x.Log.Action
                            .ToLower()
                            .Contains(term) ||

                        x.Log.EntityType
                            .ToLower()
                            .Contains(term) ||

                        x.Log.EntityId
                            .ToLower()
                            .Contains(term) ||

                        (
                            x.Log.DetailsJson != null &&
                            x.Log.DetailsJson
                                .ToLower()
                                .Contains(term)
                        ) ||

                        (
                            x.ActorDisplayName != null &&
                            x.ActorDisplayName
                                .ToLower()
                                .Contains(term)
                        ) ||

                        (
                            x.ActorEmail != null &&
                            x.ActorEmail
                                .ToLower()
                                .Contains(term)
                        ));
        }

        var totalCount =
            await query.CountAsync(
                cancellationToken);

        var totalPages =
            totalCount == 0
                ? 0
                : (int)Math.Ceiling(
                    totalCount /
                    (double)pageSize);

        var items =
            await query
                .OrderByDescending(
                    x =>
                        x.Log.CreatedAt)
                .ThenByDescending(
                    x =>
                        x.Log.Id)
                .Skip(
                    (page - 1) *
                    pageSize)
                .Take(
                    pageSize)
                .Select(
                    x =>
                        new AdminAuditLogItemDto(
                            x.Log.Id,
                            x.Log.ActorUserId,
                            x.ActorDisplayName,
                            x.ActorEmail,
                            x.Log.Action,
                            x.Log.EntityType,
                            x.Log.EntityId,
                            x.Log.DetailsJson,
                            x.Log.CreatedAt))
                .ToListAsync(
                    cancellationToken);

        return Ok(
            new AdminAuditLogPageDto(
                page,
                pageSize,
                totalCount,
                totalPages,
                availableActions,
                availableEntityTypes,
                items));
    }

    private static TimeZoneInfo ResolveTurkeyTimeZone()
    {
        try
        {
            return TimeZoneInfo
                .FindSystemTimeZoneById(
                    "Europe/Istanbul");
        }
        catch (
            TimeZoneNotFoundException)
        {
            /*
             * Windows ortamları için fallback.
             */
            return TimeZoneInfo
                .FindSystemTimeZoneById(
                    "Turkey Standard Time");
        }
    }
}
