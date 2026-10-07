namespace NotMarket.Api.Contracts;

public sealed record CreateNoteRequestRequest(
    Guid VerificationId,
    int ClassLevel,
    string CourseName,
    string Topic,
    string ContentType,
    int? QuestionCount,
    string? AdditionalNotes);

public sealed record NoteRequestResponse(
    Guid Id,
    string UniversityName,
    string DepartmentName,
    string CourseName,
    int ClassLevel,
    string Topic,
    string ContentType,
    int? QuestionCount,
    string? AdditionalNotes,
    decimal SuggestedMinPrice,
    decimal SuggestedMaxPrice,
    DateTimeOffset CreatedAt);
