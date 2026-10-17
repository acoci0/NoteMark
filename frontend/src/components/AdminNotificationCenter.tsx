import {
  Bell,
  BookCheck,
  CheckCheck,
  CircleAlert,
  FileBadge2,
  RefreshCw,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../api/client";
import { useAuth } from "../auth/AuthContext";

type AdminNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  targetPath: string;
  severity: string;
  createdAt: string;
};

type AdminNotificationSummary = {
  totalActionItems: number;
  items: AdminNotification[];
};

function getRelativeTime(
  value: string
) {
  const date =
    new Date(value);

  const diff =
    Date.now() -
    date.getTime();

  const minutes =
    Math.max(
      0,
      Math.floor(
        diff / 60_000
      )
    );

  if (minutes < 1) {
    return "Şimdi";
  }

  if (minutes < 60) {
    return `${minutes} dk`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours} sa`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  if (days < 7) {
    return `${days} gün`;
  }

  return date.toLocaleDateString(
    "tr-TR"
  );
}

function NotificationIcon({
  type,
}: {
  type: string;
}) {
  if (
    type ===
    "verification"
  ) {
    return (
      <FileBadge2
        size={17}
      />
    );
  }

  if (
    type ===
    "note-review"
  ) {
    return (
      <BookCheck
        size={17}
      />
    );
  }

  return (
    <CircleAlert
      size={17}
    />
  );
}

export default function AdminNotificationCenter() {
  const navigate =
    useNavigate();

  const { admin } =
    useAuth();

  const rootRef =
    useRef<HTMLDivElement>(
      null
    );

  const [open, setOpen] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    data,
    setData,
  ] =
    useState<AdminNotificationSummary>({
      totalActionItems: 0,
      items: [],
    });

  const storageKey =
    `notmark_admin_notifications_read_${admin?.id ?? "unknown"}`;

  const [
    readIds,
    setReadIds,
  ] =
    useState<Set<string>>(
      () => {
        try {
          const raw =
            localStorage.getItem(
              storageKey
            );

          if (!raw) {
            return new Set();
          }

          const parsed =
            JSON.parse(
              raw
            ) as string[];

          return new Set(
            parsed
          );
        } catch {
          return new Set();
        }
      }
    );

  const load =
    async (
      silent = false
    ) => {
      if (!silent) {
        setLoading(true);
      }

      try {
        const response =
          await api.get<AdminNotificationSummary>(
            "/admin/notifications"
          );

        setData(
          response.data
        );
      } catch (error) {
        console.error(
          "Admin bildirimleri alınamadı:",
          error
        );
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    };

  useEffect(() => {
    void load();

    const timer =
      window.setInterval(
        () => {
          void load(true);
        },
        60_000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, []);

  useEffect(() => {
    const handler = (
      event: MouseEvent
    ) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handler
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handler
      );
    };
  }, []);

  const unreadCount =
    useMemo(
      () =>
        data.items.filter(
          item =>
            !readIds.has(
              item.id
            )
        ).length,
      [
        data.items,
        readIds,
      ]
    );

  const persistReadIds = (
    next: Set<string>
  ) => {
    const values =
      Array.from(
        next
      ).slice(-300);

    localStorage.setItem(
      storageKey,
      JSON.stringify(
        values
      )
    );

    setReadIds(
      new Set(values)
    );
  };

  const markAsRead = (
    id: string
  ) => {
    const next =
      new Set(
        readIds
      );

    next.add(id);

    persistReadIds(next);
  };

  const markAllAsRead =
    () => {
      const next =
        new Set(
          readIds
        );

      for (
        const item
        of data.items
      ) {
        next.add(
          item.id
        );
      }

      persistReadIds(next);
  };

  const openNotification = (
    item: AdminNotification
  ) => {
    markAsRead(
      item.id
    );

    setOpen(false);

    navigate(
      item.targetPath
    );
  };

  return (
    <div
      className="admin-notifications"
      ref={rootRef}
    >
      <button
        type="button"
        className={[
          "admin-notification-trigger",
          open
            ? "admin-notification-trigger--active"
            : "",
          unreadCount > 0
            ? "admin-notification-trigger--has-unread"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Bildirimler"
        aria-expanded={open}
        onClick={() => {
          const next =
            !open;

          setOpen(next);

          if (next) {
            void load(true);
          }
        }}
      >
        <Bell size={19} />

        {unreadCount >
          0 && (
          <span className="admin-notification-count">
            {unreadCount >
            99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="admin-notification-popover">
          <div className="admin-notification-header">
            <div>
              <span>
                OPERASYON MERKEZİ
              </span>

              <strong>
                Bildirimler
              </strong>

              <small>
                {
                  data.totalActionItems
                }{" "}
                işlem bekliyor
              </small>
            </div>

            <button
              type="button"
              className="admin-notification-refresh"
              aria-label="Bildirimleri yenile"
              onClick={() =>
                void load()
              }
              disabled={
                loading
              }
            >
              <RefreshCw
                size={16}
                className={
                  loading
                    ? "is-spinning"
                    : ""
                }
              />
            </button>
          </div>

          {data.items.length >
          0 ? (
            <>
              <div className="admin-notification-toolbar">
                <span>
                  Son işlemler
                </span>

                {unreadCount >
                  0 && (
                  <button
                    type="button"
                    onClick={
                      markAllAsRead
                    }
                  >
                    <CheckCheck
                      size={14}
                    />
                    Tümünü okundu say
                  </button>
                )}
              </div>

              <div className="admin-notification-list">
                {data.items.map(
                  item => {
                    const unread =
                      !readIds.has(
                        item.id
                      );

                    return (
                      <button
                        type="button"
                        key={
                          item.id
                        }
                        className={
                          `admin-notification-item admin-notification-item--${item.severity}` +
                          (
                            unread
                              ? " admin-notification-item--unread"
                              : ""
                          )
                        }
                        onClick={() =>
                          openNotification(
                            item
                          )
                        }
                      >
                        <span className="admin-notification-item__icon">
                          <NotificationIcon
                            type={
                              item.type
                            }
                          />
                        </span>

                        <span className="admin-notification-item__content">
                          <strong>
                            {
                              item.title
                            }
                          </strong>

                          <small>
                            {
                              item.message
                            }
                          </small>
                        </span>

                        <span className="admin-notification-item__time">
                          {getRelativeTime(
                            item.createdAt
                          )}
                        </span>

                        {unread && (
                          <i
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            </>
          ) : (
            <div className="admin-notification-empty">
              <CheckCheck
                size={26}
              />

              <strong>
                İşlem beklemiyor
              </strong>

              <span>
                Şu anda müdahale
                gerektiren yeni kayıt
                bulunmuyor.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
