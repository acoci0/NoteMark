using Npgsql;
using Microsoft.AspNetCore.RateLimiting;
using System.Net.Mail;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NotMarket.Api.Contracts;
using NotMarket.Api.Data;
using NotMarket.Api.Domain;
using NotMarket.Api.Services;

namespace NotMarket.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    AppDbContext db,
    ITokenService tokenService) : ControllerBase
{
    [HttpPost("student/register")]
    [EnableRateLimiting("StudentRegistration")]
    public async Task<IActionResult> StudentRegister(
        [FromBody] StudentRegisterRequest request,
        CancellationToken cancellationToken)
    {
        var firstName = request.FirstName?.Trim() ?? string.Empty;
        var lastName = request.LastName?.Trim() ?? string.Empty;
        var email = request.Email?.Trim().ToLowerInvariant() ?? string.Empty;
        var password = request.Password ?? string.Empty;
        var confirmPassword = request.ConfirmPassword ?? string.Empty;
        var displayName = $"{firstName} {lastName}";

        if (!request.InformationConfirmed || !request.PrivacyNoticeAcknowledged)
            return BadRequest(new { message = "Kayıt için her iki bilgilendirme onayı zorunludur." });

        if (firstName.Length is < 2 or > 40 ||
            lastName.Length is < 2 or > 40 ||
            displayName.Length > 80)
            return BadRequest(new { message = "Ad ve soyad 2-40 karakter olmalıdır." });

        if (email.Length is < 5 or > 160 ||
            !MailAddress.TryCreate(email, out var parsed) ||
            !string.Equals(parsed.Address, email, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Geçerli bir e-posta adresi girin." });

        if (password.Length is < 10 or > 128 ||
            !password.Any(char.IsUpper) ||
            !password.Any(char.IsLower) ||
            !password.Any(char.IsDigit))
            return BadRequest(new { message = "Şifre 10-128 karakter ve büyük harf, küçük harf, rakam içermelidir." });

        if (password != confirmPassword)
            return BadRequest(new { message = "Şifreler eşleşmiyor." });

        if (await db.Users.AnyAsync(x => x.Email == email, cancellationToken))
            return Conflict(new { message = "Bu e-posta adresiyle kayıtlı bir hesap var." });

        var student = new ApplicationUser
        {
            Email = email,
            DisplayName = displayName,
            PasswordHash = string.Empty,
            Role = UserRole.Student,
            Status = AccountStatus.Active
        };
        student.PasswordHash = new PasswordHasher<ApplicationUser>()
            .HashPassword(student, password);

        db.Users.Add(student);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (
            exception.InnerException is PostgresException { SqlState: "23505" })
        {
            return Conflict(new { message = "Bu e-posta adresiyle kayıtlı bir hesap var." });
        }

        return StatusCode(StatusCodes.Status201Created, new
        {
            message = "Hesap oluşturuldu. Giriş yapabilirsiniz."
        });
    }

    [HttpPost("admin/login")]
    public async Task<ActionResult<AdminLoginResponse>> AdminLogin(
        AdminLoginRequest request,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        var user = await db.Users.SingleOrDefaultAsync(
            x => x.Email == email,
            cancellationToken);

        if (user is null ||
            user.Role != UserRole.Admin ||
            user.Status != AccountStatus.Active)
        {
            return Unauthorized(new
            {
                message = "E-posta veya şifre hatalı."
            });
        }

        var hasher = new PasswordHasher<ApplicationUser>();
        var passwordResult = hasher.VerifyHashedPassword(
            user,
            user.PasswordHash,
            request.Password);

        if (passwordResult == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new
            {
                message = "E-posta veya şifre hatalı."
            });
        }

        user.LastLoginAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        var token = tokenService.CreateAdminToken(user);

        return Ok(new AdminLoginResponse(
            token.AccessToken,
            token.ExpiresAt,
            new AdminProfileDto(
                user.Id,
                user.Email,
                user.DisplayName,
                user.Role.ToString())));
    }
    [HttpPost("student/login")]
    public async Task<ActionResult<StudentLoginResponse>> StudentLogin(
        StudentLoginRequest request,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        var user = await db.Users.SingleOrDefaultAsync(
            x => x.Email == email,
            cancellationToken);

        if (user is null ||
            user.Role != UserRole.Student ||
            user.Status != AccountStatus.Active)
        {
            return Unauthorized(new
            {
                message = "E-posta veya şifre hatalı."
            });
        }

        var hasher = new PasswordHasher<ApplicationUser>();

        var passwordResult = hasher.VerifyHashedPassword(
            user,
            user.PasswordHash,
            request.Password);

        if (passwordResult == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new
            {
                message = "E-posta veya şifre hatalı."
            });
        }

        user.LastLoginAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(cancellationToken);

        var token = tokenService.CreateAdminToken(user);

        return Ok(new StudentLoginResponse(
            token.AccessToken,
            token.ExpiresAt,
            new StudentProfileDto(
                user.Id,
                user.Email,
                user.DisplayName,
                user.Role.ToString())));
    }
}
