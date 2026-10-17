import {
  Check,
  FileText,
  Eye,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  isAxiosError,
} from "axios";

import {
  useNavigate,
} from "react-router-dom";

import api from "../api/client";
import StatusBadge from "../components/StatusBadge";

import type {
  NoteSubmission,
} from "../types";

type DecisionMode =
  | "approve"
  | "reject";

type DecisionState = {
  item: NoteSubmission;
  mode: DecisionMode;
};

function Score({
  label,
  value,
  risk = false,
}: {
  label: string;
  value: number;
  risk?: boolean;
}) {
  return (
    <div className="score">
      <span>{label}</span>

      <strong
        className={
          risk && value >= 60
            ? "danger-text"
            : ""
        }
      >
        {value}
      </strong>
    </div>
  );
}

const priceFormatter =
  new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  );

export default function NotesPage() {
  const navigate =
    useNavigate();

  const [items, setItems] =
    useState<NoteSubmission[]>([]);

  const [
    previewingId,
    setPreviewingId,
  ] =
    useState<string | null>(null);

  const [
    decision,
    setDecision,
  ] =
    useState<DecisionState | null>(
      null
    );

  const [
    reviewNote,
    setReviewNote,
  ] =
    useState("");

  const [
    salePrice,
    setSalePrice,
  ] =
    useState("");

  const [
    decisionLoading,
    setDecisionLoading,
  ] =
    useState(false);

  const [
    decisionError,
    setDecisionError,
  ] =
    useState<string | null>(
      null
    );

  const load = async () => {
    const { data } =
      await api.get<
        NoteSubmission[]
      >(
        "/admin/notes"
      );

    setItems(data);
  };

  useEffect(() => {
    void load();
  }, []);

  const previewPdf = async (
    item: NoteSubmission
  ) => {
    const previewWindow =
      window.open(
        "",
        "_blank"
      );

    if (!previewWindow) {
      alert(
        "PDF önizlemesi için tarayıcı açılır pencere iznine ihtiyaç duyuyor."
      );

      return;
    }

    previewWindow.document.write(
      `
      <title>PDF hazırlanıyor...</title>
      <body style="
        margin:0;
        padding:32px;
        background:#141b24;
        color:#e9eef5;
        font-family:Arial,sans-serif;
      ">
        PDF hazırlanıyor...
      </body>
      `
    );

    setPreviewingId(
      item.id
    );

    try {
      const endpoint =
        item.generatedPdfBlobPath
          ? `/admin/notes/${item.id}/generated-document`
          : `/admin/notes/${item.id}/original-document`;

      const response =
        await api.get(
          endpoint,
          {
            responseType: "blob",
          }
        );

      const blob =
        new Blob(
          [response.data],
          {
            type:
              "application/pdf",
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      previewWindow.location.href =
        url;

      window.setTimeout(
        () =>
          URL.revokeObjectURL(
            url
          ),
        60_000
      );
    } catch (error) {
      previewWindow.close();

      console.error(
        "PDF önizleme hatası:",
        error
      );

      alert(
        "PDF önizlemesi açılamadı."
      );
    } finally {
      setPreviewingId(
        null
      );
    }
  };

  const openApprove = (
    item: NoteSubmission
  ) => {
    const midpoint =
      (
        item.suggestedMinPrice +
        item.suggestedMaxPrice
      ) / 2;

    setDecision({
      item,
      mode: "approve",
    });

    setSalePrice(
      String(
        item.salePrice ??
          Math.round(
            midpoint * 100
          ) / 100
      )
    );

    setReviewNote("");
    setDecisionError(null);
  };

  const openReject = (
    item: NoteSubmission
  ) => {
    setDecision({
      item,
      mode: "reject",
    });

    setSalePrice("");
    setReviewNote("");
    setDecisionError(null);
  };

  const closeDecision = () => {
    if (decisionLoading) {
      return;
    }

    setDecision(null);
    setReviewNote("");
    setSalePrice("");
    setDecisionError(null);
  };

  const submitDecision =
    async () => {
      if (!decision) {
        return;
      }

      const approve =
        decision.mode ===
        "approve";

      let parsedPrice:
        number | null = null;

      if (approve) {
        parsedPrice =
          Number(
            salePrice.replace(
              ",",
              "."
            )
          );

        if (
          !Number.isFinite(
            parsedPrice
          ) ||
          parsedPrice <= 0
        ) {
          setDecisionError(
            "Geçerli bir satış fiyatı girin."
          );

          return;
        }

        if (
          parsedPrice <
            decision.item
              .suggestedMinPrice ||
          parsedPrice >
            decision.item
              .suggestedMaxPrice
        ) {
          setDecisionError(
            `Satış fiyatı ${priceFormatter.format(
              decision.item
                .suggestedMinPrice
            )} ile ${priceFormatter.format(
              decision.item
                .suggestedMaxPrice
            )} arasında olmalıdır.`
          );

          return;
        }
      }

      if (
        !approve &&
        !reviewNote.trim()
      ) {
        setDecisionError(
          "Ret işlemi için gerekçe zorunludur."
        );

        return;
      }

      setDecisionLoading(true);
      setDecisionError(null);

      try {
        await api.post(
          `/admin/notes/${decision.item.id}/decision`,
          {
            approve,
            reviewNote:
              reviewNote.trim() ||
              null,
            salePrice:
              approve
                ? parsedPrice
                : null,
          }
        );

        setDecision(null);
        setReviewNote("");
        setSalePrice("");

        await load();
      } catch (error) {
        let message =
          "İşlem tamamlanamadı.";

        if (
          isAxiosError<{
            message?: string;
          }>(error)
        ) {
          message =
            error.response
              ?.data
              ?.message ??
            message;
        }

        setDecisionError(
          message
        );
      } finally {
        setDecisionLoading(
          false
        );
      }
    };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="section-kicker">
            İçerik moderasyonu
          </span>

          <h1>
            Not kontrolü
          </h1>

          <p>
            AI skorlarını, talep
            eşleşmesini ve oluşturulan
            PDF’i birlikte değerlendirin.
          </p>
        </div>
      </div>

      <div className="review-grid">
        {items.map(
          (item) => (
            <article
              className="review-card"
              key={item.id}
            >
              <div className="review-card__header">
                <div className="review-card__file">
                  <FileText
                    size={21}
                  />
                </div>

                <div>
                  <h2>
                    {item.title}
                  </h2>

                  <p>
                    {
                      item.universityName
                    }{" "}
                    ·{" "}
                    {
                      item.departmentName
                    }{" "}
                    ·{" "}
                    {
                      item.courseName
                    }
                  </p>
                </div>

                <StatusBadge
                  status={
                    item.status
                  }
                />
              </div>

              <div className="score-grid">
                <Score
                  label="Talep eşleşmesi"
                  value={
                    item.matchScore
                  }
                />

                <Score
                  label="Okunabilirlik"
                  value={
                    item.readabilityScore
                  }
                />

                <Score
                  label="Orijinallik riski"
                  value={
                    item.originalityRiskScore
                  }
                  risk
                />
              </div>

              <div className="review-card__meta">
                <span>
                  Satıcı:{" "}
                  {item.sellerName}
                </span>

                <span>
                  {new Date(
                    item.createdAt
                  ).toLocaleString(
                    "tr-TR"
                  )}
                </span>
              </div>

              <div className="review-card__actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() =>
                    navigate(
                      `/notes/${item.id}`
                    )
                  }
                >
                  <Eye size={17} />
                  Detaylı İncele
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() =>
                    void previewPdf(
                      item
                    )
                  }
                  disabled={
                    previewingId ===
                    item.id
                  }
                >
                  <FileText
                    size={17}
                  />

                  {previewingId ===
                  item.id
                    ? "PDF açılıyor..."
                    : "PDF önizleme"}
                </button>

                {item.status ===
                  "ManualReview" && (
                  <>
                    <button
                      className="approve-button"
                      type="button"
                      onClick={() =>
                        openApprove(
                          item
                        )
                      }
                    >
                      <Check
                        size={17}
                      />

                      Onayla
                    </button>

                    <button
                      className="reject-button"
                      type="button"
                      onClick={() =>
                        openReject(
                          item
                        )
                      }
                    >
                      <X
                        size={17}
                      />

                      Reddet
                    </button>
                  </>
                )}
              </div>
            </article>
          )
        )}
      </div>

      {decision && (
        <div
          className="admin-decision-backdrop"
          role="presentation"
        >
          <div
            className="admin-decision-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="decision-title"
          >
            <div className="admin-decision-modal__header">
              <div
                className={
                  decision.mode ===
                  "approve"
                    ? "admin-decision-modal__icon admin-decision-modal__icon--approve"
                    : "admin-decision-modal__icon admin-decision-modal__icon--reject"
                }
              >
                {decision.mode ===
                "approve" ? (
                  <Check
                    size={20}
                  />
                ) : (
                  <X
                    size={20}
                  />
                )}
              </div>

              <div>
                <span>
                  {decision.mode ===
                  "approve"
                    ? "NOT ONAYI"
                    : "NOT REDDİ"}
                </span>

                <h2 id="decision-title">
                  {decision.mode ===
                  "approve"
                    ? "Notu onayla"
                    : "Notu reddet"}
                </h2>
              </div>

              <button
                type="button"
                className="admin-decision-modal__close"
                onClick={
                  closeDecision
                }
                disabled={
                  decisionLoading
                }
                aria-label="Kapat"
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-decision-note-summary">
              <FileText
                size={18}
              />

              <div>
                <strong>
                  {
                    decision.item
                      .title
                  }
                </strong>

                <span>
                  {
                    decision.item
                      .universityName
                  }{" "}
                  ·{" "}
                  {
                    decision.item
                      .departmentName
                  }{" "}
                  ·{" "}
                  {
                    decision.item
                      .courseName
                  }
                </span>
              </div>
            </div>

            {decision.mode ===
              "approve" && (
              <>
                <div className="admin-price-range">
                  <span>
                    Önerilen satış
                    aralığı
                  </span>

                  <strong>
                    {priceFormatter.format(
                      decision.item
                        .suggestedMinPrice
                    )}
                    {" – "}
                    {priceFormatter.format(
                      decision.item
                        .suggestedMaxPrice
                    )}
                  </strong>
                </div>

                <label className="admin-decision-field">
                  <span>
                    Satış fiyatı
                    <b>*</b>
                  </span>

                  <div className="admin-price-input">
                    <input
                      type="number"
                      min={
                        decision.item
                          .suggestedMinPrice
                      }
                      max={
                        decision.item
                          .suggestedMaxPrice
                      }
                      step="0.01"
                      value={
                        salePrice
                      }
                      onChange={(
                        event
                      ) =>
                        setSalePrice(
                          event
                            .target
                            .value
                        )
                      }
                      disabled={
                        decisionLoading
                      }
                    />

                    <span>
                      TL
                    </span>
                  </div>
                </label>
              </>
            )}

            <label className="admin-decision-field">
              <span>
                {decision.mode ===
                "approve"
                  ? "Onay notu"
                  : "Ret gerekçesi"}

                {decision.mode ===
                  "reject" && (
                  <b>*</b>
                )}
              </span>

              <textarea
                rows={4}
                maxLength={600}
                placeholder={
                  decision.mode ===
                  "approve"
                    ? "İsteğe bağlı yönetici notu..."
                    : "Notun neden reddedildiğini açıklayın..."
                }
                value={
                  reviewNote
                }
                onChange={(
                  event
                ) =>
                  setReviewNote(
                    event.target
                      .value
                  )
                }
                disabled={
                  decisionLoading
                }
              />

              <small>
                {reviewNote.length}
                /600
              </small>
            </label>

            {decisionError && (
              <div className="admin-decision-error">
                {decisionError}
              </div>
            )}

            <div className="admin-decision-modal__footer">
              <button
                type="button"
                className="secondary-button"
                onClick={
                  closeDecision
                }
                disabled={
                  decisionLoading
                }
              >
                Vazgeç
              </button>

              <button
                type="button"
                className={
                  decision.mode ===
                  "approve"
                    ? "approve-button"
                    : "reject-button"
                }
                onClick={() =>
                  void submitDecision()
                }
                disabled={
                  decisionLoading
                }
              >
                {decision.mode ===
                "approve" ? (
                  <Check
                    size={17}
                  />
                ) : (
                  <X
                    size={17}
                  />
                )}

                {decisionLoading
                  ? "İşleniyor..."
                  : decision.mode ===
                    "approve"
                  ? "Onayla"
                  : "Reddet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
