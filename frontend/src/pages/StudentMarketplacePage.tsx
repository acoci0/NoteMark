import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  FileText,
  FileUp,
  ListChecks,
  Sparkles,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  isAxiosError,
} from "axios";

import studentApi from "../api/studentClient";

import type {
  MarketplaceNoteRequest,
  StudentNoteSubmissionCreated,
} from "../types";

type ApiErrorResponse = {
  message?: string;
};

export default function StudentMarketplacePage() {
  const [
    requests,
    setRequests,
  ] = useState<
    MarketplaceNoteRequest[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    selectedRequest,
    setSelectedRequest,
  ] =
    useState<MarketplaceNoteRequest | null>(
      null
    );

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    pdfFile,
    setPdfFile,
  ] = useState<File | null>(
    null
  );

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const load =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const { data } =
          await studentApi.get<
            MarketplaceNoteRequest[]
          >(
            "/student/note-requests/marketplace"
          );

        setRequests(data);
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
            "Talep panosu yüklenemedi."
          )
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openUpload = (
    request:
      MarketplaceNoteRequest
  ) => {
    if (
      request.hasActiveSubmission
    ) {
      return;
    }

    setSelectedRequest(
      request
    );

    setTitle(
      `${request.courseName} - ${request.topic}`
    );

    setPdfFile(null);
    setError("");
    setSuccess("");
  };

  const closeUpload = () => {
    if (submitting) {
      return;
    }

    setSelectedRequest(null);
    setTitle("");
    setPdfFile(null);
  };

  const submit = async (
    event:
      FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!selectedRequest) {
      return;
    }

    if (!title.trim()) {
      setError(
        "Not başlığını girin."
      );

      return;
    }

    if (!pdfFile) {
      setError(
        "Göndereceğiniz PDF dosyasını seçin."
      );

      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const formData =
        new FormData();

      formData.append(
        "RequestId",
        selectedRequest.id
      );

      formData.append(
        "Title",
        title.trim()
      );

      formData.append(
        "Document",
        pdfFile
      );

      const { data } =
        await studentApi.post<
          StudentNoteSubmissionCreated
        >(
          "/student/note-submissions",
          formData
        );

      setRequests(
        (current) =>
          current.map(
            (request) =>
              request.id ===
              selectedRequest.id
                ? {
                    ...request,
                    hasActiveSubmission:
                      true,
                  }
                : request
          )
      );

      setSuccess(
        `${selectedRequest.courseName} talebi için not gönderildi. Durum: ${data.status}. AI incelemesi arka planda başlayacak.`
      );

      setSelectedRequest(
        null
      );

      setTitle("");
      setPdfFile(null);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Not gönderilemedi."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="marketplace-page">
      <header className="marketplace-header">
        <div>
          <Link
            className="note-request-back"
            to="/student/profile"
          >
            <ChevronLeft size={17} />

            Öğrenci hesabına dön
          </Link>

          <span className="section-kicker">
            NOTMARKET
          </span>

          <h1>
            Talep Panosu
          </h1>

          <p>
            Doğrulanmış üniversite
            ve bölümünüzle eşleşen
            öğrencilerin not
            taleplerini görüntüleyin.
          </p>
        </div>

        <div className="marketplace-header__icon">
          <BookOpen size={27} />
        </div>
      </header>

      {error && (
        <div
          className="note-request-message note-request-message--error"
          role="alert"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="marketplace-success"
          role="status"
        >
          <CheckCircle2
            size={20}
          />

          {success}
        </div>
      )}

      {loading ? (
        <div className="note-request-loading">
          Talep panosu yükleniyor...
        </div>
      ) : requests.length === 0 ? (
        <section className="marketplace-empty">
          <BookOpen size={30} />

          <h2>
            Şu anda uygun talep yok
          </h2>

          <p>
            Onaylı üniversite ve
            bölümünüzle eşleşen yeni
            talepler burada
            görünecek.
          </p>
        </section>
      ) : (
        <section className="marketplace-grid">
          {requests.map(
            (request) => (
              <article
                className="marketplace-card"
                key={request.id}
              >
                <div className="marketplace-card__header">
                  <div className="marketplace-card__icon">
                    {request.contentType ===
                    "StudyQuestions" ? (
                      <ListChecks
                        size={20}
                      />
                    ) : request.contentType ===
                      "DetailedSummary" ? (
                      <Sparkles
                        size={20}
                      />
                    ) : (
                      <FileText
                        size={20}
                      />
                    )}
                  </div>

                  <div>
                    <h2>
                      {
                        request.courseName
                      }
                    </h2>

                    <p>
                      {request.topic}
                    </p>
                  </div>
                </div>

                <div className="marketplace-card__academic">
                  <span>
                    {
                      request.universityName
                    }
                  </span>

                  <span>
                    {
                      request.departmentName
                    }
                  </span>

                  <span>
                    {
                      request.classLevel
                    }
                    . Sınıf
                  </span>
                </div>

                <div className="marketplace-card__content">
                  <span>
                    İstenen içerik
                  </span>

                  <strong>
                    {getContentTypeLabel(
                      request.contentType
                    )}
                  </strong>

                  {request.questionCount && (
                    <small>
                      {
                        request.questionCount
                      }{" "}
                      çalışma sorusu
                    </small>
                  )}
                </div>

                {request.additionalNotes && (
                  <div className="marketplace-card__note">
                    <span>
                      Ek açıklama
                    </span>

                    <p>
                      {
                        request.additionalNotes
                      }
                    </p>
                  </div>
                )}

                <div className="marketplace-card__footer">
                  <div>
                    <span>
                      Tahmini fiyat
                    </span>

                    <strong>
                      {
                        request.suggestedMinPrice
                      }{" "}
                      –{" "}
                      {
                        request.suggestedMaxPrice
                      }{" "}
                      TL
                    </strong>
                  </div>

                  <button
                    className={
                      request.hasActiveSubmission
                        ? "secondary-button marketplace-submit-button"
                        : "primary-button marketplace-submit-button"
                    }
                    type="button"
                    disabled={
                      request.hasActiveSubmission
                    }
                    onClick={() =>
                      openUpload(
                        request
                      )
                    }
                  >
                    {request.hasActiveSubmission ? (
                      <>
                        <CheckCircle2
                          size={17}
                        />
                        Not gönderildi
                      </>
                    ) : (
                      <>
                        <FileUp
                          size={17}
                        />
                        Not Gönder
                      </>
                    )}
                  </button>
                </div>
              </article>
            )
          )}
        </section>
      )}

      {selectedRequest && (
        <div
          className="marketplace-modal-backdrop"
          role="presentation"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeUpload();
            }
          }}
        >
          <form
            className="marketplace-upload-modal"
            onSubmit={submit}
          >
            <div className="marketplace-upload-modal__header">
              <div>
                <span className="section-kicker">
                  NOT GÖNDER
                </span>

                <h2>
                  {
                    selectedRequest.courseName
                  }
                </h2>

                <p>
                  {
                    selectedRequest.topic
                  }
                </p>
              </div>

              <button
                className="marketplace-modal-close"
                type="button"
                onClick={
                  closeUpload
                }
                disabled={
                  submitting
                }
                aria-label="Kapat"
              >
                <X size={19} />
              </button>
            </div>

            <div className="marketplace-upload-summary">
              <div>
                <span>
                  İçerik
                </span>

                <strong>
                  {getContentTypeLabel(
                    selectedRequest
                      .contentType
                  )}
                </strong>
              </div>

              {selectedRequest
                .questionCount && (
                <div>
                  <span>
                    Soru sayısı
                  </span>

                  <strong>
                    {
                      selectedRequest
                        .questionCount
                    }
                  </strong>
                </div>
              )}

              <div>
                <span>
                  Fiyat aralığı
                </span>

                <strong>
                  {
                    selectedRequest
                      .suggestedMinPrice
                  }{" "}
                  –{" "}
                  {
                    selectedRequest
                      .suggestedMaxPrice
                  }{" "}
                  TL
                </strong>
              </div>
            </div>

            <label className="note-request-field">
              <span>
                Not başlığı
              </span>

              <input
                type="text"
                maxLength={220}
                value={title}
                onChange={(
                  event
                ) =>
                  setTitle(
                    event.target
                      .value
                  )
                }
                required
              />
            </label>

            <label className="marketplace-file-field">
              <span>
                PDF dosyası
              </span>

              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(
                  event
                ) =>
                  setPdfFile(
                    event.target
                      .files?.[0] ??
                      null
                  )
                }
                required
              />

              <small>
                Yalnızca gerçek PDF
                dosyaları kabul edilir.
                Dosya private storage
                alanına yüklenir.
              </small>
            </label>

            {pdfFile && (
              <div className="marketplace-selected-file">
                <FileText
                  size={18}
                />

                <div>
                  <strong>
                    {pdfFile.name}
                  </strong>

                  <span>
                    {formatFileSize(
                      pdfFile.size
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="marketplace-upload-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={
                  closeUpload
                }
                disabled={
                  submitting
                }
              >
                Vazgeç
              </button>

              <button
                className="primary-button"
                type="submit"
                disabled={
                  submitting
                }
              >
                <FileUp size={17} />

                {submitting
                  ? "Gönderiliyor..."
                  : "PDF'yi Gönder"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function getContentTypeLabel(
  contentType: string
) {
  switch (contentType) {
    case "NoteOnly":
      return "Yalnızca ders notu";

    case "DetailedSummary":
      return "Ders notunun detaylı özeti";

    case "StudyQuestions":
      return "Çalışma soruları";

    default:
      return contentType;
  }
}

function formatFileSize(
  bytes: number
) {
  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(1)} MB`;
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
      error.response?.data
        ?.message ??
      fallback
    );
  }

  return fallback;
}
