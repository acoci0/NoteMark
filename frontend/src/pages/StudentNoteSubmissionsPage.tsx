import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Download,
  FileText,
  Sparkles,
  XCircle,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  isAxiosError,
} from "axios";

import studentApi from "../api/studentClient";

import type {
  StudentNoteSubmission,
} from "../types";

type ApiErrorResponse = {
  message?: string;
};

export default function StudentNoteSubmissionsPage() {
  const [
    submissions,
    setSubmissions,
  ] = useState<StudentNoteSubmission[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    downloadingId,
    setDownloadingId,
  ] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } =
          await studentApi.get<
            StudentNoteSubmission[]
          >("/student/note-submissions");

        setSubmissions(data);
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
            "Gönderdiğiniz notlar yüklenemedi."
          )
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const downloadPdf = async (
    submission: StudentNoteSubmission
  ) => {
    setDownloadingId(submission.id);
    setError("");

    try {
      const response =
        await studentApi.get(
          `/student/note-submissions/${submission.id}/generated-document`,
          {
            responseType: "blob",
          }
        );

      const url =
        URL.createObjectURL(
          new Blob(
            [response.data],
            {
              type: "application/pdf",
            }
          )
        );

      const link =
        document.createElement("a");

      link.href = url;
      link.download =
        `notmark-${submission.id}.pdf`;

      document.body.appendChild(link);

      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "PDF indirilemedi."
        )
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="student-requests-page">
      <header className="student-requests-header">
        <div>
          <Link
            className="note-request-back"
            to="/student/profile"
          >
            <ChevronLeft size={17} />
            Öğrenci hesabına dön
          </Link>

          <span className="section-kicker">
            NOTMARK
          </span>

          <h1>
            Gönderdiğim Notlar
          </h1>

          <p>
            Talep panosuna gönderdiğiniz
            notların inceleme ve PDF
            üretim durumlarını takip edin.
          </p>
        </div>

        <Link
          className="primary-button"
          to="/student/marketplace"
        >
          Talep Panosuna Git
        </Link>
      </header>

      {error && (
        <div className="note-request-message note-request-message--error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="note-request-loading">
          Gönderilen notlar yükleniyor...
        </div>
      ) : submissions.length === 0 ? (
        <section className="student-requests-empty">
          <div className="student-requests-empty__icon">
            <FileText size={28} />
          </div>

          <h2>
            Henüz not göndermediniz
          </h2>

          <p>
            Talep Panosu'ndaki uygun
            taleplerden birine PDF
            gönderdiğinizde süreç burada
            görünecek.
          </p>

          <Link
            className="primary-button"
            to="/student/marketplace"
          >
            Talep Panosuna Git
          </Link>
        </section>
      ) : (
        <div className="student-request-list">
          {submissions.map(
            (submission) => {
              const status =
                getStatusInfo(
                  submission.status
                );

              const StatusIcon =
                status.icon;

              return (
                <article
                  className="student-request-card"
                  key={submission.id}
                >
                  <div className="student-request-card__top">
                    <div className="student-request-card__icon">
                      <FileText size={21} />
                    </div>

                    <div className="student-request-card__title">
                      <h2>
                        {submission.title}
                      </h2>

                      <p>
                        {submission.courseName}
                      </p>
                    </div>

                    <span
                      className={`note-submission-status ${status.className}`}
                    >
                      <StatusIcon size={14} />
                      {status.label}
                    </span>
                  </div>

                  <div className="student-request-card__academic">
                    <span>
                      {submission.universityName}
                    </span>

                    <span>
                      {submission.departmentName}
                    </span>
                  </div>

                  <div className="student-request-card__details">
                    <div>
                      <span>
                        AI puanı
                      </span>

                      <strong>
                        {submission.overallScore ??
                          "—"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Satış fiyatı
                      </span>

                      <strong>
                        {submission.salePrice != null
                          ? `${submission.salePrice} TL`
                          : "—"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        PDF üretim denemesi
                      </span>

                      <strong>
                        {
                          submission
                            .pdfGenerationAttemptCount
                        }
                      </strong>
                    </div>
                  </div>

                  {submission.pdfGenerationMessage && (
                    <div className="student-request-card__note">
                      <span>
                        PDF durumu
                      </span>

                      <p>
                        {
                          submission
                            .pdfGenerationMessage
                        }
                      </p>
                    </div>
                  )}

                  <div className="note-submission-footer">
                    <div>
                      <span>
                        Gönderim tarihi
                      </span>

                      <strong>
                        {formatDate(
                          submission.createdAt
                        )}
                      </strong>
                    </div>

                    {submission.generatedPdfAvailable && (
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={
                          downloadingId ===
                          submission.id
                        }
                        onClick={() =>
                          void downloadPdf(
                            submission
                          )
                        }
                      >
                        <Download size={17} />

                        {downloadingId ===
                        submission.id
                          ? "İndiriliyor..."
                          : "Oluşturulan PDF"}
                      </button>
                    )}
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

function getStatusInfo(
  status: string
) {
  switch (status) {
    case "Uploaded":
      return {
        label: "Yüklendi",
        className:
          "note-submission-status--pending",
        icon: FileText,
      };

    case "AiReview":
      return {
        label: "AI inceliyor",
        className:
          "note-submission-status--processing",
        icon: Sparkles,
      };

    case "ManualReview":
      return {
        label: "Manuel inceleme",
        className:
          "note-submission-status--warning",
        icon: AlertTriangle,
      };

    case "PdfGeneration":
    case "PdfGenerating":
      return {
        label: "PDF oluşturuluyor",
        className:
          "note-submission-status--processing",
        icon: Sparkles,
      };

    case "PdfGenerationFailed":
      return {
        label: "PDF üretilemedi",
        className:
          "note-submission-status--danger",
        icon: AlertTriangle,
      };

    case "Approved":
      return {
        label: "Onaylandı",
        className:
          "note-submission-status--approved",
        icon: CheckCircle2,
      };

    case "Rejected":
      return {
        label: "Reddedildi",
        className:
          "note-submission-status--danger",
        icon: XCircle,
      };

    default:
      return {
        label: status,
        className:
          "note-submission-status--pending",
        icon: FileText,
      };
  }
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(
    new Date(value)
  );
}

function getErrorMessage(
  error: unknown,
  fallback: string
) {
  if (
    isAxiosError<ApiErrorResponse>(
      error
    )
  ) {
    return (
      error.response?.data?.message ??
      fallback
    );
  }

  return fallback;
}
