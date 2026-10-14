import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

import api from "../api/client";

type ComplaintItem = {
  id: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  category: string;
  subject: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type ComplaintPage = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  availableStatuses: string[];
  availableCategories: string[];
  items: ComplaintItem[];
};

type ComplaintDetail = {
  id: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  category: string;
  subject: string;
  description: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  relatedEntityTitle: string | null;
  status: string;
  adminResponse: string | null;
  reviewedByUserId: string | null;
  reviewedByDisplayName: string | null;
  reviewedByEmail: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const statusLabels: Record<string, string> = {
  Open: "Açık",
  InReview: "İnceleniyor",
  Resolved: "Sonuçlandı",
  Rejected: "Reddedildi",
};

const categoryLabels: Record<string, string> = {
  Verification: "Doğrulama",
  Note: "Not",
  Order: "Sipariş",
  Account: "Hesap",
  Other: "Diğer",
};

function formatDate(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(
    "tr-TR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

function statusClass(
  status: string
) {
  switch (status) {
    case "Resolved":
      return "admin-complaint-status admin-complaint-status--resolved";

    case "Rejected":
      return "admin-complaint-status admin-complaint-status--rejected";

    case "InReview":
      return "admin-complaint-status admin-complaint-status--review";

    default:
      return "admin-complaint-status admin-complaint-status--open";
  }
}

function StatusIcon({
  status,
}: {
  status: string;
}) {
  switch (status) {
    case "Resolved":
      return <CheckCircle2 size={14} />;

    case "Rejected":
      return <XCircle size={14} />;

    case "InReview":
      return <Clock3 size={14} />;

    default:
      return <AlertTriangle size={14} />;
  }
}

export default function AdminComplaintsPage() {
  const [
    data,
    setData,
  ] =
    useState<ComplaintPage | null>(
      null
    );

  const [
    selected,
    setSelected,
  ] =
    useState<ComplaintDetail | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    detailLoading,
    setDetailLoading,
  ] =
    useState(false);

  const [
    decisionBusy,
    setDecisionBusy,
  ] =
    useState(false);

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    status,
    setStatus,
  ] =
    useState("");

  const [
    category,
    setCategory,
  ] =
    useState("");

  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    adminResponse,
    setAdminResponse,
  ] =
    useState("");

  const load = async (
    targetPage = page
  ) => {
    setLoading(true);

    try {
      const response =
        await api.get<ComplaintPage>(
          "/admin/complaints",
          {
            params: {
              page: targetPage,
              pageSize: 25,
              search:
                search.trim() ||
                undefined,
              status:
                status ||
                undefined,
              category:
                category ||
                undefined,
            },
          }
        );

      setData(response.data);
      setPage(targetPage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1);
  }, []);

  const openDetail =
    async (
      id: string
    ) => {
      setDetailLoading(true);

      try {
        const response =
          await api.get<ComplaintDetail>(
            `/admin/complaints/${id}`
          );

        setSelected(
          response.data
        );

        setAdminResponse(
          response.data
            .adminResponse ??
            ""
        );
      } finally {
        setDetailLoading(false);
      }
    };

  const decide =
    async (
      nextStatus: string
    ) => {
      if (!selected) {
        return;
      }

      if (
        (
          nextStatus ===
            "Resolved" ||
          nextStatus ===
            "Rejected"
        ) &&
        adminResponse.trim()
          .length < 5
      ) {
        alert(
          "Sonuçlandırma veya ret işleminde en az 5 karakterlik açıklama yazmalısınız."
        );

        return;
      }

      setDecisionBusy(true);

      try {
        const response =
          await api.post<ComplaintDetail>(
            `/admin/complaints/${selected.id}/decision`,
            {
              status:
                nextStatus,

              adminResponse:
                adminResponse.trim() ||
                null,
            }
          );

        setSelected(
          response.data
        );

        setAdminResponse(
          response.data
            .adminResponse ??
            ""
        );

        await load(page);
      } finally {
        setDecisionBusy(false);
      }
    };

  const applyFilters = () => {
    void load(1);
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setCategory("");
    setPage(1);

    setTimeout(
      () => {
        setLoading(true);

        api.get<ComplaintPage>(
          "/admin/complaints",
          {
            params: {
              page: 1,
              pageSize: 25,
            },
          }
        )
          .then(
            response =>
              setData(
                response.data
              )
          )
          .finally(
            () =>
              setLoading(
                false
              )
          );
      },
      0
    );
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="section-kicker">
            Moderasyon
          </span>

          <h1>
            Şikâyetler / İtirazlar
          </h1>

          <p>
            Öğrenci
            başvurularını
            inceleyin,
            ilişkili kayıtları
            kontrol edin ve
            sonuçlandırın.
          </p>
        </div>
      </div>

      <section className="admin-complaint-summary-grid">
        <article className="panel admin-complaint-summary">
          <ShieldAlert size={20} />

          <div>
            <span>
              Toplam başvuru
            </span>

            <strong>
              {data?.totalCount ??
                0}
            </strong>
          </div>
        </article>

        <article className="panel admin-complaint-summary">
          <AlertTriangle size={20} />

          <div>
            <span>
              Açık
            </span>

            <strong>
              {data?.items.filter(
                x =>
                  x.status ===
                  "Open"
              ).length ?? 0}
            </strong>
          </div>
        </article>

        <article className="panel admin-complaint-summary">
          <Clock3 size={20} />

          <div>
            <span>
              İncelenen
            </span>

            <strong>
              {data?.items.filter(
                x =>
                  x.status ===
                  "InReview"
              ).length ?? 0}
            </strong>
          </div>
        </article>

        <article className="panel admin-complaint-summary">
          <CheckCircle2 size={20} />

          <div>
            <span>
              Sonuçlanan
            </span>

            <strong>
              {data?.items.filter(
                x =>
                  x.status ===
                  "Resolved"
              ).length ?? 0}
            </strong>
          </div>
        </article>
      </section>

      <article className="panel admin-complaints-filter-panel">
        <div className="admin-complaints-filters">
          <label className="admin-complaint-search">
            <Search size={16} />

            <input
              value={search}
              placeholder="Kullanıcı, konu veya kayıt ID ara"
              onChange={
                event =>
                  setSearch(
                    event.target.value
                  )
              }
              onKeyDown={
                event => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    applyFilters();
                  }
                }
              }
            />
          </label>

          <select
            value={status}
            onChange={
              event =>
                setStatus(
                  event.target.value
                )
            }
          >
            <option value="">
              Tüm durumlar
            </option>

            {data?.availableStatuses.map(
              value => (
                <option
                  key={
                    value
                  }
                  value={
                    value
                  }
                >
                  {
                    statusLabels[
                      value
                    ] ??
                    value
                  }
                </option>
              )
            )}
          </select>

          <select
            value={category}
            onChange={
              event =>
                setCategory(
                  event.target.value
                )
            }
          >
            <option value="">
              Tüm kategoriler
            </option>

            {data?.availableCategories.map(
              value => (
                <option
                  key={
                    value
                  }
                  value={
                    value
                  }
                >
                  {
                    categoryLabels[
                      value
                    ] ??
                    value
                  }
                </option>
              )
            )}
          </select>

          <button
            type="button"
            className="primary-button"
            onClick={
              applyFilters
            }
          >
            Uygula
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={
              resetFilters
            }
          >
            Temizle
          </button>
        </div>
      </article>

      <article className="panel admin-complaints-table-panel">
        {loading ? (
          <div className="admin-complaints-empty">
            Başvurular
            yükleniyor...
          </div>
        ) : !data ||
          data.items.length ===
            0 ? (
          <div className="admin-complaints-empty">
            Filtrelerle
            eşleşen başvuru
            bulunamadı.
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>
                      Kullanıcı
                    </th>

                    <th>
                      Kategori
                    </th>

                    <th>
                      Başvuru
                    </th>

                    <th>
                      İlgili kayıt
                    </th>

                    <th>
                      Durum
                    </th>

                    <th>
                      Tarih
                    </th>

                    <th />
                  </tr>
                </thead>

                <tbody>
                  {data.items.map(
                    item => (
                      <tr
                        key={
                          item.id
                        }
                      >
                        <td>
                          <strong>
                            {
                              item.userDisplayName
                            }
                          </strong>

                          <span className="table-subtext">
                            {
                              item.userEmail
                            }
                          </span>
                        </td>

                        <td>
                          {
                            categoryLabels[
                              item.category
                            ] ??
                            item.category
                          }
                        </td>

                        <td className="admin-complaint-subject-cell">
                          <strong>
                            {
                              item.subject
                            }
                          </strong>

                          <span className="table-subtext">
                            #
                            {item.id.slice(
                              0,
                              8
                            )}
                          </span>
                        </td>

                        <td>
                          {item.relatedEntityType
                            ? (
                              <>
                                <strong>
                                  {
                                    item.relatedEntityType
                                  }
                                </strong>

                                <span className="table-subtext">
                                  {item.relatedEntityId?.slice(
                                    0,
                                    8
                                  )}
                                </span>
                              </>
                            )
                            : "—"}
                        </td>

                        <td>
                          <span
                            className={
                              statusClass(
                                item.status
                              )
                            }
                          >
                            <StatusIcon
                              status={
                                item.status
                              }
                            />

                            {
                              statusLabels[
                                item.status
                              ] ??
                              item.status
                            }
                          </span>
                        </td>

                        <td>
                          {formatDate(
                            item.createdAt
                          )}
                        </td>

                        <td className="table-actions">
                          <button
                            type="button"
                            className="secondary-button admin-complaint-inspect-button"
                            onClick={() =>
                              void openDetail(
                                item.id
                              )
                            }
                          >
                            <Eye
                              size={15}
                            />

                            İncele
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="admin-complaints-pagination">
              <span>
                Toplam{" "}
                {
                  data.totalCount
                }{" "}
                başvuru
              </span>

              <div>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={
                    page <= 1
                  }
                  onClick={() =>
                    void load(
                      page - 1
                    )
                  }
                >
                  Önceki
                </button>

                <span>
                  {page} /{" "}
                  {Math.max(
                    data.totalPages,
                    1
                  )}
                </span>

                <button
                  type="button"
                  className="secondary-button"
                  disabled={
                    page >=
                    data.totalPages
                  }
                  onClick={() =>
                    void load(
                      page + 1
                    )
                  }
                >
                  Sonraki
                </button>
              </div>
            </div>
          </>
        )}
      </article>

      {(selected ||
        detailLoading) && (
        <div
          className="admin-complaint-modal-backdrop"
          onMouseDown={() =>
            !decisionBusy &&
            setSelected(null)
          }
        >
          <section
            className="admin-complaint-modal"
            onMouseDown={
              event =>
                event.stopPropagation()
            }
          >
            {detailLoading &&
            !selected ? (
              <div className="admin-complaints-empty">
                Başvuru
                yükleniyor...
              </div>
            ) : selected ? (
              <>
                <div className="admin-complaint-modal__header">
                  <div>
                    <span className="section-kicker">
                      Başvuru detayı
                    </span>

                    <h2>
                      {
                        selected.subject
                      }
                    </h2>

                    <span
                      className={
                        statusClass(
                          selected.status
                        )
                      }
                    >
                      <StatusIcon
                        status={
                          selected.status
                        }
                      />

                      {
                        statusLabels[
                          selected.status
                        ] ??
                        selected.status
                      }
                    </span>
                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    disabled={
                      decisionBusy
                    }
                    onClick={() =>
                      setSelected(
                        null
                      )
                    }
                  >
                    Kapat
                  </button>
                </div>

                <div className="admin-complaint-detail-grid">
                  <div>
                    <span>
                      Kullanıcı
                    </span>

                    <strong>
                      {
                        selected.userDisplayName
                      }
                    </strong>

                    <small>
                      {
                        selected.userEmail
                      }
                    </small>
                  </div>

                  <div>
                    <span>
                      Kategori
                    </span>

                    <strong>
                      {
                        categoryLabels[
                          selected.category
                        ] ??
                        selected.category
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Oluşturulma
                    </span>

                    <strong>
                      {formatDate(
                        selected.createdAt
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Son işlem
                    </span>

                    <strong>
                      {formatDate(
                        selected.updatedAt
                      )}
                    </strong>
                  </div>
                </div>

                <div className="admin-complaint-content-block">
                  <span>
                    Öğrenci açıklaması
                  </span>

                  <p>
                    {
                      selected.description
                    }
                  </p>
                </div>

                {selected.relatedEntityType && (
                  <div className="admin-complaint-content-block">
                    <span>
                      İlgili kayıt
                    </span>

                    <strong>
                      {selected.relatedEntityTitle ??
                        selected.relatedEntityType}
                    </strong>

                    <code>
                      {
                        selected.relatedEntityId
                      }
                    </code>
                  </div>
                )}

                <div className="admin-complaint-content-block">
                  <span>
                    Admin açıklaması
                  </span>

                  <textarea
                    rows={5}
                    maxLength={
                      2000
                    }
                    disabled={
                      selected.status ===
                        "Resolved" ||
                      selected.status ===
                        "Rejected" ||
                      decisionBusy
                    }
                    value={
                      adminResponse
                    }
                    onChange={
                      event =>
                        setAdminResponse(
                          event.target.value
                        )
                    }
                    placeholder="İnceleme sonucu veya öğrenciye gösterilecek açıklama..."
                  />

                  <small className="admin-complaint-character-count">
                    {
                      adminResponse.length
                    }{" "}
                    / 2000
                  </small>
                </div>

                {selected.reviewedByDisplayName && (
                  <div className="admin-complaint-review-meta">
                    Son işlem:{" "}
                    <strong>
                      {
                        selected.reviewedByDisplayName
                      }
                    </strong>

                    {selected.reviewedAt &&
                      ` · ${formatDate(
                        selected.reviewedAt
                      )}`}
                  </div>
                )}

                {selected.status !==
                  "Resolved" &&
                  selected.status !==
                    "Rejected" && (
                    <div className="admin-complaint-modal__actions">
                      {selected.status ===
                        "Open" && (
                        <button
                          type="button"
                          className="admin-complaint-action admin-complaint-action--review"
                          disabled={
                            decisionBusy
                          }
                          onClick={() =>
                            void decide(
                              "InReview"
                            )
                          }
                        >
                          <Clock3
                            size={16}
                          />
                          İncelemeye al
                        </button>
                      )}

                      <button
                        type="button"
                        className="admin-complaint-action admin-complaint-action--resolve"
                        disabled={
                          decisionBusy
                        }
                        onClick={() =>
                          void decide(
                            "Resolved"
                          )
                        }
                      >
                        <CheckCircle2
                          size={16}
                        />
                        Sonuçlandır
                      </button>

                      <button
                        type="button"
                        className="admin-complaint-action admin-complaint-action--reject"
                        disabled={
                          decisionBusy
                        }
                        onClick={() =>
                          void decide(
                            "Rejected"
                          )
                        }
                      >
                        <XCircle
                          size={16}
                        />
                        Reddet
                      </button>
                    </div>
                  )}
              </>
            ) : null}
          </section>
        </div>
      )}
    </>
  );
}
