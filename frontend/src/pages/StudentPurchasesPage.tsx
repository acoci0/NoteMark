import {
  AlertTriangle,
  Download,
  FileText,
  ReceiptText,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  isAxiosError,
} from "axios";

import studentApi from "../api/studentClient";

import StudentOrderIssueDialog from "../components/StudentOrderIssueDialog";

type ApiErrorResponse = {
  message?: string;
};

type Order = {
  id: string;
  noteSubmissionId: string;
  noteTitle: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
};

export default function StudentPurchasesPage() {
  const [
    orders,
    setOrders,
  ] = useState<Order[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    downloadingId,
    setDownloadingId,
  ] = useState<string | null>(
    null
  );

  const [
    issueOrderId,
    setIssueOrderId,
  ] = useState<string | null>(
    null
  );

  useEffect(() => {
    const load = async () => {
      try {
        const response =
          await studentApi.get<Order[]>(
            "/orders"
          );

        setOrders(
          response.data
        );
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
            "Satın almalar yüklenemedi."
          )
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const download = async (
    order: Order
  ) => {
    setDownloadingId(
      order.id
    );

    setError("");

    try {
      const response =
        await studentApi.get(
          `/orders/${order.id}/download`,
          {
            responseType:
              "blob",
          }
        );

      const url =
        URL.createObjectURL(
          new Blob(
            [response.data],
            {
              type:
                "application/pdf",
            }
          )
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        `notmark-${order.noteSubmissionId}.pdf`;

      document.body.appendChild(
        link
      );

      link.click();
      link.remove();

      URL.revokeObjectURL(
        url
      );
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "PDF indirilemedi."
        )
      );
    } finally {
      setDownloadingId(
        null
      );
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="student-purchases-page">
      <header className="student-purchases-header">
        <div>
          <span className="section-kicker">
            NOTMARK
          </span>

          <div className="student-purchases-title-row">
            <h1>
              Satın Aldıklarım
            </h1>

            {!loading && (
              <span className="student-purchases-count">
                <ReceiptText size={14} />

                {orders.length} sipariş
              </span>
            )}
          </div>

          <p>
            Satın aldığınız notlara erişin
            ve yalnızca sistem kaynaklı
            sorunları bildirin.
          </p>
        </div>
      </header>

      {error && (
        <div className="note-request-message note-request-message--error">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <section className="student-purchases-empty">
          <FileText size={30} />

          <h2>
            Henüz satın alma yok
          </h2>

          <p>
            Satın aldığınız notlar
            burada görüntülenecek.
          </p>
        </section>
      ) : (
        <div className="student-purchases-list">
          {orders.map(
            order => (
              <article
                className="student-purchase-card"
                key={order.id}
              >
                <div className="student-purchase-card__icon">
                  <FileText
                    size={21}
                  />
                </div>

                <div className="student-purchase-card__content">
                  <div className="student-purchase-card__top">
                    <div>
                      <h2>
                        {
                          order.noteTitle
                        }
                      </h2>

                      <span>
                        Sipariş:{" "}
                        {order.id}
                      </span>
                    </div>

                    <OrderStatus
                      status={
                        order.status
                      }
                    />
                  </div>

                  <div className="student-purchase-card__meta">
                    <div>
                      <span>
                        Tutar
                      </span>

                      <strong>
                        {formatMoney(
                          order.amount,
                          order.currency
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Sipariş tarihi
                      </span>

                      <strong>
                        {formatDate(
                          order.createdAt
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Ödeme tarihi
                      </span>

                      <strong>
                        {order.paidAt
                          ? formatDate(
                              order.paidAt
                            )
                          : "—"}
                      </strong>
                    </div>
                  </div>

                  {(order.status === "Paid" ||
                    order.status === "Demo") && (
                    <footer className="student-purchase-card__actions">
                      <button
                        type="button"
                        className="secondary-button nm-action nm-action--accent"
                        disabled={
                          downloadingId ===
                          order.id
                        }
                        onClick={() =>
                          void download(
                            order
                          )
                        }
                      >
                        <Download
                          size={16}
                        />

                        {downloadingId ===
                        order.id
                          ? "İndiriliyor..."
                          : "PDF'i İndir"}
                      </button>

                      {order.status === "Paid" && (
                      <button
                        type="button"
                        className="student-report-problem-button nm-action nm-action--orange"
                        onClick={() =>
                          setIssueOrderId(
                            order.id
                          )
                        }
                      >
                        <AlertTriangle
                          size={16}
                        />

                        Sorun Bildir
                      </button>
                      )}
                    </footer>
                  )}
                </div>
              </article>
            )
          )}
        </div>
      )}

      <StudentOrderIssueDialog
        open={
          issueOrderId !==
          null
        }
        orderId={
          issueOrderId ?? ""
        }
        onClose={() =>
          setIssueOrderId(
            null
          )
        }
      />
    </div>
  );
}

function OrderStatus({
  status,
}: {
  status: string;
}) {
  const labels:
    Record<
      string,
      string
    > = {
      PendingPayment:
        "Ödeme bekliyor",
      Paid:
        "Tamamlandı",
      Demo:
        "Demo satın alma",
      PaymentFailed:
        "Ödeme başarısız",
      Cancelled:
        "İptal edildi",
      Refunded:
        "İade edildi",
    };

  return (
    <span
      className={`student-purchase-status student-purchase-status--${status.toLowerCase()}`}
    >
      {labels[status] ??
        status}
    </span>
  );
}

function formatMoney(
  value: number,
  currency: string
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency,
    }
  ).format(value);
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
      error.response?.data?.message ??
      fallback
    );
  }

  return fallback;
}
