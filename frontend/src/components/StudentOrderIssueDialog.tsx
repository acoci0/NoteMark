import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
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

import studentApi from "../api/studentClient";

type ApiErrorResponse = {
  message?: string;
};

type IssueOption = {
  code: string;
  label: string;
  description: string;
};

type IssueOptionsResponse = {
  orderId: string;
  noteTitle: string;
  orderStatus: string;
  issues: IssueOption[];
};

type Props = {
  open: boolean;
  orderId: string;
  onClose: () => void;
};

export default function StudentOrderIssueDialog({
  open,
  orderId,
  onClose,
}: Props) {
  const [
    data,
    setData,
  ] = useState<IssueOptionsResponse | null>(
    null
  );

  const [
    selectedCode,
    setSelectedCode,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

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
  ] = useState(false);

  const [
    typingColor,
    setTypingColor,
  ] = useState<
    "yellow" |
    "purple" |
    "blue" |
    "green"
  >("yellow");

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
    if (!open || !orderId) {
      return;
    }

    const load = async () => {
      setLoading(true);
      setData(null);
      setSelectedCode("");
      setDescription("");
      setError("");
      setSuccess(false);
      setTypingActive(false);
      setTypingColor("yellow");
      typingColorIndexRef.current = 0;

      try {
        const response =
          await studentApi.get<IssueOptionsResponse>(
            `/student/complaints/order-options/${orderId}`
          );

        setData(response.data);
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
            "Sorun seçenekleri yüklenemedi."
          )
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [
    open,
    orderId,
  ]);

  if (!open) {
    return null;
  }

  const submit = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (!selectedCode) {
      setError(
        "Lütfen yaşadığınız sorunu seçin."
      );
      return;
    }

    const normalizedDescription =
      description.trim();

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

    try {
      await studentApi.post(
        "/student/complaints",
        {
          category: "Order",
          subject: "",
          description:
            normalizedDescription,
          relatedEntityId:
            orderId,
          issueCode:
            selectedCode,
        }
      );

      setSuccess(true);
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Sorun bildirimi oluşturulamadı."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="student-order-issue-backdrop"
      onMouseDown={() => {
        if (!submitting) {
          onClose();
        }
      }}
    >
      <section
        className="student-order-issue-dialog"
        onMouseDown={
          event =>
            event.stopPropagation()
        }
      >
        <header className="student-order-issue-dialog__header">
          <div className="student-order-issue-dialog__identity">
            <div className="student-order-issue-dialog__logo-frame">
              <div className="student-order-issue-dialog__logo-inner">
                <img
                  src="/brand/notmark-logo.png"
                  alt="NotMark"
                />
              </div>
            </div>

            <div className="student-order-issue-dialog__heading">
              <span>
                NOTMARK DESTEK
              </span>

              <h2>
                Sorun Bildir
              </h2>

              {data && (
                <p>
                  {data.noteTitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            className="student-order-issue-dialog__close"
            disabled={submitting}
            onClick={onClose}
            aria-label="Kapat"
          >
            <X size={19} />
          </button>
        </header>

        {loading ? (
          <div className="student-order-issue-loading">
            <LoaderCircle
              size={23}
              className="student-order-issue-spinner"
            />

            <span>
              Uygun sorunlar kontrol ediliyor...
            </span>
          </div>
        ) : success ? (
          <div className="student-order-issue-success">
            <CheckCircle2 size={32} />

            <strong>
              Sorun bildirimi oluşturuldu
            </strong>

            <p>
              Bildiriminiz açık durumda
              kaydedildi ve admin incelemesine
              gönderildi.
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
            className="student-order-issue-form"
            onSubmit={submit}
          >
            <div className="student-order-issue-section">
              <div className="student-order-issue-section__heading">
                <strong>
                  Hangi sorunu yaşıyorsunuz?
                </strong>

                <span>
                  Yalnızca bu sipariş için
                  geçerli sistem sorunları
                  gösterilir.
                </span>
              </div>

              {data &&
              data.issues.length > 0 ? (
                <div className="student-order-issue-options">
                  {data.issues.map(
                    issue => (
                      <label
                        key={issue.code}
                        className={
                          selectedCode ===
                          issue.code
                            ? "student-order-issue-option student-order-issue-option--selected"
                            : "student-order-issue-option"
                        }
                      >
                        <input
                          type="radio"
                          name="issueCode"
                          value={
                            issue.code
                          }
                          checked={
                            selectedCode ===
                            issue.code
                          }
                          disabled={
                            submitting
                          }
                          onChange={() =>
                            setSelectedCode(
                              issue.code
                            )
                          }
                        />

                        <div className="student-order-issue-option__radio" />

                        <div>
                          <strong>
                            {issue.label}
                          </strong>

                          <p>
                            {
                              issue.description
                            }
                          </p>
                        </div>
                      </label>
                    )
                  )}
                </div>
              ) : (
                <div className="student-order-issue-empty">
                  <AlertTriangle
                    size={22}
                  />

                  <div>
                    <strong>
                      Bildirilebilir sistem sorunu bulunamadı
                    </strong>

                    <p>
                      Bu siparişin mevcut
                      durumunda sistem tarafından
                      doğrulanabilen bir sorun
                      seçeneği bulunmuyor.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {data &&
              data.issues.length >
                0 && (
                <label className="student-order-issue-description">
                  <span>
                    Açıklama
                  </span>

                  <textarea
                    rows={6}
                    maxLength={2000}
                    value={
                      description
                    }
                    disabled={
                      submitting
                    }
                    onChange={(event) => {
                      setDescription(
                        event.target.value
                      );

                      const colors = [
                        "yellow",
                        "purple",
                        "blue",
                        "green",
                      ] as const;

                      const index =
                        typingColorIndexRef
                          .current %
                        colors.length;

                      setTypingColor(
                        colors[index]
                      );

                      typingColorIndexRef
                        .current =
                        (index + 1) %
                        colors.length;

                      setTypingActive(
                        true
                      );

                      if (
                        typingTimerRef
                          .current !==
                        null
                      ) {
                        window.clearTimeout(
                          typingTimerRef
                            .current
                        );
                      }

                      typingTimerRef.current =
                        window.setTimeout(
                          () => {
                            setTypingActive(
                              false
                            );
                          },
                          280
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
                    placeholder="Yaşadığınız sorunun nasıl ortaya çıktığını kısaca açıklayın."
                  />

                  <small>
                    {description.length} / 2000
                  </small>
                </label>
              )}

            {error && (
              <div className="student-order-issue-error">
                {error}
              </div>
            )}

            {data &&
              data.issues.length >
                0 && (
                <footer className="student-order-issue-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={
                      submitting
                    }
                    onClick={
                      onClose
                    }
                  >
                    Vazgeç
                  </button>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={
                      submitting ||
                      !selectedCode
                    }
                  >
                    <Send
                      size={16}
                    />

                    {submitting
                      ? "Gönderiliyor..."
                      : "Sorunu Bildir"}
                  </button>
                </footer>
              )}
          </form>
        )}
      </section>
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
      error.response?.data?.message ??
      fallback
    );
  }

  return fallback;
}
