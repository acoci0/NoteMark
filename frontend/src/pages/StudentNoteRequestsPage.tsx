import {
  BookOpen,
  CalendarDays,
  FileText,
  GraduationCap,
  ListChecks,
  MessageSquareText,
  Plus,
  Sparkles,
  PauseCircle,
  PlayCircle,
  LockKeyhole,
  Trash2,
  AlertTriangle,
  X,
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

type RequestAction = "pause" | "resume" | "close" | "delete";

export default function StudentNoteRequestsPage({
  view = "all",
}: {
  view?: "all" | "paused";
}) {
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

  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    request: StudentNoteRequest;
    action: "close" | "delete";
  } | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 6400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const { data } =
          await studentApi.get<
            StudentNoteRequest[]
          >(
            view === "paused"
              ? "/student/note-requests/mine?status=Paused"
              : "/student/note-requests/mine"
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
  }, [view]);

  const changeRequest = async (request: StudentNoteRequest, action: RequestAction) => {
    if (busyId) return;
    setBusyId(request.id);
    setError("");
    setNotice("");
    try {
      const nextStatus: StudentNoteRequest["lifecycleStatus"] = action === "pause" ? "Paused"
        : action === "resume" ? "Active" : "Closed";

      if (action === "delete") {
        await studentApi.delete(`/student/note-requests/${request.id}`);
        setRequests((current) => current.filter((x) => x.id !== request.id));
      } else {
        await studentApi.put(`/student/note-requests/${request.id}/lifecycle`, {
          status: nextStatus,
        });
        setRequests((current) => current
          .map((x) => x.id === request.id ? {
            ...x, lifecycleStatus: nextStatus,
          } : x)
          .filter((x) => view !== "paused" || x.lifecycleStatus === "Paused"));
      }

      setNotice(action === "pause" ? "Talebiniz beklemeye alındı."
        : action === "resume" ? "Talebiniz yeniden aktif edildi."
        : action === "close" ? "Talebiniz kapatıldı."
        : "Talebiniz listeden kaldırıldı; önceki gönderimler korunur.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Talep güncellenemedi. Listeyi yenileyin."));
    } finally {
      setBusyId(null);
      setConfirmation(null);
    }
  };

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
              {view === "paused" ? "Beklemeye Aldıklarım" : "Taleplerim"}
            </h1>

            {!loading && (
              <span className="student-request-count">
                {requests.length} talep
              </span>
            )}
          </div>

          <p>
            {view === "paused"
              ? "Beklemeye aldığınız talepleri yeniden etkinleştirin veya kaldırın."
              : "Not taleplerinizin durumunu yönetin; gerektiğinde beklemeye alın veya kapatın."}
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

      {notice && (
        <div role="status" className="notmark-request-notice" key={notice}>
          {notice}
        </div>
      )}

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
            {view === "paused" ? "Beklemede talebiniz yok" : "Henüz not talebiniz yok"}
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
                    <span className={`notmark-request-state notmark-request-state--${request.lifecycleStatus.toLowerCase()}`}>
                      {request.lifecycleStatus === "Active" ? "Aktif"
                        : request.lifecycleStatus === "Paused" ? "Beklemede" : "Kapalı"}
                    </span>
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

                <div className="notmark-request-actions">
                  {request.lifecycleStatus === "Active" && (
                    <>
                      <button type="button" className="secondary-button notmark-request-action notmark-request-action--pause"
                        disabled={busyId !== null} onClick={() => void changeRequest(request, "pause")}>
                        <PauseCircle size={17} /> Beklemeye Al
                      </button>
                      <button type="button" className="secondary-button notmark-request-action notmark-request-action--close"
                        disabled={busyId !== null}
                        onClick={() => setConfirmation({ request, action: "close" })}>
                        <LockKeyhole size={17} /> Talebi Kapat
                      </button>
                    </>
                  )}
                  {request.lifecycleStatus === "Paused" && (
                    <>
                      <button type="button" className="primary-button notmark-request-action notmark-request-action--primary"
                        disabled={busyId !== null} onClick={() => void changeRequest(request, "resume")}>
                        <PlayCircle size={17} /> Yeniden Aktif Et
                      </button>
                      <button type="button" className="secondary-button notmark-request-action notmark-request-action--danger"
                        disabled={busyId !== null}
                        onClick={() => setConfirmation({ request, action: "delete" })}>
                        <Trash2 size={17} /> Talebi Sil
                      </button>
                    </>
                  )}
                  {request.lifecycleStatus === "Closed" && (
                    <button type="button" className="secondary-button notmark-request-action notmark-request-action--danger"
                      disabled={busyId !== null}
                      onClick={() => setConfirmation({ request, action: "delete" })}>
                      <Trash2 size={17} /> Talebi Sil
                    </button>
                  )}
                </div>
              </article>
            )
          )}
        </div>
      )}

      {confirmation && (
        <div className="notmark-request-modal-backdrop" role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busyId) setConfirmation(null);
          }}>
          <div className="notmark-request-modal" role="alertdialog" aria-modal="true"
            aria-labelledby="notmark-request-confirm-title"
            aria-describedby="notmark-request-confirm-description">
            <div className="notmark-request-modal__top">
              <AlertTriangle size={23} />
              <button type="button" aria-label="Vazgeç"
                disabled={busyId !== null} onClick={() => setConfirmation(null)}>
                <X size={19} />
              </button>
            </div>
            <h2 id="notmark-request-confirm-title">
              {confirmation.action === "delete" ? "Talep silinsin mi?" : "Talep kapatılsın mı?"}
            </h2>
            <p id="notmark-request-confirm-description">
              <strong>{confirmation.request.courseName}</strong>
              {confirmation.action === "delete"
                ? " talebiniz listelerinizden kaldırılır. Önceki gönderimler ve satış kayıtları korunur."
                : " talebiniz kapatılır ve artık yeni PDF kabul etmez. Bu işlem geri alınamaz."}
            </p>
            <div className="notmark-request-modal__actions">
              <button type="button" className="secondary-button" disabled={busyId !== null}
                onClick={() => setConfirmation(null)}>Vazgeç</button>
              <button type="button" className="primary-button notmark-request-modal__confirm"
                disabled={busyId !== null}
                onClick={() => void changeRequest(confirmation.request, confirmation.action)}>
                {busyId ? "İşleniyor..." : confirmation.action === "delete" ? "Talebi Sil" : "Talebi Kapat"}
              </button>
            </div>
          </div>
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
