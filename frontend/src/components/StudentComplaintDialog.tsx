import {
  AlertTriangle,
  Send,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  isAxiosError,
} from "axios";

import studentApi from "../api/studentClient";

type ComplaintCategory =
  | "Verification"
  | "Note"
  | "Order";

type ApiErrorResponse = {
  message?: string;
};

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

  useEffect(() => {
    if (!open) {
      return;
    }

    setSubject(defaultSubject);
    setComplaintDescription("");
    setError("");
    setSuccess("");
  }, [
    open,
    defaultSubject,
    relatedEntityId,
  ]);

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

  return (
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
              <AlertTriangle
                size={20}
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
    </div>
  );
}
