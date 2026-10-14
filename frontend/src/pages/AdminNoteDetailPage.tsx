import {
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  RefreshCw,
  RotateCcw,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  isAxiosError,
} from "axios";

import api from "../api/client";
import StatusBadge from "../components/StatusBadge";

import type {
  AdminNoteDetail,
} from "../types";

const currencyFormatter =
  new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2,
    }
  );

function ScoreCard({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  const getLevel = () => {
    if (danger) {
      if (value >= 70) return "Yüksek";
      if (value >= 40) return "Orta";
      return "Düşük";
    }

    if (value >= 85) return "Çok iyi";
    if (value >= 70) return "İyi";
    if (value >= 50) return "Orta";

    return "Düşük";
  };

  return (
    <article
      className={
        danger && value >= 60
          ? "admin-note-score admin-note-score--danger"
          : "admin-note-score"
      }
    >
      <div>
        <span>{label}</span>
        <small>{getLevel()}</small>
      </div>

      <strong>
        {value}
        <small>/100</small>
      </strong>
    </article>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="admin-note-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function AdminNoteDetailPage() {
  const { id } = useParams();

  const [
    item,
    setItem,
  ] =
    useState<AdminNoteDetail | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    previewing,
    setPreviewing,
  ] =
    useState<
      "original" |
      "generated" |
      null
    >(null);


  const [
    decisionMode,
    setDecisionMode,
  ] =
    useState<
      "approve" |
      "reject" |
      null
    >(null);

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

  const [
    retryLoading,
    setRetryLoading,
  ] =
    useState(false);

  const load = async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } =
        await api.get<AdminNoteDetail>(
          `/admin/notes/${id}`
        );

      setItem(data);
    } catch {
      setError(
        "Not ayrıntıları yüklenemedi."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const previewPdf = async (
    type:
      | "original"
      | "generated"
  ) => {
    if (!item) {
      return;
    }

    const previewWindow =
      window.open(
        "",
        "_blank"
      );

    if (!previewWindow) {
      alert(
        "PDF önizlemesi için açılır pencere izni gerekiyor."
      );

      return;
    }

    setPreviewing(type);

    previewWindow.document.write(
      `
      <body style="
        margin:0;
        padding:32px;
        background:#141b24;
        color:#eef3f8;
        font-family:Arial,sans-serif;
      ">
        PDF hazırlanıyor...
      </body>
      `
    );

    try {
      const endpoint =
        type === "generated"
          ? `/admin/notes/${item.id}/generated-document`
          : `/admin/notes/${item.id}/original-document`;

      const response =
        await api.get(
          endpoint,
          {
            responseType:
              "blob",
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
    } catch {
      previewWindow.close();

      alert(
        "PDF önizlemesi açılamadı."
      );
    } finally {
      setPreviewing(null);
    }
  };

  const openDecision = (
    mode:
      | "approve"
      | "reject"
  ) => {
    if (!item) {
      return;
    }

    setDecisionMode(mode);
    setReviewNote("");
    setDecisionError(null);

    if (mode === "approve") {
      const midpoint =
        (
          item.suggestedMinPrice +
          item.suggestedMaxPrice
        ) / 2;

      setSalePrice(
        String(
          Math.round(
            midpoint * 100
          ) / 100
        )
      );
    } else {
      setSalePrice("");
    }
  };

  const closeDecision = () => {
    if (decisionLoading) {
      return;
    }

    setDecisionMode(null);
    setReviewNote("");
    setSalePrice("");
    setDecisionError(null);
  };

  const submitDecision =
    async () => {
      if (
        !item ||
        !decisionMode
      ) {
        return;
      }

      const approve =
        decisionMode ===
        "approve";

      let parsedPrice:
        number | null =
        null;

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
            item.suggestedMinPrice ||
          parsedPrice >
            item.suggestedMaxPrice
        ) {
          setDecisionError(
            `Satış fiyatı ${currencyFormatter.format(
              item.suggestedMinPrice
            )} ile ${currencyFormatter.format(
              item.suggestedMaxPrice
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
          `/admin/notes/${item.id}/decision`,
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

        setDecisionMode(null);
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

  const retryPdfGeneration =
    async () => {
      if (!item) {
        return;
      }

      const isRegeneration =
        item.status ===
        "Approved";

      const confirmed =
        window.confirm(
          isRegeneration
            ? "Mevcut PDF korunarak güncel şablonla yeni PDF üretilecek. Devam edilsin mi?"
            : "PDF üretimi yeniden başlatılsın mı?"
        );

      if (!confirmed) {
        return;
      }

      setRetryLoading(true);

      try {
        await api.post(
          `/admin/notes/${item.id}/retry-pdf-generation`
        );

        await load();
      } catch (error) {
        let message =
          "PDF üretim isteği başlatılamadı.";

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

        alert(message);
      } finally {
        setRetryLoading(false);
      }
    };

  if (loading) {
    return (
      <div className="admin-note-detail-feedback">
        Not ayrıntıları yükleniyor...
      </div>
    );
  }

  if (
    error ||
    !item
  ) {
    return (
      <div className="admin-note-detail-feedback admin-note-detail-feedback--error">
        <AlertTriangle size={20} />

        <span>
          {error ??
            "Not bulunamadı."}
        </span>

        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            void load()
          }
        >
          <RefreshCw size={16} />
          Tekrar dene
        </button>
      </div>
    );
  }

  const ai =
    item.aiReview;

  return (
    <div className="admin-note-detail-page">
      <div className="admin-note-detail-top">
        <div>
          <Link
            to="/notes"
            className="admin-note-back"
          >
            <ArrowLeft size={16} />
            Not kontrolüne dön
          </Link>

          <span className="section-kicker">
            Moderasyon çalışma alanı
          </span>

          <h1>
            {item.title}
          </h1>

          <p>
            Not gönderiminin,
            talebin ve AI
            incelemesinin tüm
            ayrıntıları.
          </p>
        </div>

        <StatusBadge
          status={item.status}
        />
      </div>

      <section className="admin-note-hero">
        <div className="admin-note-hero__icon">
          <FileText size={24} />
        </div>

        <div className="admin-note-hero__main">
          <span>
            NOT GÖNDERİMİ
          </span>

          <strong>
            {item.title}
          </strong>

          <p>
            {item.universityName}
            {" · "}
            {item.departmentName}
            {" · "}
            {item.courseName}
          </p>
        </div>

        <div className="admin-note-hero__actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              void previewPdf(
                "original"
              )
            }
            disabled={
              previewing !== null
            }
          >
            <FileText size={16} />

            {previewing ===
            "original"
              ? "Açılıyor..."
              : "Orijinal PDF"}
          </button>

          {item.generatedPdfAvailable && (
            <button
              type="button"
              className="primary-button"
              onClick={() =>
                void previewPdf(
                  "generated"
                )
              }
              disabled={
                previewing !== null
              }
            >
              <Sparkles
                size={16}
              />

              {previewing ===
              "generated"
                ? "Açılıyor..."
                : "NotMark PDF"}
            </button>
          )}
        </div>
      </section>

      <div className="admin-note-detail-grid">
        <div className="admin-note-detail-main">
          <section className="admin-note-section">
            <div className="admin-note-section__heading">
              <div className="admin-note-section__icon">
                <BrainCircuit
                  size={19}
                />
              </div>

              <div>
                <span>
                  AI İNCELEMESİ
                </span>

                <h2>
                  İçerik değerlendirmesi
                </h2>
              </div>
            </div>

            {!ai ? (
              <div className="admin-note-empty">
                Bu not için AI inceleme
                verisi bulunmuyor.
              </div>
            ) : (
              <>
                <div className="admin-note-score-grid">
                  <ScoreCard
                    label="Genel skor"
                    value={
                      ai.overallScore
                    }
                  />

                  <ScoreCard
                    label="Okunabilirlik"
                    value={
                      ai.readabilityScore
                    }
                  />

                  <ScoreCard
                    label="Ders eşleşmesi"
                    value={
                      ai.courseMatchScore
                    }
                  />

                  <ScoreCard
                    label="Bölüm eşleşmesi"
                    value={
                      ai.departmentMatchScore
                    }
                  />

                  <ScoreCard
                    label="İçerik tamlığı"
                    value={
                      ai.contentCompletenessScore
                    }
                  />

                  <ScoreCard
                    label="Orijinallik riski"
                    value={
                      ai.originalityRiskScore
                    }
                    danger
                  />
                </div>

                <div className="admin-ai-summary">
                  <div>
                    <Sparkles
                      size={18}
                    />

                    <strong>
                      AI özeti
                    </strong>
                  </div>

                  <p>
                    {ai.summary}
                  </p>
                </div>

                {ai.findings.length >
                  0 && (
                  <div className="admin-ai-findings">
                    <strong>
                      Bulgular
                    </strong>

                    <div>
                      {ai.findings.map(
                        (
                          finding,
                          index
                        ) => (
                          <span
                            key={
                              index
                            }
                          >
                            <CheckCircle2
                              size={
                                15
                              }
                            />

                            {finding}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                <div className="admin-ai-meta">
                  <span>
                    Model
                    <strong>
                      {
                        ai.modelName
                      }
                    </strong>
                  </span>

                  <span>
                    Prompt
                    <strong>
                      {
                        ai.promptVersion
                      }
                    </strong>
                  </span>

                  <span>
                    Güven
                    <strong>
                      {
                        ai.confidenceScore
                      }
                      /100
                    </strong>
                  </span>

                  <span>
                    Karar
                    <strong>
                      {
                        ai.decision
                      }
                    </strong>
                  </span>
                </div>
              </>
            )}
          </section>

          <section className="admin-note-section">
            <div className="admin-note-section__heading">
              <div className="admin-note-section__icon">
                <GraduationCap
                  size={19}
                />
              </div>

              <div>
                <span>
                  AKADEMİK BAĞLAM
                </span>

                <h2>
                  Talep bilgileri
                </h2>
              </div>
            </div>

            <div className="admin-note-detail-list">
              <DetailRow
                label="Üniversite"
                value={
                  item.universityName
                }
              />

              <DetailRow
                label="Bölüm"
                value={
                  item.departmentName
                }
              />

              <DetailRow
                label="Ders"
                value={
                  item.courseName
                }
              />

              <DetailRow
                label="Sınıf"
                value={`${item.classLevel}. sınıf`}
              />

              <DetailRow
                label="Talep ID"
                value={
                  item.requestId
                }
              />
            </div>
          </section>
        </div>

        <aside className="admin-note-detail-sidebar">
          <section className="admin-note-section">
            <div className="admin-note-section__heading">
              <div className="admin-note-section__icon">
                <UserRound
                  size={19}
                />
              </div>

              <div>
                <span>
                  GÖNDEREN
                </span>

                <h2>
                  Satıcı
                </h2>
              </div>
            </div>

            <DetailRow
              label="Öğrenci"
              value={
                item.sellerName
              }
            />

            <DetailRow
              label="Gönderim"
              value={new Date(
                item.createdAt
              ).toLocaleString(
                "tr-TR"
              )}
            />
          </section>

          <section className="admin-note-section">
            <div className="admin-note-section__heading">
              <div className="admin-note-section__icon">
                ₺
              </div>

              <div>
                <span>
                  FİYATLANDIRMA
                </span>

                <h2>
                  Satış fiyatı
                </h2>
              </div>
            </div>

            <div className="admin-note-price">
              <span>
                Önerilen aralık
              </span>

              <strong>
                {currencyFormatter.format(
                  item.suggestedMinPrice
                )}
                {" – "}
                {currencyFormatter.format(
                  item.suggestedMaxPrice
                )}
              </strong>
            </div>

            <div className="admin-note-price admin-note-price--final">
              <span>
                Belirlenen fiyat
              </span>

              <strong>
                {item.salePrice
                  ? currencyFormatter.format(
                      item.salePrice
                    )
                  : "Henüz belirlenmedi"}
              </strong>
            </div>
          </section>

          <section className="admin-note-section">
            <div className="admin-note-section__heading">
              <div className="admin-note-section__icon">
                <Clock3
                  size={19}
                />
              </div>

              <div>
                <span>
                  PDF PIPELINE
                </span>

                <h2>
                  Üretim bilgileri
                </h2>
              </div>
            </div>

            <DetailRow
              label="Deneme"
              value={String(
                item.pdfGenerationAttemptCount
              )}
            />

            <DetailRow
              label="Model"
              value={
                item.pdfGenerationModelName ??
                "—"
              }
            />

            <DetailRow
              label="Şablon"
              value={
                item.pdfTemplateVersion ??
                "—"
              }
            />

            <DetailRow
              label="Derleyici"
              value={
                item.pdfCompilerName ??
                "—"
              }
            />

            <DetailRow
              label="Üretim zamanı"
              value={
                item.pdfGeneratedAt
                  ? new Date(
                      item.pdfGeneratedAt
                    ).toLocaleString(
                      "tr-TR"
                    )
                  : "—"
              }
            />

            {item.pdfGenerationError && (
              <div className="admin-note-pdf-error">
                <AlertTriangle
                  size={16}
                />

                <span>
                  {
                    item.pdfGenerationError
                  }
                </span>
              </div>
            )}
          </section>
        </aside>
      </div>

      {(item.status === "ManualReview" ||
        item.status === "PdfGenerationFailed" ||
        item.status === "Approved") && (
        <section className="admin-note-action-bar">
          <div>
            <span>
              {item.status === "ManualReview"
                ? "YÖNETİCİ KARARI"
                : "PDF İŞLEMİ"}
            </span>

            <strong>
              {item.status === "ManualReview"
                ? "Bu not için moderasyon kararını tamamlayın."
                : item.status === "PdfGenerationFailed"
                ? "PDF üretimi başarısız oldu."
                : "Onaylanmış PDF yeniden üretilebilir."}
            </strong>
          </div>

          <div className="admin-note-action-bar__buttons">
            {item.status === "ManualReview" && (
              <>
                <button
                  type="button"
                  className="reject-button"
                  onClick={() =>
                    openDecision(
                      "reject"
                    )
                  }
                >
                  <X size={17} />
                  Reddet
                </button>

                <button
                  type="button"
                  className="approve-button"
                  onClick={() =>
                    openDecision(
                      "approve"
                    )
                  }
                >
                  <Check size={17} />
                  Onayla
                </button>
              </>
            )}

            {(item.status === "PdfGenerationFailed" ||
              item.status === "Approved") && (
              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  void retryPdfGeneration()
                }
                disabled={
                  retryLoading
                }
              >
                <RotateCcw size={17} />

                {retryLoading
                  ? "Başlatılıyor..."
                  : item.status === "Approved"
                  ? "PDF'i yeniden üret"
                  : "PDF üretimini tekrar dene"}
              </button>
            )}
          </div>
        </section>
      )}

      {decisionMode && (
        <div
          className="admin-decision-backdrop"
          role="presentation"
        >
          <div
            className="admin-decision-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-decision-title"
          >
            <div className="admin-decision-modal__header">
              <div
                className={
                  decisionMode ===
                  "approve"
                    ? "admin-decision-modal__icon admin-decision-modal__icon--approve"
                    : "admin-decision-modal__icon admin-decision-modal__icon--reject"
                }
              >
                {decisionMode ===
                "approve" ? (
                  <Check size={20} />
                ) : (
                  <X size={20} />
                )}
              </div>

              <div>
                <span>
                  {decisionMode ===
                  "approve"
                    ? "NOT ONAYI"
                    : "NOT REDDİ"}
                </span>

                <h2 id="detail-decision-title">
                  {decisionMode ===
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
              <FileText size={18} />

              <div>
                <strong>
                  {item.title}
                </strong>

                <span>
                  {item.universityName}
                  {" · "}
                  {item.departmentName}
                  {" · "}
                  {item.courseName}
                </span>
              </div>
            </div>

            {decisionMode ===
              "approve" && (
              <>
                <div className="admin-price-range">
                  <span>
                    Önerilen satış
                    aralığı
                  </span>

                  <strong>
                    {currencyFormatter.format(
                      item.suggestedMinPrice
                    )}
                    {" – "}
                    {currencyFormatter.format(
                      item.suggestedMaxPrice
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
                        item.suggestedMinPrice
                      }
                      max={
                        item.suggestedMaxPrice
                      }
                      step="0.01"
                      value={
                        salePrice
                      }
                      onChange={(
                        event
                      ) =>
                        setSalePrice(
                          event.target.value
                        )
                      }
                      disabled={
                        decisionLoading
                      }
                    />

                    <span>TL</span>
                  </div>
                </label>
              </>
            )}

            <label className="admin-decision-field">
              <span>
                {decisionMode ===
                "approve"
                  ? "Onay notu"
                  : "Ret gerekçesi"}

                {decisionMode ===
                  "reject" && (
                  <b>*</b>
                )}
              </span>

              <textarea
                rows={4}
                maxLength={600}
                placeholder={
                  decisionMode ===
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
                    event.target.value
                  )
                }
                disabled={
                  decisionLoading
                }
              />

              <small>
                {reviewNote.length}/600
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
                  decisionMode ===
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
                {decisionMode ===
                "approve" ? (
                  <Check size={17} />
                ) : (
                  <X size={17} />
                )}

                {decisionLoading
                  ? "İşleniyor..."
                  : decisionMode ===
                    "approve"
                  ? "Onayla"
                  : "Reddet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
