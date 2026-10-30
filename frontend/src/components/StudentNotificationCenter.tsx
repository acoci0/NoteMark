/* NOTMARK_STUDENT_NOTIFICATION_CENTER_V13 */

import {
  Bell,
  BookOpenCheck,
  CheckCheck,
  GraduationCap,
  FileCheck2,
  AlertTriangle,
  RefreshCw,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import studentApi from "../api/studentClient";

import type {
  MarketplaceNoteRequest,
  StudentNoteSubmission,
  StudentVerificationItem,
} from "../types";

type NotificationKind =
  | "request"
  | "submission"
  | "verification";

type NotificationLevel =
  | "info"
  | "success"
  | "warning";

type StudentNotification = {
  id: string;
  kind: NotificationKind;
  level: NotificationLevel;
  title: string;
  message: string;
  createdAt: string;
  targetPath: string;
};

const POLL_INTERVAL = 60_000;
const HISTORY_DAYS = 60;
const MAX_ITEMS = 40;

function isRecent(value: string): boolean {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) return false;

  const diff = Date.now() - timestamp;

  return (
    diff >= -60_000 &&
    diff <= HISTORY_DAYS * 86_400_000
  );
}

function formatRelativeTime(value: string): string {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) return "";

  const minutes = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 60_000)
  );

  if (minutes < 1) return "Şimdi";
  if (minutes < 60) return `${minutes} dk`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours} sa`;

  const days = Math.floor(hours / 24);

  if (days < 7) return `${days} gün`;

  return new Date(value).toLocaleDateString("tr-TR");
}

function readStoredIds(key: string): Set<string> {
  try {
    const value = localStorage.getItem(key);

    if (!value) return new Set();

    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) return new Set();

    return new Set(
      parsed.filter(
        (item): item is string =>
          typeof item === "string"
      )
    );
  } catch {
    return new Set();
  }
}

function buildNotifications(
  requests: MarketplaceNoteRequest[],
  submissions: StudentNoteSubmission[],
  verifications: StudentVerificationItem[]
): StudentNotification[] {
  const notifications: StudentNotification[] = [];

  /*
   * NOT TALEPLERI
   *
   * Backend yalnızca öğrencinin geçerli,
   * onaylanmış üniversite ve bölümleriyle
   * eşleşen talepleri döndürür.
   */

  for (const request of requests) {
    if (
      request.hasActiveSubmission ||
      !isRecent(request.createdAt)
    ) {
      continue;
    }

    notifications.push({
      id: `request:${request.id}`,
      kind: "request",
      level: "info",
      title: "Bölümünüze yeni not talebi",
      message:
        `${request.courseName} · ${request.topic} · ` +
        `${request.universityName} / ${request.departmentName}`,
      createdAt: request.createdAt,
      targetPath: "/student/marketplace",
    });
  }

  /*
   * NOT GONDERIMLERI
   */

  const submissionStates: Record<
    string,
    { title: string; level: NotificationLevel }
  > = {
    Approved: {
      title: "Gönderdiğiniz not onaylandı",
      level: "success",
    },
    Rejected: {
      title: "Gönderdiğiniz not reddedildi",
      level: "warning",
    },
    ManualReview: {
      title: "Notunuz manuel incelemede",
      level: "info",
    },
    PdfGenerationFailed: {
      title: "PDF üretimi başarısız",
      level: "warning",
    },
  };

  for (const submission of submissions) {
    const info = submissionStates[submission.status];

    if (!info) continue;

    const eventAt =
      submission.reviewedAt ??
      submission.pdfGeneratedAt ??
      submission.createdAt;

    if (!isRecent(eventAt)) continue;

    notifications.push({
      id: `submission:${submission.id}:${submission.status}`,
      kind: "submission",
      level: info.level,
      title: info.title,
      message:
        `${submission.title} · ${submission.courseName}`,
      createdAt: eventAt,
      targetPath: "/student/note-submissions",
    });
  }

  /*
   * UNIVERSITE DOGRULAMALARI
   */

  for (const verification of verifications) {
    if (
      verification.status !== "Approved" &&
      verification.status !== "Rejected"
    ) {
      continue;
    }

    const eventAt =
      verification.reviewedAt ??
      verification.createdAt;

    if (!isRecent(eventAt)) continue;

    const approved =
      verification.status === "Approved";

    notifications.push({
      id:
        `verification:${verification.id}:` +
        verification.status,
      kind: "verification",
      level: approved ? "success" : "warning",
      title: approved
        ? "Üniversite doğrulamanız onaylandı"
        : "Üniversite doğrulamanız reddedildi",
      message:
        `${verification.universityName} · ` +
        verification.departmentName,
      createdAt: eventAt,
      targetPath: "/student/profile",
    });
  }

  return notifications
    .sort(
      (a, b) =>
        Date.parse(b.createdAt) -
        Date.parse(a.createdAt)
    )
    .slice(0, MAX_ITEMS);
}

function NotificationIcon({
  kind,
  level,
}: {
  kind: NotificationKind;
  level: NotificationLevel;
}) {
  if (kind === "request") {
    return <BookOpenCheck size={18} />;
  }

  if (kind === "verification") {
    return <GraduationCap size={18} />;
  }

  if (level === "warning") {
    return <AlertTriangle size={18} />;
  }

  return <FileCheck2 size={18} />;
}

export default function StudentNotificationCenter({
  studentId,
}: {
  studentId: string;
}) {
  const navigate = useNavigate();
  const panelId = useId();

  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const abortRef =
    useRef<AbortController | null>(null);

  const generationRef = useRef(0);

  const storageKey =
    `notmark_student_notifications_v13_${studentId}`;

  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(false);

  const [items, setItems] =
    useState<StudentNotification[]>([]);

  const [readIds, setReadIds] =
    useState<Set<string>>(
      () => readStoredIds(storageKey)
    );

  const load = useCallback(
    async (showLoading = false) => {
      if (!studentId) return;

      abortRef.current?.abort();

      const controller = new AbortController();

      abortRef.current = controller;

      const generation =
        ++generationRef.current;

      if (showLoading) setLoading(true);

      const options = {
        signal: controller.signal,
      };

      const results = await Promise.allSettled([
        studentApi.get<MarketplaceNoteRequest[]>(
          "/student/note-requests/marketplace",
          options
        ),

        studentApi.get<StudentNoteSubmission[]>(
          "/student/note-submissions",
          options
        ),

        studentApi.get<StudentVerificationItem[]>(
          "/student/verifications",
          options
        ),
      ]);

      if (
        controller.signal.aborted ||
        generation !== generationRef.current
      ) {
        return;
      }

      const successful = results.filter(
        (result) => result.status === "fulfilled"
      ).length;

      setError(successful !== 3);

      const requests =
        results[0].status === "fulfilled" &&
        Array.isArray(results[0].value.data)
          ? results[0].value.data
          : [];

      const submissions =
        results[1].status === "fulfilled" &&
        Array.isArray(results[1].value.data)
          ? results[1].value.data
          : [];

      const verifications =
        results[2].status === "fulfilled" &&
        Array.isArray(results[2].value.data)
          ? results[2].value.data
          : [];

      if (successful > 0) {
        setItems(
          buildNotifications(
            requests,
            submissions,
            verifications
          )
        );
      }

      setLoading(false);
    },
    [studentId]
  );

  /*
   * 60 saniyelik yenileme.
   * Sayfa görünür olduğunda yeniden sorgula.
   */

  useEffect(() => {
    void load(true);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void load();
      }
    }, POLL_INTERVAL);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };

    document.addEventListener(
      "visibilitychange",
      onVisible
    );

    window.addEventListener("focus", onVisible);

    return () => {
      window.clearInterval(interval);

      document.removeEventListener(
        "visibilitychange",
        onVisible
      );

      window.removeEventListener(
        "focus",
        onVisible
      );

      generationRef.current += 1;
      abortRef.current?.abort();
    };
  }, [load]);

  /*
   * Panel dışına tıklanınca kapanır.
   * Escape ile kapanır.
   */

  useEffect(() => {
    if (!open) return;

    const onPointer = (event: PointerEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);

        buttonRef.current?.focus({
          preventScroll: true,
        });
      }
    };

    document.addEventListener(
      "pointerdown",
      onPointer
    );

    document.addEventListener(
      "keydown",
      onKeyDown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        onPointer
      );

      document.removeEventListener(
        "keydown",
        onKeyDown
      );
    };
  }, [open]);

  const unreadCount = useMemo(
    () =>
      items.filter(
        (item) => !readIds.has(item.id)
      ).length,
    [items, readIds]
  );

  const saveReadIds = (next: Set<string>) => {
    const values = Array.from(next).slice(-1000);

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(values)
      );
    } catch {
      // Tarayıcı kalıcı depolamayı engelleyebilir.
    }

    setReadIds(new Set(values));
  };

  const markAllAsRead = () => {
    const next = new Set(readIds);

    for (const item of items) {
      next.add(item.id);
    }

    saveReadIds(next);
  };

  const openNotification = (
    item: StudentNotification
  ) => {
    const next = new Set(readIds);

    next.add(item.id);

    saveReadIds(next);

    setOpen(false);

    navigate(item.targetPath);
  };

  return (
    <div
      className="student-notification-center"
      ref={rootRef}
    >
      <button
        ref={buttonRef}
        type="button"
        className={
          "student-notification-trigger" +
          (open
            ? " student-notification-trigger--open"
            : "") +
          (unreadCount > 0
            ? " student-notification-trigger--unread"
            : "")
        }
        aria-label={
          unreadCount > 0
            ? `Bildirimler, ${unreadCount} okunmamış`
            : "Bildirimler"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={
          open ? panelId : undefined
        }
        title="Bildirimler"
        onClick={() => {
          const next = !open;

          setOpen(next);

          if (next) void load();
        }}
      >
        <Bell size={19} />

        {unreadCount > 0 && (
          <span
            className="student-notification-badge"
            aria-hidden="true"
          >
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          id={panelId}
          className="student-notification-popover"
          role="dialog"
          aria-modal="false"
          aria-labelledby={`${panelId}-title`}
        >
          <header className="student-notification-header">
            <div className="student-notification-heading">
              <span>NOTMARK ÖĞRENCİ</span>

              <strong id={`${panelId}-title`}>
                Bildirimler
              </strong>

              <small>
                {unreadCount > 0
                  ? `${unreadCount} okunmamış bildirim`
                  : "Yeni bildiriminiz yok"}
              </small>
            </div>

            <div className="student-notification-header-actions">
              <button
                type="button"
                title="Yenile"
                aria-label="Bildirimleri yenile"
                disabled={loading}
                onClick={() => void load(true)}
              >
                <RefreshCw
                  size={17}
                  className={
                    loading
                      ? "student-notification-spin"
                      : ""
                  }
                />
              </button>

              <button
                type="button"
                title="Kapat"
                aria-label="Bildirimleri kapat"
                onClick={() => setOpen(false)}
              >
                <X size={17} />
              </button>
            </div>
          </header>

          <div className="student-notification-toolbar">
            <span>Son 60 gündeki işlemler</span>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
              >
                <CheckCheck size={15} />
                Tümünü okundu say
              </button>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="student-notification-warning"
            >
              Bazı bildirimler yüklenemedi.
              Yenilemeyi deneyin.
            </p>
          )}

          {loading && items.length === 0 ? (
            <div
              className="student-notification-empty"
              role="status"
            >
              <RefreshCw size={25} />

              <strong>
                Bildirimler kontrol ediliyor
              </strong>

              <span>
                Güncel kayıtlar getiriliyor.
              </span>
            </div>
          ) : items.length > 0 ? (
            <div className="student-notification-list">
              {items.map((item) => {
                const unread =
                  !readIds.has(item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={
                      "student-notification-item " +
                      `student-notification-item--${item.level}` +
                      (unread
                        ? " student-notification-item--unread"
                        : "")
                    }
                    onClick={() =>
                      openNotification(item)
                    }
                  >
                    <span
                      className="student-notification-item__icon"
                      aria-hidden="true"
                    >
                      <NotificationIcon
                        kind={item.kind}
                        level={item.level}
                      />
                    </span>

                    <span className="student-notification-item__body">
                      <strong>
                        {item.title}
                      </strong>

                      <small>
                        {item.message}
                      </small>
                    </span>

                    <span className="student-notification-item__meta">
                      <time dateTime={item.createdAt}>
                        {formatRelativeTime(
                          item.createdAt
                        )}
                      </time>

                      {unread && (
                        <i aria-hidden="true" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div
              className="student-notification-empty"
              role="status"
            >
              <CheckCheck size={28} />

              <strong>
                {error
                  ? "Bildirimler alınamadı"
                  : "Şu anda yeni bildirim yok"}
              </strong>

              <span>
                {error
                  ? "Bağlantınızı kontrol edip yenileyin."
                  : "Bölümünüzle eşleşen talepler ve kişisel bildirimler burada görünecek."}
              </span>
            </div>
          )}

          <footer className="student-notification-footer">
            Doğrulanmış akademik yetkilerinize
            göre bildirim gösterilir.
          </footer>
        </section>
      )}
    </div>
  );
}
