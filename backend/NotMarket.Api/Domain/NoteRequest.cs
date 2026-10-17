using System.ComponentModel.DataAnnotations;

namespace NotMarket.Api.Domain;

public sealed class NoteRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid BuyerId { get; set; }

    [MaxLength(180)]
    public required string UniversityName { get; set; }

    [MaxLength(180)]
    public required string DepartmentName { get; set; }

    [MaxLength(180)]
    public required string CourseName { get; set; }

    public int ClassLevel { get; set; }

    /*
     * Talebin ders içerisindeki konusu.
     *
     * Legacy kayıtlarla uyumluluk amacıyla
     * nullable bırakılmıştır. Yeni oluşturulan
     * taleplerde zorunludur.
     */
    [MaxLength(180)]
    public string? Topic { get; set; }

    /*
     * Kullanıcının istediği içerik biçimi:
     *
     * - NoteOnly
     * - DetailedSummary
     * - StudyQuestions
     */
    public NoteRequestContentType?
        ContentType { get; set; }

    /*
     * Yalnızca StudyQuestions seçildiğinde
     * 10, 15, 20, 25 veya 30 olabilir.
     */
    public int? QuestionCount { get; set; }

    /*
     * Kullanıcının talebe eklediği
     * isteğe bağlı açıklama.
     */
    [MaxLength(600)]
    public string? AdditionalNotes { get; set; }

    [MaxLength(1400)]
    public required string CriteriaJson { get; set; }

    public decimal SuggestedMinPrice { get; set; }
    public decimal SuggestedMaxPrice { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<NoteSubmission> Submissions { get; set; } = [];
}
