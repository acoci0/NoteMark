import {
  Banknote,
  Clock3,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import api from "../api/client";

type EarningsRange =
  | "week"
  | "month"
  | "sixMonths"
  | "year"
  | "all";

const earningsRangeOptions: Array<{
  value: EarningsRange;
  label: string;
}> = [
  {
    value: "week",
    label: "Son 1 hafta",
  },
  {
    value: "month",
    label: "Son 1 ay",
  },
  {
    value: "sixMonths",
    label: "Son 6 ay",
  },
  {
    value: "year",
    label: "Son 1 yıl",
  },
  {
    value: "all",
    label: "Tüm zamanlar",
  },
];

type EarningsTimelinePoint = {
  date: string;
  salesIncome: number;
  purchaseExpense: number;
};

type RecentSale = {
  orderId: string;
  noteSubmissionId: string;
  noteTitle: string;
  grossAmount: number;
  sellerEarningAmount: number;
  currency: string;
  soldAt: string;
};

type EarningsSummary = {
  totalSales: number;
  totalPurchases: number;
  salesIncome: number;
  purchaseExpense: number;
  netProfit: number;
  pendingRevenue: number;
  currency: string;
  recentSales: RecentSale[];
  timeline: EarningsTimelinePoint[];
};

function formatMoney(
  value: number,
  currency = "TRY"
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function formatDate(
  value: string
) {
  return new Date(
    value
  ).toLocaleString(
    "tr-TR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function EarningsLineChart({
  data,
  range,
  rangeLabel,
}: {
  data: EarningsTimelinePoint[];
  range: EarningsRange;
  rangeLabel: string;
}) {
  const width = 900;
  const height = 270;

  const padding = {
    top: 24,
    right: 24,
    bottom: 42,
    left: 58,
  };

  const chartWidth =
    width -
    padding.left -
    padding.right;

  const chartHeight =
    height -
    padding.top -
    padding.bottom;

  const values =
    data.flatMap(
      point => [
        point.salesIncome,
        point.purchaseExpense,
      ]
    );

  const rawMax =
    Math.max(
      0,
      ...values
    );

  /*
   * Tüm değerler 0 olsa bile grafik
   * düzgün bir ölçekle gösterilir.
   */
  const maxValue =
    rawMax > 0
      ? rawMax * 1.15
      : 100;

  const x = (
    index: number
  ) => {
    if (data.length <= 1) {
      return padding.left;
    }

    return (
      padding.left +
      (
        index /
        (data.length - 1)
      ) *
      chartWidth
    );
  };

  const y = (
    value: number
  ) =>
    padding.top +
    chartHeight -
    (
      value /
      maxValue
    ) *
    chartHeight;

  const makePath = (
    key:
      | "salesIncome"
      | "purchaseExpense"
  ) =>
    data
      .map(
        (
          point,
          index
        ) => {
          const command =
            index === 0
              ? "M"
              : "L";

          return `${command} ${x(
            index
          )} ${y(
            point[key]
          )}`;
        }
      )
      .join(" ");

  const salesPath =
    makePath(
      "salesIncome"
    );

  const purchasePath =
    makePath(
      "purchaseExpense"
    );

  const gridLevels =
    [0, 0.25, 0.5, 0.75, 1];

  const labelIndexes = (() => {
    if (
      data.length === 0
    ) {
      return [];
    }

    /*
     * Son 1 haftada özellikle
     * 7 günün tamamını göster.
     */
    if (
      range === "week"
    ) {
      return data.map(
        (_, index) =>
          index
      );
    }

    /*
     * Yıllık grafikte aylık noktalar
     * az olduğu için hepsini göster.
     */
    if (
      range === "year" &&
      data.length <= 13
    ) {
      return data.map(
        (_, index) =>
          index
      );
    }

    /*
     * Tüm zamanlarda veri azsa
     * tüm ay etiketlerini koru.
     */
    if (
      range === "all" &&
      data.length <= 12
    ) {
      return data.map(
        (_, index) =>
          index
      );
    }

    /*
     * Diğer uzun aralıklarda
     * ekseni gereksiz kalabalıklaştırma.
     */
    const divisions =
      range ===
      "sixMonths"
        ? 6
        : 5;

    return Array.from(
      new Set(
        Array.from(
          {
            length:
              divisions,
          },
          (_, position) =>
            Math.round(
              (
                position /
                (divisions - 1)
              ) *
              (
                data.length -
                1
              )
            )
        )
      )
    );
  })();

  const formatShortDate = (
    value: string
  ) => {
    const date =
      new Date(
        `${value}T00:00:00`
      );

    if (
      range === "all"
    ) {
      return String(
        date.getFullYear()
      );
    }

    if (
      range === "year"
    ) {
      return date.toLocaleDateString(
        "tr-TR",
        {
          month: "short",
        }
      );
    }

    return date.toLocaleDateString(
      "tr-TR",
      {
        day: "2-digit",
        month: "short",
      }
    );
  };

  const formatAxisMoney = (
    value: number
  ) =>
    new Intl.NumberFormat(
      "tr-TR",
      {
        maximumFractionDigits: 0,
      }
    ).format(value);

  if (data.length === 0) {
    return (
      <div className="student-finance-chart-empty">
        Grafik verisi bulunamadı.
      </div>
    );
  }

  return (
    <div className="student-finance-chart">
      <div className="student-finance-chart__legend">
        <span>
          <i className="student-finance-chart__dot student-finance-chart__dot--sales" />
          Satış geliri
        </span>

        <span>
          <i className="student-finance-chart__dot student-finance-chart__dot--purchase" />
          Alış gideri
        </span>

        <small>
          {rangeLabel}
        </small>
      </div>

      <div className="student-finance-chart__canvas">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Son 30 günlük alış ve satış grafiği"
        >
          {gridLevels.map(
            level => {
              const value =
                maxValue *
                level;

              const lineY =
                y(value);

              return (
                <g
                  key={
                    level
                  }
                >
                  <line
                    x1={
                      padding.left
                    }
                    x2={
                      width -
                      padding.right
                    }
                    y1={
                      lineY
                    }
                    y2={
                      lineY
                    }
                    className="student-finance-chart__grid"
                  />

                  <text
                    x={
                      padding.left -
                      10
                    }
                    y={
                      lineY + 4
                    }
                    textAnchor="end"
                    className="student-finance-chart__axis-text"
                  >
                    ₺
                    {formatAxisMoney(
                      value
                    )}
                  </text>
                </g>
              );
            }
          )}

          {labelIndexes.map(
            index => (
              <text
                key={
                  index
                }
                x={
                  x(index)
                }
                y={
                  height - 12
                }
                textAnchor="middle"
                className="student-finance-chart__axis-text"
              >
                {formatShortDate(
                  data[index].date
                )}
              </text>
            )
          )}

          <path
            d={
              purchasePath
            }
            fill="none"
            className="student-finance-chart__line student-finance-chart__line--purchase"
          />

          <path
            d={
              salesPath
            }
            fill="none"
            className="student-finance-chart__line student-finance-chart__line--sales"
          />

          {data.map(
            (
              point,
              index
            ) => (
              <g
                key={
                  point.date
                }
              >
                <circle
                  cx={
                    x(index)
                  }
                  cy={
                    y(
                      point.purchaseExpense
                    )
                  }
                  r="4"
                  className="student-finance-chart__point student-finance-chart__point--purchase"
                >
                  <title>
                    {formatShortDate(
                      point.date
                    )} · Alış gideri: ₺
                    {point.purchaseExpense.toLocaleString(
                      "tr-TR",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </title>
                </circle>

                <circle
                  cx={
                    x(index)
                  }
                  cy={
                    y(
                      point.salesIncome
                    )
                  }
                  r="4"
                  className="student-finance-chart__point student-finance-chart__point--sales"
                >
                  <title>
                    {formatShortDate(
                      point.date
                    )} · Satış geliri: ₺
                    {point.salesIncome.toLocaleString(
                      "tr-TR",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </title>
                </circle>
              </g>
            )
          )}
        </svg>
      </div>
    </div>
  );
}

export default function StudentEarningsPage() {
  const [
    data,
    setData,
  ] =
    useState<EarningsSummary | null>(
      null
    );


  const [
    range,
    setRange,
  ] =
    useState<EarningsRange>(
      "month"
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    chartLoading,
    setChartLoading,
  ] =
    useState(false);

  const requestVersionRef =
    useRef(0);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const load = async () => {
    const requestVersion =
      ++requestVersionRef.current;

    const initialLoad =
      data === null;

    if (initialLoad) {
      setLoading(true);
    } else {
      setChartLoading(true);
    }

    setError(null);

    try {
      const response =
        await api.get<EarningsSummary>(
          "/student/earnings",
          {
            params: {
              range,
              /*
               * Aynı URL'nin tarayıcı/proxy
               * tarafından eski cevapla
               * eşleşmesini engeller.
               */
              _: Date.now(),
            },
          }
        );

      /*
       * Kullanıcı filtrelere hızlı basarsa
       * eski isteğin yeni grafiğin üzerine
       * yazmasını engeller.
       */
      if (
        requestVersion !==
        requestVersionRef.current
      ) {
        return;
      }

      setData(
        response.data
      );
    } catch (error) {
      if (
        requestVersion !==
        requestVersionRef.current
      ) {
        return;
      }

      console.error(
        "Kazanç bilgileri alınamadı:",
        error
      );

      setError(
        "Kazanç bilgileri şu anda yüklenemiyor."
      );
    } finally {
      if (
        requestVersion ===
        requestVersionRef.current
      ) {
        setLoading(false);
        setChartLoading(false);
      }
    }
  };

  useEffect(() => {
    void load();
  }, [range]);

  if (loading) {
    return (
      <div className="student-earnings-state">
        Kazanç bilgileri yükleniyor...
      </div>
    );
  }

  if (
    error ||
    !data
  ) {
    return (
      <div className="student-earnings-state student-earnings-state--error">
        <strong>
          Kazanç bilgileri yüklenemedi
        </strong>

        <span>
          {error}
        </span>

        <button
          type="button"
          onClick={() =>
            void load()
          }
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  return (
    <div className="student-earnings-page">
      <header className="student-earnings-heading">
        <div>
          <span>
            NOTMARK
          </span>

          <h1>
            Finansal Panel
          </h1>

          <p>
            Satış gelirlerinizi, alış giderlerinizi
            ve finansal hareketlerinizi tek merkezden takip edin.
          </p>
        </div>

        <div className="student-earnings-heading__badge">
          <WalletCards size={18} />
          Genel Özet
        </div>
      </header>

      <section className="student-earnings-summary-grid">
        <article className="student-earning-card">
          <div className="student-earning-card__icon">
            <ReceiptText size={20} />
          </div>

          <span>
            Toplam satış
          </span>

          <strong>
            {data.totalSales}
          </strong>

          <small>
            Tamamlanmış satış
          </small>
        </article>

        <article className="student-earning-card">
          <div className="student-earning-card__icon">
            <Banknote size={20} />
          </div>

          <span>
            Satış geliri
          </span>

          <strong>
            {formatMoney(
              data.salesIncome,
              data.currency
            )}
          </strong>

          <small>
            Satışlardan elde edilen gelir
          </small>
        </article>

        <article className="student-earning-card">
          <div className="student-earning-card__icon">
            <ShoppingBag size={20} />
          </div>

          <span>
            Alış gideri
          </span>

          <strong>
            {formatMoney(
              data.purchaseExpense,
              data.currency
            )}
          </strong>

          <small>
            Satın alınan notlar
          </small>
        </article>

        <article className="student-earning-card student-earning-card--net">
          <div className="student-earning-card__icon">
            <Clock3 size={20} />
          </div>

          <span>
            Bekleyen satış geliri
          </span>

          <strong>
            {formatMoney(
              data.pendingRevenue,
              data.currency
            )}
          </strong>

          <small>
            Henüz tamamlanmamış satışlar
          </small>
        </article>
      </section>

      <div className="student-earnings-content-grid">
        <section className="student-earnings-panel student-finance-summary student-finance-chart-panel">
          <div className="student-earnings-panel__heading">
            <div>
              <span>
                GELİR / GİDER
              </span>

              <h2>
                Finans özeti
              </h2>
            </div>

            <TrendingUp size={20} />
          </div>

          <div className="student-finance-range-filter">
            {earningsRangeOptions.map(
              option => (
                <button
                  type="button"
                  key={
                    option.value
                  }
                  className={
                    range ===
                    option.value
                      ? "student-finance-range-filter__button student-finance-range-filter__button--active"
                      : "student-finance-range-filter__button"
                  }
                  onClick={() =>
                    setRange(
                      option.value
                    )
                  }
                >
                  {option.label}
                </button>
              )
            )}
          </div>

          <div
            className={
              chartLoading
                ? "student-finance-chart-wrapper student-finance-chart-wrapper--loading"
                : "student-finance-chart-wrapper"
            }
          >
            <EarningsLineChart
              data={
                data.timeline ?? []
              }
              range={
                range
              }
              rangeLabel={
                earningsRangeOptions.find(
                  option =>
                    option.value ===
                    range
                )?.label ??
                "Son 1 ay"
              }
            />

            {chartLoading && (
              <div className="student-finance-chart-loading">
                Grafik güncelleniyor...
              </div>
            )}
          </div>
        </section>

        <section className="student-earnings-panel">
          <div className="student-earnings-panel__heading">
            <div>
              <span>
                HAREKETLER
              </span>

              <h2>
                İşlem özeti
              </h2>
            </div>

            <WalletCards size={20} />
          </div>

          <div className="student-transaction-summary">
            <div>
              <span>
                Tamamlanmış satış
              </span>

              <strong>
                {data.totalSales}
              </strong>
            </div>

            <div>
              <span>
                Tamamlanmış alış
              </span>

              <strong>
                {data.totalPurchases}
              </strong>
            </div>

            <div>
              <span>
                Bekleyen satış geliri
              </span>

              <strong>
                {formatMoney(
                  data.pendingRevenue,
                  data.currency
                )}
              </strong>
            </div>
          </div>
        </section>
      </div>

      <section className="student-earnings-panel student-recent-sales">
        <div className="student-earnings-panel__heading">
          <div>
            <span>
              SATIŞ GEÇMİŞİ
            </span>

            <h2>
              Son satışlar
            </h2>
          </div>

          <ReceiptText size={20} />
        </div>

        {data.recentSales.length ===
        0 ? (
          <div className="student-recent-sales__empty">
            <ReceiptText size={28} />

            <strong>
              Henüz tamamlanmış satış yok
            </strong>

            <span>
              İlk satışın gerçekleştiğinde
              burada görünecek.
            </span>
          </div>
        ) : (
          <div className="student-recent-sales__list">
            {data.recentSales.map(
              sale => (
                <article
                  className="student-sale-row student-sale-row--simple"
                  key={
                    sale.orderId
                  }
                >
                  <div className="student-sale-row__icon">
                    <ReceiptText size={18} />
                  </div>

                  <div className="student-sale-row__title">
                    <strong>
                      {sale.noteTitle}
                    </strong>

                    <span>
                      {formatDate(
                        sale.soldAt
                      )}
                    </span>
                  </div>

                  <div className="student-sale-row__money">
                    <span>
                      Satış fiyatı
                    </span>

                    <strong>
                      {formatMoney(
                        sale.grossAmount,
                        sale.currency
                      )}
                    </strong>
                  </div>

                  <div className="student-sale-row__money student-sale-row__money--net">
                    <span>
                      Satış geliri
                    </span>

                    <strong>
                      {formatMoney(
                        sale.sellerEarningAmount,
                        sale.currency
                      )}
                    </strong>
                  </div>
                </article>
              )
            )}
          </div>
        )}

        {data.pendingRevenue >
          0 && (
          <div className="student-pending-income">
            <Clock3 size={15} />

            <span>
              Bekleyen satış geliri:
            </span>

            <strong>
              {formatMoney(
                data.pendingRevenue,
                data.currency
              )}
            </strong>
          </div>
        )}
      </section>
    </div>
  );
}
