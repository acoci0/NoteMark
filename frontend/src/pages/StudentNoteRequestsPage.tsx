import {
  BookOpen,
  CalendarDays,
  FileText,
  GraduationCap,
  ListChecks,
  MessageSquareText,
  Plus,
  Sparkles,
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
  StudentNoteRequest,
} from "../types";

type ApiErrorResponse = {
  message?: string;
};

export default function StudentNoteRequestsPage() {
  const [
    requests,
    setRequests,
  ] =
    useState<StudentNoteRequest[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const { data } =
          await studentApi.get<
            StudentNoteRequest[]
          >(
            "/student/note-requests/mine"
          );

        setRequests(data);
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
            "Not talepleri yüklenemedi."
          )
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <div className="student-requests-page">
      <header className="student-requests-header">
        <div>
          <span className="section-kicker">
            NOTMARK
          </span>

          <div className="student-requests-title-row">
            <h1>
              Taleplerim
            </h1>

            {!loading && (
              <span className="student-request-count">
                {requests.length} talep
              </span>
            )}
          </div>

          <p>
            Yayınladığınız not taleplerini
            ve talep ayrıntılarını buradan
            görüntüleyebilirsiniz.
          </p>
        </div>

        <Link
          className="primary-button student-request-new-button"
          to="/student/note-requests/new"
        >
          <Plus size={17} />
          Yeni Not İste
        </Link>
      </header>

      {error && (
        <div className="note-request-message note-request-message--error">
          {error}
        </div>
      )}

      {requests.length === 0 ? (
        <section className="student-requests-empty">
          <div className="student-requests-empty__icon">
            <BookOpen size={28} />
          </div>

          <h2>
            Henüz not talebiniz yok
          </h2>

          <p>
            İhtiyacınız olan ders ve
            konuyu belirleyerek ilk
            talebinizi yayınlayabilirsiniz.
          </p>

          <Link
            className="primary-button"
            to="/student/note-requests/new"
          >
            <Plus size={17} />
            Not İste
          </Link>
        </section>
      ) : (
        <div className="student-request-list">
          {requests.map(
            (request) => (
              <article
                className="student-request-card"
                key={request.id}
              >
                <div className="student-request-card__accent" />

                <div className="student-request-card__top">
                  <div className="student-request-card__icon">
                    {request.contentType ===
                    "StudyQuestions" ? (
                      <ListChecks
                        size={22}
                      />
                    ) : request.contentType ===
                      "DetailedSummary" ? (
                      <Sparkles
                        size={22}
                      />
                    ) : (
                      <FileText
                        size={22}
                      />
                    )}
                  </div>

                  <div className="student-request-card__title">
                    <h2>
                      {request.courseName}
                    </h2>

                    <p>
                      {request.topic}
                    </p>
                  </div>

                  <div className="student-request-card__price">
                    <span>
                      Önerilen fiyat
                    </span>

                    <strong>
                      {request.suggestedMinPrice}
                      {" – "}
                      {request.suggestedMaxPrice}
                      {" TL"}
                    </strong>
                  </div>
                </div>

                <div className="student-request-card__academic">
                  <span>
                    <GraduationCap size={14} />
                    {request.universityName}
                  </span>

                  <span>
                    {request.departmentName}
                  </span>

                  <span>
                    {request.classLevel}. Sınıf
                  </span>
                </div>

                <div className="student-request-card__details">
                  <div>
                    <span>
                      <FileText size={15} />
                      İçerik türü
                    </span>

                    <strong>
                      {getContentTypeLabel(
                        request.contentType
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      <ListChecks size={15} />
                      Soru sayısı
                    </span>

                    <strong>
                      {request.questionCount
                        ? `${request.questionCount} soru`
                        : "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      <CalendarDays size={15} />
                      Yayın tarihi
                    </span>

                    <strong>
                      {formatDate(
                        request.createdAt
                      )}
                    </strong>
                  </div>
                </div>

                {request.additionalNotes && (
                  <div className="student-request-card__note">
                    <div className="student-request-card__note-icon">
                      <MessageSquareText
                        size={17}
                      />
                    </div>

                    <div>
                      <span>
                        Ek açıklama
                      </span>

                      <p>
                        {
                          request.additionalNotes
                        }
                      </p>
                    </div>
                  </div>
                )}
              </article>
            )
          )}
        </div>
      )}
    </div>
  );
}

function getContentTypeLabel(
  contentType:
    StudentNoteRequest["contentType"]
) {
  switch (contentType) {
    case "NoteOnly":
      return "Yalnızca ders notu";

    case "DetailedSummary":
      return "Detaylı özet";

    case "StudyQuestions":
      return "Çalışma soruları";

    default:
      return "Eski talep";
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
      error.response?.data
        ?.message ??
      fallback
    );
  }

  return fallback;
}
