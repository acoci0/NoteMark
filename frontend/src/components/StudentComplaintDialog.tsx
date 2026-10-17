import {
  Send,
  X,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  isAxiosError,
} from "axios";

import {
  createPortal,
} from "react-dom";

import studentApi from "../api/studentClient";

type ComplaintCategory =
  | "Verification"
  | "Note"
  | "Order";

type ApiErrorResponse = {
  message?: string;
};

type AppealTypingColor =
  | "yellow"
  | "purple"
  | "blue"
  | "green";

const APPEAL_TYPING_COLORS:
  AppealTypingColor[] = [
    "yellow",
    "purple",
    "blue",
    "green",
  ];

type Props = {
  open: boolean;
  category: ComplaintCategory;
  relatedEntityId: string;
  title: string;
  description?: string;
  defaultSubject?: string;
  onClose: () => void;
  onCreated?: () => void;
};

export default function StudentComplaintDialog({
  open,
  category,
  relatedEntityId,
  title,
  description,
  defaultSubject = "",
  onClose,
  onCreated,
}: Props) {
  const [
    subject,
    setSubject,
  ] = useState(defaultSubject);

  const [
    complaintDescription,
    setComplaintDescription,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    typingColor,
    setTypingColor,
  ] = useState<AppealTypingColor>(
    "yellow"
  );

  const [
    typingActive,
    setTypingActive,
  ] = useState(false);

  const typingColorIndexRef =
    useRef(0);

  const typingTimerRef =
    useRef<number | null>(
      null
    );

  useEffect(() => {
    return () => {
      if (
        typingTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          typingTimerRef.current
        );
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSubject(defaultSubject);
    setComplaintDescription("");
    setError("");
    setSuccess("");

    setTypingColor(
      "yellow"
    );

    setTypingActive(
      false
    );

    typingColorIndexRef.current =
      0;

    if (
      typingTimerRef.current !==
      null
    ) {
      window.clearTimeout(
        typingTimerRef.current
      );

      typingTimerRef.current =
        null;
    }
  }, [
    open,
    defaultSubject,
    relatedEntityId,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const notmarkComplaintPreviousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === "Escape" &&
        !submitting
      ) {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        notmarkComplaintPreviousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    open,
    submitting,
    onClose,
  ]);

  const pulseDescriptionBorder =
    () => {
      const index =
        typingColorIndexRef
          .current %
        APPEAL_TYPING_COLORS
          .length;

      setTypingColor(
        APPEAL_TYPING_COLORS[
          index
        ]
      );

      typingColorIndexRef.current =
        (
          index + 1
        ) %
        APPEAL_TYPING_COLORS
          .length;

      setTypingActive(
        true
      );

      if (
        typingTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          typingTimerRef.current
        );
      }

      typingTimerRef.current =
        window.setTimeout(
          () => {
            setTypingActive(
              false
            );

            typingTimerRef.current =
              null;
          },
          280
        );
    };

  if (!open) {
    return null;
  }

  const submit = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    const normalizedSubject =
      subject.trim();

    const normalizedDescription =
      complaintDescription.trim();

    if (
      normalizedSubject.length < 5
    ) {
      setError(
        "Konu en az 5 karakter olmalıdır."
      );

      return;
    }

    if (
      normalizedDescription.length < 20
    ) {
      setError(
        "Açıklama en az 20 karakter olmalıdır."
      );

      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await studentApi.post(
        "/student/complaints",
        {
          category,
          subject:
            normalizedSubject,
          description:
            normalizedDescription,
          relatedEntityId,
        }
      );

      setSuccess(
        "İtirazınız başarıyla oluşturuldu."
      );

      onCreated?.();
    } catch (requestError) {
      if (
        isAxiosError<ApiErrorResponse>(
          requestError
        )
      ) {
        setError(
          requestError.response?.data
            ?.message ??
            "İtiraz oluşturulamadı."
        );

        return;
      }

      setError(
        "İtiraz oluşturulamadı."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const portalTarget =
    document.querySelector<HTMLElement>(
      ".student-app-shell"
    ) ?? document.body;

  return createPortal(
    <div
      className="student-complaint-dialog-backdrop"
      onMouseDown={() => {
        if (!submitting) {
          onClose();
        }
      }}
    >
      <section
        className="student-complaint-dialog"
        onMouseDown={
          event =>
            event.stopPropagation()
        }
      >
        <header className="student-complaint-dialog__header">
          <div className="student-complaint-dialog__title">
            <div className="student-complaint-dialog__icon">
              <img
                src="/brand/notmark-logo.png"
                alt="NotMark"
                className="student-complaint-dialog__logo"
              />
            </div>

            <div>
              <span>
                NOTMARK DESTEK
              </span>

              <h2>
                {title}
              </h2>

              {description && (
                <p>
                  {description}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            className="student-complaint-dialog__close"
            disabled={submitting}
            onClick={onClose}
            aria-label="Kapat"
          >
            <X size={19} />
          </button>
        </header>

        {success ? (
          <div className="student-complaint-dialog__success">
            <strong>
              Başvuru oluşturuldu
            </strong>

            <p>
              Başvurunuz açık durumda
              kaydedildi. Admin incelemesinin
              sonucunu daha sonra destek
              ekranından takip edebileceksiniz.
            </p>

            <button
              type="button"
              className="primary-button"
              onClick={onClose}
            >
              Kapat
            </button>
          </div>
        ) : (
          <form
            className="student-complaint-dialog__form"
            onSubmit={submit}
          >
            <label>
              <span>
                Konu
              </span>

              <input
                type="text"
                maxLength={180}
                value={subject}
                disabled={submitting}
                onChange={
                  event =>
                    setSubject(
                      event.target.value
                    )
                }
                placeholder="İtirazınızın kısa konusu"
              />

              <small>
                {subject.length} / 180
              </small>
            </label>

            <label>
              <span>
                Açıklama
              </span>

              <textarea
                rows={7}
                maxLength={2000}
                value={
                  complaintDescription
                }
                disabled={submitting}
                onChange={
                  event =>
                    setComplaintDescription(
                      event.target.value
                    )
                }
                onKeyDown={() => {
                  pulseDescriptionBorder();
                }}
                onBlur={() => {
                  setTypingActive(
                    false
                  );
                }}
                data-typing-color={
                  typingColor
                }
                data-typing-active={
                  typingActive
                    ? "true"
                    : "false"
                }
                placeholder="Kararın neden tekrar incelenmesi gerektiğini açık şekilde belirtin."
              />

              <small>
                {
                  complaintDescription
                    .length
                }{" "}
                / 2000
              </small>
            </label>

            {error && (
              <div className="student-complaint-dialog__error">
                {error}
              </div>
            )}

            <footer className="student-complaint-dialog__actions">
              <button
                type="button"
                className="secondary-button"
                disabled={submitting}
                onClick={onClose}
              >
                Vazgeç
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={submitting}
              >
                <Send size={16} />

                {submitting
                  ? "Gönderiliyor..."
                  : "İtirazı Gönder"}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>,
    portalTarget
  );
}
