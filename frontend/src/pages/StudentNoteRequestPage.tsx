import {
  BookOpen,
  ChevronLeft,
  FileText,
  GraduationCap,
  ListChecks,
  Send,
  Sparkles,
} from "lucide-react";

import {
  useEffect,
  useMemo,
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
  NoteRequestContentType,
  StudentNoteRequest,
  StudentVerificationItem,
} from "../types";

type ApiErrorResponse = {
  message?: string;
};

const QUESTION_COUNTS =
  [10, 15, 20, 25, 30] as const;

const CONTENT_OPTIONS: Array<{
  value: NoteRequestContentType;
  title: string;
  description: string;
}> = [
  {
    value: "NoteOnly",
    title: "Yalnızca ders notu",
    description:
      "Seçtiğiniz konuya ait doğrudan ders notunu isteyin.",
  },
  {
    value: "DetailedSummary",
    title: "Ders notunun detaylı özeti",
    description:
      "Konunun önemli noktalarının düzenli ve detaylı özetini isteyin.",
  },
  {
    value: "StudyQuestions",
    title:
      "Ders notuyla alakalı çalışma soruları",
    description:
      "Konuya yönelik çalışma ve tekrar soruları isteyin.",
  },
];

export default function StudentNoteRequestPage() {
  const [
    verifications,
    setVerifications,
  ] = useState<
    StudentVerificationItem[]
  >([]);

  const [
    verificationId,
    setVerificationId,
  ] = useState("");

  const [
    classLevel,
    setClassLevel,
  ] = useState(2);

  const [
    courseName,
    setCourseName,
  ] = useState("");

  const [
    topic,
    setTopic,
  ] = useState("");

  const [
    contentType,
    setContentType,
  ] =
    useState<NoteRequestContentType>(
      "NoteOnly"
    );

  const [
    questionCount,
    setQuestionCount,
  ] = useState(10);

  const [
    additionalNotes,
    setAdditionalNotes,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    createdRequest,
    setCreatedRequest,
  ] =
    useState<StudentNoteRequest | null>(
      null
    );

  /*
   * Kullanıcının yalnızca geçerli ve
   * onaylanmış öğrenci doğrulamalarını
   * talep formunda kullanılabilir yapar.
   */
  const approvedVerifications =
    useMemo(
      () =>
        verifications.filter(
          (item) => {
            if (
              item.status !==
              "Approved"
            ) {
              return false;
            }

            if (!item.expiresAt) {
              return true;
            }

            return (
              new Date(
                item.expiresAt
              ).getTime() >
              Date.now()
            );
          }
        ),
      [verifications]
    );

  const selectedVerification =
    approvedVerifications.find(
      (item) =>
        item.id === verificationId
    ) ?? null;

  /*
   * Kullanıcıya gösterilen fiyat yalnızca
   * tahmini ön izlemedir.
   *
   * Nihai fiyat aralığı backend tarafından
   * yeniden hesaplanır.
   */
  const priceRange =
    useMemo(() => {
      if (
        contentType ===
        "NoteOnly"
      ) {
        return {
          min: 90,
          max: 140,
        };
      }

      if (
        contentType ===
        "DetailedSummary"
      ) {
        return {
          min: 100,
          max: 150,
        };
      }

      const multiplier =
        questionCount === 10
          ? 1
          : questionCount === 15
            ? 1.1
            : questionCount === 20
              ? 1.2
              : questionCount === 25
                ? 1.3
                : 1.4;

      return {
        min: Math.round(
          90 * multiplier
        ),
        max: Math.round(
          140 * multiplier
        ),
      };
    }, [
      contentType,
      questionCount,
    ]);

  useEffect(() => {
    const load =
      async () => {
        setLoading(true);
        setError("");

        try {
          const { data } =
            await studentApi.get<
              StudentVerificationItem[]
            >(
              "/student/verifications"
            );

          setVerifications(
            data
          );

          const approved =
            data.filter(
              (item) => {
                if (
                  item.status !==
                  "Approved"
                ) {
                  return false;
                }

                if (
                  !item.expiresAt
                ) {
                  return true;
                }

                return (
                  new Date(
                    item.expiresAt
                  ).getTime() >
                  Date.now()
                );
              }
            );

          if (
            approved.length > 0
          ) {
            setVerificationId(
              approved[0].id
            );
          }
        } catch (requestError) {
          setError(
            getErrorMessage(
              requestError,
              "Öğrenci doğrulamaları yüklenemedi."
            )
          );
        } finally {
          setLoading(false);
        }
      };

    void load();
  }, []);

  const submit = async (
    event:
      FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setCreatedRequest(null);

    if (!verificationId) {
      setError(
        "Not talebi açmak için onaylanmış bir öğrenci doğrulaması seçmelisiniz."
      );

      return;
    }

    if (
      !courseName.trim()
    ) {
      setError(
        "Ders adını girin."
      );

      return;
    }

    if (!topic.trim()) {
      setError(
        "Dersin konusunu girin."
      );

      return;
    }

    setSubmitting(true);

    try {
      const { data } =
        await studentApi.post<
          StudentNoteRequest
        >(
          "/student/note-requests",
          {
            verificationId,
            classLevel,
            courseName:
              courseName.trim(),
            topic:
              topic.trim(),
            contentType,

            questionCount:
              contentType ===
              "StudyQuestions"
                ? questionCount
                : null,

            additionalNotes:
              additionalNotes
                .trim() ||
              null,
          }
        );

      setCreatedRequest(
        data
      );
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Not talebi oluşturulamadı."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="note-request-page">
        <div className="note-request-loading">
          Talep formu hazırlanıyor...
        </div>
      </div>
    );
  }

  return (
    <div className="note-request-page">
      <header className="note-request-header">
        <div>
          <Link
            className="note-request-back"
            to="/student/profile"
          >
            <ChevronLeft
              size={17}
            />

            Öğrenci hesabına dön
          </Link>

          <span className="section-kicker">
            NOTMARKET
          </span>

          <h1>
            Not İste
          </h1>

          <p>
            İhtiyacınız olan ders,
            konu ve içerik türünü
            belirleyerek talebinizi
            yayınlayın.
          </p>
        </div>

        <div className="note-request-header__icon">
          <BookOpen size={28} />
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

      {createdRequest && (
        <div
          className="note-request-success"
          role="status"
        >
          <div className="note-request-success__icon">
            <Sparkles size={22} />
          </div>

          <div>
            <strong>
              Talebiniz yayınlandı
            </strong>

            <p>
              {createdRequest.courseName}
              {" · "}
              {createdRequest.topic}
            </p>

            <span>
              Tahmini fiyat:{" "}
              {createdRequest
                .suggestedMinPrice}{" "}
              TL –{" "}
              {createdRequest
                .suggestedMaxPrice}{" "}
              TL
            </span>
          </div>
        </div>
      )}

      <form
        className="note-request-form"
        onSubmit={submit}
      >
        <section className="note-request-panel">
          <div className="note-request-panel__heading">
            <div className="note-request-step">
              1
            </div>

            <div>
              <h2>
                Akademik bilgiler
              </h2>

              <p>
                Talep yalnızca
                doğrulanmış üniversite
                ve bölümünüz için
                oluşturulabilir.
              </p>
            </div>
          </div>

          {approvedVerifications.length ===
          0 ? (
            <div className="note-request-warning">
              <GraduationCap
                size={20}
              />

              <div>
                <strong>
                  Onaylanmış öğrenci
                  doğrulaması bulunamadı.
                </strong>

                <p>
                  Talep açabilmek için
                  önce öğrenci
                  hesabınızdan bir
                  üniversite ve bölüm
                  doğrulaması
                  tamamlamalısınız.
                </p>
              </div>
            </div>
          ) : (
            <>
              <label className="note-request-field">
                <span>
                  Üniversite / bölüm
                </span>

                <select
                  value={
                    verificationId
                  }
                  onChange={(
                    event
                  ) =>
                    setVerificationId(
                      event.target
                        .value
                    )
                  }
                >
                  {approvedVerifications.map(
                    (item) => (
                      <option
                        key={
                          item.id
                        }
                        value={
                          item.id
                        }
                      >
                        {
                          item.universityName
                        }{" "}
                        ·{" "}
                        {
                          item.departmentName
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              {selectedVerification && (
                <div className="note-request-verification">
                  <div>
                    <span>
                      Üniversite
                    </span>

                    <strong>
                      {
                        selectedVerification
                          .universityName
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Fakülte /
                      akademik birim
                    </span>

                    <strong>
                      {
                        selectedVerification
                          .facultyName
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Bölüm
                    </span>

                    <strong>
                      {
                        selectedVerification
                          .departmentName
                      }
                    </strong>
                  </div>
                </div>
              )}

              <div className="note-request-grid">
                <label className="note-request-field">
                  <span>
                    Sınıf
                  </span>

                  <select
                    value={
                      classLevel
                    }
                    onChange={(
                      event
                    ) =>
                      setClassLevel(
                        Number(
                          event
                            .target
                            .value
                        )
                      )
                    }
                  >
                    {[
                      1,
                      2,
                      3,
                      4,
                      5,
                      6,
                    ].map(
                      (
                        level
                      ) => (
                        <option
                          key={
                            level
                          }
                          value={
                            level
                          }
                        >
                          {
                            level
                          }
                          . Sınıf
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label className="note-request-field">
                  <span>
                    Ders
                  </span>

                  <input
                    type="text"
                    maxLength={180}
                    value={
                      courseName
                    }
                    onChange={(
                      event
                    ) =>
                      setCourseName(
                        event.target
                          .value
                      )
                    }
                    placeholder="Örn. Analiz II"
                    required
                  />
                </label>
              </div>

              <label className="note-request-field">
                <span>
                  Dersin hangi konusu?
                </span>

                <input
                  type="text"
                  maxLength={180}
                  value={topic}
                  onChange={(
                    event
                  ) =>
                    setTopic(
                      event.target
                        .value
                    )
                  }
                  placeholder="Örn. İntegral Teknikleri"
                  required
                />
              </label>
            </>
          )}
        </section>

        <section className="note-request-panel">
          <div className="note-request-panel__heading">
            <div className="note-request-step">
              2
            </div>

            <div>
              <h2>
                İstediğiniz içerik
              </h2>

              <p>
                Bu konu için hangi
                türde materyale
                ihtiyacınız olduğunu
                seçin.
              </p>
            </div>
          </div>

          <div className="note-content-options">
            {CONTENT_OPTIONS.map(
              (option) => {
                const selected =
                  contentType ===
                  option.value;

                return (
                  <button
                    key={
                      option.value
                    }
                    className={
                      selected
                        ? "note-content-option note-content-option--selected"
                        : "note-content-option"
                    }
                    type="button"
                    onClick={() =>
                      setContentType(
                        option.value
                      )
                    }
                    aria-pressed={
                      selected
                    }
                  >
                    <div className="note-content-option__icon">
                      {option.value ===
                      "NoteOnly" ? (
                        <FileText
                          size={20}
                        />
                      ) : option.value ===
                        "DetailedSummary" ? (
                        <Sparkles
                          size={20}
                        />
                      ) : (
                        <ListChecks
                          size={20}
                        />
                      )}
                    </div>

                    <div>
                      <strong>
                        {
                          option.title
                        }
                      </strong>

                      <span>
                        {
                          option.description
                        }
                      </span>
                    </div>

                    <div
                      className={
                        selected
                          ? "note-content-option__radio note-content-option__radio--selected"
                          : "note-content-option__radio"
                      }
                    />
                  </button>
                );
              }
            )}
          </div>

          {contentType ===
            "StudyQuestions" && (
            <div className="question-count-section">
              <span className="question-count-label">
                Kaç çalışma sorusu
                istiyorsunuz?
              </span>

              <div className="question-count-options">
                {QUESTION_COUNTS.map(
                  (count) => (
                    <button
                      key={
                        count
                      }
                      className={
                        questionCount ===
                        count
                          ? "question-count-button question-count-button--selected"
                          : "question-count-button"
                      }
                      type="button"
                      onClick={() =>
                        setQuestionCount(
                          count
                        )
                      }
                    >
                      {count}
                    </button>
                  )
                )}
              </div>

              <small>
                Soru sayısı arttıkça
                tahmini fiyat aralığı
                da artar.
              </small>
            </div>
          )}

          <label className="note-request-field">
            <span>
              Ek açıklama
              <small>
                {" "}
                (isteğe bağlı)
              </small>
            </span>

            <textarea
              maxLength={600}
              rows={5}
              value={
                additionalNotes
              }
              onChange={(
                event
              ) =>
                setAdditionalNotes(
                  event.target
                    .value
                )
              }
              placeholder="Örn. Kısmi integrasyon ve belirli integral ağırlıklı olsun."
            />

            <small className="note-request-character-count">
              {
                additionalNotes.length
              }
              /600
            </small>
          </label>
        </section>

        <aside className="note-request-price-card">
          <div>
            <span>
              Tahmini fiyat aralığı
            </span>

            <strong>
              {priceRange.min} TL
              {" – "}
              {priceRange.max} TL
            </strong>
          </div>

          <p>
            Bu fiyat sistem
            tarafından seçtiğiniz
            içerik türü ve soru
            adedine göre hesaplanır.
            Nihai kontrol backend
            tarafından yapılır.
          </p>

          {contentType ===
            "StudyQuestions" && (
            <div className="note-request-price-meta">
              <ListChecks
                size={17}
              />

              {
                questionCount
              }{" "}
              çalışma sorusu
            </div>
          )}

          <button
            className="primary-button note-request-submit"
            type="submit"
            disabled={
              submitting ||
              approvedVerifications
                .length === 0
            }
          >
            <Send size={17} />

            {submitting
              ? "Yayınlanıyor..."
              : "Talebi Yayınla"}
          </button>
        </aside>
      </form>
    </div>
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
      error.response?.data
        ?.message ??
      fallback
    );
  }

  return fallback;
}
