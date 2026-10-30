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
  Trash2,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  isAxiosError,
} from "axios";

import studentApi from "../api/studentClient";
import { playStudentVerificationGenie } from "../utils/studentVerificationGenie";

import type {
  StudentNoteRequest,
} from "../types";

type ApiErrorResponse = {
  message?: string;
};

type RequestAction = "pause" | "resume";

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
  // NOTMARK_REQUEST_GENIE_V3
  const [confirmation, setConfirmation] =
    useState<StudentNoteRequest | null>(null);

  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");

  const deletePanelRef = useRef<HTMLDivElement>(null);
  const deleteIconRef = useRef<HTMLDivElement>(null);
  const deleteCancelRef = useRef<HTMLButtonElement>(null);

  const deleteInFlightRef = useRef(false);
  const deleteAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 6400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      deleteAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!confirmation) return;

    const body = window.document.body;
    const previousOverflow = body.style.overflow;
    const previousFocus = window.document.activeElement;

    body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      deleteCancelRef.current?.focus({ preventScroll: true });
    }, 0);

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busyId) setConfirmation(null);
        return;
      }

      if (event.key !== "Tab") return;

      const panel = deletePanelRef.current;
      if (!panel) return;

      const buttons = Array.from(
        panel.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)"
        )
      );

      if (!buttons.length) {
        event.preventDefault();
        return;
      }

      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      const active = window.document.activeElement;

      if (!panel.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.document.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      window.document.removeEventListener(
        "keydown", onKeyDown, true
      );

      body.style.overflow = previousOverflow;

      if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected
      ) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [confirmation, busyId]);

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

        setRequests(data.filter((request) =>
          view === "paused"
            ? request.lifecycleStatus === "Paused"
            : request.lifecycleStatus !== "Paused"
        ));
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

  const changeRequest = async (
    request: StudentNoteRequest,
    action: RequestAction
  ) => {
    if (busyId || deleteInFlightRef.current) return;

    setBusyId(request.id);
    setError("");
    setNotice("");

    try {
      const nextStatus: StudentNoteRequest["lifecycleStatus"] =
        action === "pause" ? "Paused" : "Active";

      await studentApi.put(
        `/student/note-requests/${request.id}/lifecycle`,
        { status: nextStatus }
      );

      setRequests((current) => current
        .map((entry) => entry.id === request.id
          ? { ...entry, lifecycleStatus: nextStatus }
          : entry)
        .filter((entry) => view === "paused"
          ? entry.lifecycleStatus === "Paused"
          : entry.lifecycleStatus !== "Paused")
      );

      setNotice(action === "pause"
        ? "Talebiniz beklemeye alındı. Beklemeye Aldıklarım bölümünden yönetebilirsiniz."
        : "Talebiniz yeniden aktif edildi."
      );
    } catch (requestError) {
      setError(getErrorMessage(
        requestError,
        "Talep güncellenemedi. Listeyi yenileyin."
      ));
    } finally {
      if (mountedRef.current) setBusyId(null);
    }
  };

  const openDeleteDialog = (request: StudentNoteRequest) => {
    if (busyId || deleteInFlightRef.current) return;

    setDeleteError("");
    setConfirmation(request);
  };

  const confirmDeleteRequest = async () => {
    const request = confirmation;

    if (!request || busyId || deleteInFlightRef.current) return;

    deleteInFlightRef.current = true;

    setBusyId(request.id);
    setDeleteError("");
    setError("");
    setNotice("");

    const controller = new AbortController();
    deleteAbortRef.current = controller;

    let deleted = false;

    const finish = () => {
      if (!mountedRef.current) return;

      setRequests((current) =>
        current.filter((entry) => entry.id !== request.id)
      );

      setConfirmation(null);
    };

    try {
      await studentApi.delete(
        `/student/note-requests/${request.id}`
      );

      deleted = true;

      const motionOff =
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches ||
        window.document.querySelector(
          ".student-app-shell"
        )?.getAttribute("data-motion") === "off";

      if (motionOff) {
        finish();
      } else {
        await playStudentVerificationGenie({
          panel: deletePanelRef.current,
          icon: deleteIconRef.current,
          onCovered: finish,
          signal: controller.signal,
        });
      }

      if (
        mountedRef.current &&
        !controller.signal.aborted
      ) {
        setNotice(
          "Talebiniz silindi. Geçmiş gönderimler ve satış kayıtları korundu."
        );
      }
    } catch (requestError) {
      if (deleted) {
        finish();

        if (
          mountedRef.current &&
          !controller.signal.aborted
        ) {
          setNotice(
            "Talebiniz silindi. Geçmiş gönderimler ve satış kayıtları korundu."
          );
        }
      } else if (mountedRef.current) {
        setDeleteError(getErrorMessage(
          requestError,
          "Talep silinemedi. Lütfen tekrar deneyin."
        ));
      }
    } finally {
      deleteAbortRef.current = null;
      deleteInFlightRef.current = false;

      if (mountedRef.current) {
        setBusyId(null);
      }
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
              : "Not taleplerinizi yönetin; beklemeye alın veya ihtiyaç kalmadığında silin."}
          </p>
        </div>

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
        <section className="marketplace-empty notmark-request-board-empty">
          {view === "paused" ? (
            <PauseCircle size={30} aria-hidden="true" />
          ) : (
            <BookOpen size={30} aria-hidden="true" />
          )}

          <h2>
            {view === "paused" ? "Beklemede talebiniz yok" : "Şu anda listelenecek talebiniz yok"}
          </h2>

          <p>
            {view === "paused"
              ? "Beklemeye aldığınız talep bulunmuyor. Aktif taleplerinizi Taleplerim bölümünden yönetebilirsiniz."
              : "İhtiyacınız olan ders ve konuyu belirleyerek ilk talebinizi yayınlayabilirsiniz."}
          </p>

          {view === "paused" ? (
            <Link
              className="primary-button"
              to="/student/note-requests"
            >
              <BookOpen size={17} />
              Taleplerime Git
            </Link>
          ) : (
            <Link
              className="primary-button"
              to="/student/note-requests/new"
            >
              <Plus size={17} />
              Not İste
            </Link>
          )}
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
                      <button
                        type="button"
                        className="secondary-button notmark-request-action notmark-request-action--pause"
                        disabled={busyId !== null}
                        onClick={() => void changeRequest(request, "pause")}
                      >
                        <PauseCircle size={17} />
                        Beklemeye Al
                      </button>

                      <button
                        type="button"
                        className="student-delete-button notmark-request-delete"
                        disabled={busyId !== null}
                        onClick={() => openDeleteDialog(request)}
                      >
                        <Trash2 size={17} />
                        Talebi Sil
                      </button>
                    </>
                  )}

                  {request.lifecycleStatus === "Paused" && (
                    <>
                      <button
                        type="button"
                        className="notmark-request-action notmark-request-action--resume"
                        disabled={busyId !== null}
                        onClick={() => void changeRequest(request, "resume")}
                      >
                        <PlayCircle size={17} />
                        Yeniden Aktif Et
                      </button>

                      <button
                        type="button"
                        className="student-delete-button notmark-request-delete"
                        disabled={busyId !== null}
                        onClick={() => openDeleteDialog(request)}
                      >
                        <Trash2 size={17} />
                        Talebi Sil
                      </button>
                    </>
                  )}

                  {request.lifecycleStatus === "Closed" && (
                    <button
                      type="button"
                      className="student-delete-button notmark-request-delete"
                      disabled={busyId !== null}
                      onClick={() => openDeleteDialog(request)}
                    >
                      <Trash2 size={17} />
                      Talebi Sil
                    </button>
                  )}
                </div>
              </article>
            )
          )}
        </div>
      )}

      {confirmation && (
        <div
          className="notmark-delete-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !busyId
            ) {
              setConfirmation(null);
            }
          }}
        >
          <div
            ref={deletePanelRef}
            className="notmark-delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="notmark-request-delete-title"
            aria-describedby="notmark-request-delete-description"
            aria-busy={busyId !== null}
          >
            <div
              ref={deleteIconRef}
              className="notmark-delete-dialog__icon"
              aria-hidden="true"
            >
              <Trash2
                size={24}
                strokeWidth={1.9}
                className="notmark-trash-animated-svg"
              />
            </div>

            <h2 id="notmark-request-delete-title">
              Talebi Sil
            </h2>

            <p id="notmark-request-delete-description">
              <strong>{confirmation.courseName}</strong>
              {" — "}
              {confirmation.topic}
              {" "}
              talebini silmek istiyor musunuz?
              Daha önce gönderilen notlar ve satış kayıtları korunur.
            </p>

            {deleteError && (
              <p
                className="notmark-delete-dialog__error"
                role="alert"
              >
                {deleteError}
              </p>
            )}

            <div className="notmark-delete-dialog__actions">
              <button
                ref={deleteCancelRef}
                type="button"
                className="notmark-delete-dialog__cancel"
                disabled={busyId !== null}
                onClick={() => setConfirmation(null)}
              >
                Vazgeç
              </button>

              <button
                type="button"
                className="notmark-delete-dialog__confirm"
                disabled={busyId !== null}
                onClick={() => void confirmDeleteRequest()}
              >
                <Trash2 size={15} />
                {busyId ? "Siliniyor..." : "Sil"}
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
