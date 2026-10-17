namespace NotMarket.Api.Services;

public sealed class SupabaseStorageOptions
{
    public const string SectionName =
        "SupabaseStorage";

    public string Endpoint { get; set; } =
        string.Empty;

    public string Region { get; set; } =
        string.Empty;

    public string AccessKeyId { get; set; } =
        string.Empty;

    public string SecretAccessKey { get; set; } =
        string.Empty;

    public string VerificationBucket { get; set; } =
        "student-verification";

    public string NotesBucket { get; set; } =
        "note-documents";
}
