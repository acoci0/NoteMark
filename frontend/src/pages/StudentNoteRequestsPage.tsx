import {
  BookOpen,
  ChevronLeft,
  FileText,
  ListChecks,
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
            Taleplerim
          </h1>

          <p>
            Yayınladığınız not
            taleplerini ve talep
            ayrıntılarını buradan
            görüntüleyebilirsiniz.
          </p>
        </div>

        <Link
          className="primary-button"
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

      {loading ? (
        <div className="note-request-loading">
          Talepler yükleniyor...
        </div>
      ) : requests.length === 0 ? (
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
                <div className="student-request-card__top">
                  <div className="student-request-card__icon">
                    {request.contentType ===
                    "StudyQuestions" ? (
                      <ListChecks
                        size={21}
                      />
                    ) : request.contentType ===
                      "DetailedSummary" ? (
                      <Sparkles
                        size={21}
                      />
                    ) : (
                      <FileText
                        size={21}
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

                  <span className="student-request-card__price">
                    {request.suggestedMinPrice}
                    {" – "}
                    {request.suggestedMaxPrice}
                    {" TL"}
                  </span>
                </div>

                <div className="student-request-card__academic">
                  <span>
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
                      İçerik türü
                    </span>

                    <strong>
                      {getContentTypeLabel(
                        request.contentType
                      )}
                    </strong>
                  </div>

                  {request.questionCount && (
                    <div>
                      <span>
                        Soru sayısı
                      </span>

                      <strong>
                        {
                          request.questionCount
                        }
                      </strong>
                    </div>
                  )}

                  <div>
                    <span>
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
      return "Ders notunun detaylı özeti";

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
