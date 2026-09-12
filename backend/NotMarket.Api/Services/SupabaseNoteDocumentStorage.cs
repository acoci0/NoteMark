using Microsoft.Extensions.Options;

namespace NotMarket.Api.Services;

public sealed class SupabaseNoteDocumentStorage(
    SupabaseS3ObjectStore objectStore,
    IOptions<SupabaseStorageOptions> options)
    : INoteDocumentStorage
{
    private readonly string _bucket =
        options.Value.NotesBucket;

    public async Task<string> SaveOriginalAsync(
        Guid sellerId,
        IFormFile file,
        CancellationToken cancellationToken)
    {
        var now =
            DateTime.UtcNow;

        var key =
            "original/" +
            $"{sellerId:D}/" +
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

    public async Task<string> SaveGeneratedAsync(
        Guid noteSubmissionId,
        Stream content,
        CancellationToken cancellationToken)
    {
        if (content.CanSeek)
        {
            content.Position = 0;
        }

        var key =
            "generated/" +
            $"{noteSubmissionId:D}/" +
            $"{Guid.NewGuid():N}.pdf";

        await objectStore.PutAsync(
            _bucket,
            key,
            content,
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
