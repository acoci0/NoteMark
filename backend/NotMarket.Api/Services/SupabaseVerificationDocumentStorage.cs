using Microsoft.Extensions.Options;

namespace NotMarket.Api.Services;

public sealed class SupabaseVerificationDocumentStorage(
    SupabaseS3ObjectStore objectStore,
    IOptions<SupabaseStorageOptions> options)
    : IVerificationDocumentStorage
{
    private readonly string _bucket =
        options.Value.VerificationBucket;

    public async Task<string> SaveAsync(
        Guid userId,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        var now =
            DateTime.UtcNow;

        var key =
            $"{userId:D}/" +
            $"{now:yyyy}/" +
            $"{now:MM}/" +
            $"{Guid.NewGuid():N}.pdf";

        await using var stream =
            file.OpenReadStream();

        await objectStore.PutAsync(
            _bucket,
            key,
            stream,
            cancellationToken);

        return key;
    }

    public Task<Stream?> OpenReadAsync(
        string relativePath,
        CancellationToken cancellationToken)
    {
        return objectStore.OpenReadAsync(
            _bucket,
            relativePath,
            cancellationToken);
    }

    public Task DeleteAsync(
        string relativePath,
        CancellationToken cancellationToken)
    {
        return objectStore.DeleteAsync(
            _bucket,
            relativePath,
            cancellationToken);
    }
}
