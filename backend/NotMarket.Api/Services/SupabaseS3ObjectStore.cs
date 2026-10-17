using System.Net;
using Amazon.S3;
using Amazon.S3.Model;

namespace NotMarket.Api.Services;

public sealed class SupabaseS3ObjectStore(
    IAmazonS3 s3)
{
    public async Task PutAsync(
        string bucket,
        string key,
        Stream content,
        CancellationToken cancellationToken)
    {
        ValidateBucket(bucket);
        ValidateKey(key);

        var request =
            new PutObjectRequest
            {
                BucketName = bucket,
                Key = key,
                InputStream = content,
                ContentType = "application/pdf",
                AutoCloseStream = false,
                AutoResetStreamPosition = false
            };

        await s3.PutObjectAsync(
            request,
            cancellationToken);
    }

    public async Task<Stream?> OpenReadAsync(
        string bucket,
        string key,
        CancellationToken cancellationToken)
    {
        ValidateBucket(bucket);

        if (!TryValidateKey(key))
        {
            return null;
        }

        try
        {
            using var response =
                await s3.GetObjectAsync(
                    new GetObjectRequest
                    {
                        BucketName = bucket,
                        Key = key
                    },
                    cancellationToken);

            var memory =
                new MemoryStream();

            await response.ResponseStream.CopyToAsync(
                memory,
                cancellationToken);

            memory.Position = 0;

            return memory;
        }
        catch (AmazonS3Exception exception)
            when (
                exception.StatusCode ==
                HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task DeleteAsync(
        string bucket,
        string key,
        CancellationToken cancellationToken)
    {
        ValidateBucket(bucket);

        if (string.IsNullOrWhiteSpace(key))
        {
            return;
        }

        ValidateKey(key);

        await s3.DeleteObjectAsync(
            new DeleteObjectRequest
            {
                BucketName = bucket,
                Key = key
            },
            cancellationToken);
    }

    private static void ValidateBucket(
        string bucket)
    {
        if (string.IsNullOrWhiteSpace(bucket))
        {
            throw new InvalidOperationException(
                "Supabase Storage bucket adı boş olamaz.");
        }
    }

    private static bool TryValidateKey(
        string key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return false;
        }

        if (
            key.StartsWith('/') ||
            key.Contains('\\'))
        {
            return false;
        }

        var segments =
            key.Split(
                '/',
                StringSplitOptions.RemoveEmptyEntries);

        if (segments.Length == 0)
        {
            return false;
        }

        return !segments.Any(
            segment =>
                segment is "." or "..");
    }

    private static void ValidateKey(
        string key)
    {
        if (!TryValidateKey(key))
        {
            throw new InvalidOperationException(
                "Geçersiz Supabase Storage nesne yolu.");
        }
    }
}
