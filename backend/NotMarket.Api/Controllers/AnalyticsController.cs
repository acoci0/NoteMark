using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using NotMarket.Api.Contracts;
using NotMarket.Api.Data;
using NotMarket.Api.Domain;

namespace NotMarket.Api.Controllers;

[ApiController]
[Route("api/analytics")]
public sealed class AnalyticsController(AppDbContext db)
    : ControllerBase
{
    [AllowAnonymous]
    [EnableRateLimiting("AnalyticsVisits")]
    [HttpPost("visits")]
    public async Task<IActionResult> TrackVisit(
        TrackSiteVisitRequest request,
        CancellationToken cancellationToken)
    {
        var sessionId = request.SessionId?.Trim();
        var path = request.Path?.Trim();

        if (
            string.IsNullOrWhiteSpace(sessionId) ||
            sessionId.Length is < 16 or > 200)
        {
            return BadRequest(new
            {
                message = "Geçerli bir oturum kimliği gereklidir."
            });
        }

        if (
            string.IsNullOrWhiteSpace(path) ||
            !path.StartsWith('/') ||
            path.Length > 300)
        {
            return BadRequest(new
            {
                message = "Geçerli bir sayfa yolu gereklidir."
            });
        }

        var sessionHash = Convert.ToHexString(
            SHA256.HashData(
                Encoding.UTF8.GetBytes(sessionId)))
            .ToLowerInvariant();

        var now = DateTimeOffset.UtcNow;
        var duplicateCutoff = now.AddSeconds(-30);

        var duplicateExists =
            await db.SiteVisits.AnyAsync(
                x =>
                    x.SessionHash == sessionHash &&
                    x.Path == path &&
                    x.VisitedAt >= duplicateCutoff,
                cancellationToken);

        if (duplicateExists)
        {
            return NoContent();
        }

        db.SiteVisits.Add(new SiteVisit
        {
            SessionHash = sessionHash,
            Path = path,
            VisitedAt = now
        });

        await db.SaveChangesAsync(cancellationToken);

        return Accepted();
    }

    /*
     * Öğrenci panelinde son 90 saniye içinde
     * heartbeat gönderen benzersiz oturumları
     * aktif kabul eder.
     */
    [AllowAnonymous]
    [HttpGet("active-students")]
    public async Task<IActionResult> GetActiveStudents(
        CancellationToken cancellationToken)
    {
        var cutoff =
            DateTimeOffset.UtcNow
                .AddSeconds(-90);

        var activeCount =
            await db.SiteVisits
                .Where(
                    x =>
                        x.VisitedAt >= cutoff &&
                        x.Path.StartsWith(
                            "/student/") &&
                        x.Path !=
                            "/student/login")
                .Select(
                    x => x.SessionHash)
                .Distinct()
                .CountAsync(
                    cancellationToken);

        return Ok(new
        {
            activeCount,
            windowSeconds = 90
        });
    }

}
