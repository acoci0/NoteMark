import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FilterX,
  Search,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import api from "../api/client";

type AuditLogItem = {
  id: number;
  actorUserId: string | null;
  actorDisplayName: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  detailsJson: string | null;
  createdAt: string;
};

type AuditLogResponse = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  availableActions: string[];
  availableEntityTypes: string[];
  items: AuditLogItem[];
};

type Filters = {
  search: string;
  action: string;
  entityType: string;
  from: string;
  to: string;
};

const emptyFilters: Filters = {
  search: "",
  action: "",
  entityType: "",
  from: "",
  to: "",
};

const actionLabels: Record<string, string> = {
  VERIFICATION_APPROVED:
    "Doğrulama onaylandı",

  VERIFICATION_REJECTED:
    "Doğrulama reddedildi",

  NOTE_APPROVED:
    "Not onaylandı",

  NOTE_REJECTED:
    "Not reddedildi",

  NOTE_PDF_GENERATION_REQUESTED:
    "PDF üretimi istendi",

  NOTE_PDF_REGENERATION_REQUESTED:
    "PDF yeniden üretimi istendi",

  NOTE_PDF_GENERATION_RETRIED:
    "PDF üretimi tekrarlandı",

  USER_STATUS_CHANGED:
    "Kullanıcı durumu değişti",
};

const entityLabels: Record<string, string> = {
  StudentVerification:
    "Öğrenci doğrulaması",

  NoteSubmission:
    "Not gönderimi",

  ApplicationUser:
    "Kullanıcı",
};

function getActionLabel(
  action: string
) {
  return (
    actionLabels[action] ??
    action
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(
        /(^|\s)\S/g,
        value =>
          value.toUpperCase()
      )
  );
}

function getEntityLabel(
  entityType: string
) {
  return (
    entityLabels[
      entityType
    ] ??
    entityType
  );
}

function getActionTone(
  action: string
) {
  if (
    action.includes(
      "REJECTED"
    )
  ) {
    return "danger";
  }

  if (
    action.includes(
      "APPROVED"
    )
  ) {
    return "success";
  }

  if (
    action.includes(
      "PDF"
    )
  ) {
    return "info";
  }

  return "neutral";
}

function formatDetails(
  value: string | null
) {
  if (!value) {
    return null;
  }

  try {
    return JSON.stringify(
      JSON.parse(value),
      null,
      2
    );
  } catch {
    return value;
  }
}

export default function AdminAuditLogsPage() {
  const [
    data,
    setData,
  ] =
    useState<AuditLogResponse | null>(
      null
    );

  const [
    filters,
    setFilters,
  ] =
    useState<Filters>(
      emptyFilters
    );

  const [
    appliedFilters,
    setAppliedFilters,
  ] =
    useState<Filters>(
      emptyFilters
    );

  const [
    page,
    setPage,
  ] =
    useState(1);

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
    expandedId,
    setExpandedId,
  ] =
    useState<number | null>(
      null
    );

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<
        string,
        string | number
      > = {
        page,
        pageSize: 25,
      };

      if (
        appliedFilters.search
      ) {
        params.search =
          appliedFilters.search;
      }

      if (
        appliedFilters.action
      ) {
        params.action =
          appliedFilters.action;
      }

      if (
        appliedFilters.entityType
      ) {
        params.entityType =
          appliedFilters.entityType;
      }

      if (
        appliedFilters.from
      ) {
        params.from =
          appliedFilters.from;
      }

      if (
        appliedFilters.to
      ) {
        params.to =
          appliedFilters.to;
      }

      const response =
        await api.get<AuditLogResponse>(
          "/admin/audit-logs",
          {
            params,
          }
        );

      setData(
        response.data
      );
    } catch (requestError) {
      console.error(
        requestError
      );

      setError(
        "İşlem kayıtları yüklenemedi."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [
    page,
    appliedFilters,
  ]);

  const applyFilters = () => {
    setExpandedId(null);
    setPage(1);

    setAppliedFilters({
      ...filters,
      search:
        filters.search.trim(),
    });
  };

  const resetFilters = () => {
    setFilters(
      emptyFilters
    );

    setAppliedFilters(
      emptyFilters
    );

    setExpandedId(null);
    setPage(1);
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="section-kicker">
            Sistem denetimi
          </span>

          <h1>
            İşlem Kayıtları
          </h1>

          <p>
            Yönetim panelinde gerçekleştirilen
            kritik işlemleri, işlem yapan hesabı
            ve kayıt detaylarını inceleyin.
          </p>
        </div>

        <div className="audit-log-summary">
          <span>
            Toplam kayıt
          </span>

          <strong>
            {data?.totalCount ?? "—"}
          </strong>
        </div>
      </div>

      <article className="panel audit-log-panel">
        <form
          className="audit-log-filters"
          onSubmit={event => {
            event.preventDefault();
            applyFilters();
          }}
        >
          <label className="audit-log-search">
            <Search size={17} />

            <input
              value={
                filters.search
              }
              onChange={event =>
                setFilters(
                  current => ({
                    ...current,
                    search:
                      event
                        .target
                        .value,
                  })
                )
              }
              placeholder="İşlem, kullanıcı, kayıt ID veya detay ara"
            />
          </label>

          <select
            value={
              filters.action
            }
            onChange={event =>
              setFilters(
                current => ({
                  ...current,
                  action:
                    event
                      .target
                      .value,
                })
              )
            }
          >
            <option value="">
              Tüm işlemler
            </option>

            {(data?.availableActions ?? []).map(
              action => (
                <option
                  key={
                    action
                  }
                  value={
                    action
                  }
                >
                  {getActionLabel(
                    action
                  )}
                </option>
              )
            )}
          </select>

          <select
            value={
              filters.entityType
            }
            onChange={event =>
              setFilters(
                current => ({
                  ...current,
                  entityType:
                    event
                      .target
                      .value,
                })
              )
            }
          >
            <option value="">
              Tüm kayıt türleri
            </option>

            {(data?.availableEntityTypes ?? []).map(
              entityType => (
                <option
                  key={
                    entityType
                  }
                  value={
                    entityType
                  }
                >
                  {getEntityLabel(
                    entityType
                  )}
                </option>
              )
            )}
          </select>

          <label className="audit-log-date">
            <span>
              Başlangıç
            </span>

            <input
              type="date"
              value={
                filters.from
              }
              onChange={event =>
                setFilters(
                  current => ({
                    ...current,
                    from:
                      event
                        .target
                        .value,
                  })
                )
              }
            />
          </label>

          <label className="audit-log-date">
            <span>
              Bitiş
            </span>

            <input
              type="date"
              value={
                filters.to
              }
              onChange={event =>
                setFilters(
                  current => ({
                    ...current,
                    to:
                      event
                        .target
                        .value,
                  })
                )
              }
            />
          </label>

          <button
            className="primary-button audit-log-filter-button"
            type="submit"
          >
            Filtrele
          </button>

          <button
            className="secondary-button audit-log-reset-button"
            type="button"
            onClick={
              resetFilters
            }
          >
            <FilterX size={16} />
            Temizle
          </button>
        </form>

        {error && (
          <div className="audit-log-error">
            {error}
          </div>
        )}

        <div
          className={
            loading
              ? "table-wrapper audit-log-table-wrapper audit-log-table-wrapper--loading"
              : "table-wrapper audit-log-table-wrapper"
          }
        >
          <table className="audit-log-table">
            <thead>
              <tr>
                <th>
                  Tarih
                </th>

                <th>
                  İşlem
                </th>

                <th>
                  Kayıt türü
                </th>

                <th>
                  İşlemi yapan
                </th>

                <th>
                  Kayıt ID
                </th>

                <th>
                  Detay
                </th>
              </tr>
            </thead>

            <tbody>
              {data?.items.map(
                item => {
                  const details =
                    formatDetails(
                      item.detailsJson
                    );

                  const expanded =
                    expandedId ===
                    item.id;

                  return (
                    <>
                      <tr
                        key={
                          item.id
                        }
                      >
                        <td className="audit-log-date-cell">
                          <strong>
                            {new Date(
                              item.createdAt
                            ).toLocaleDateString(
                              "tr-TR"
                            )}
                          </strong>

                          <span className="table-subtext">
                            {new Date(
                              item.createdAt
                            ).toLocaleTimeString(
                              "tr-TR",
                              {
                                hour:
                                  "2-digit",
                                minute:
                                  "2-digit",
                              }
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`audit-log-action audit-log-action--${getActionTone(
                              item.action
                            )}`}
                          >
                            {getActionLabel(
                              item.action
                            )}
                          </span>

                          <span className="table-subtext audit-log-code">
                            {item.action}
                          </span>
                        </td>

                        <td>
                          {getEntityLabel(
                            item.entityType
                          )}
                        </td>

                        <td>
                          <strong>
                            {item.actorDisplayName ??
                              "Sistem"}
                          </strong>

                          {item.actorEmail && (
                            <span className="table-subtext">
                              {item.actorEmail}
                            </span>
                          )}
                        </td>

                        <td>
                          <code className="audit-log-entity-id">
                            {item.entityId}
                          </code>
                        </td>

                        <td>
                          {details ? (
                            <button
                              type="button"
                              className="audit-log-detail-button"
                              onClick={() =>
                                setExpandedId(
                                  expanded
                                    ? null
                                    : item.id
                                )
                              }
                            >
                              {expanded ? (
                                <>
                                  <ChevronUp
                                    size={
                                      15
                                    }
                                  />
                                  Kapat
                                </>
                              ) : (
                                <>
                                  <ChevronDown
                                    size={
                                      15
                                    }
                                  />
                                  Göster
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="table-subtext">
                              Detay yok
                            </span>
                          )}
                        </td>
                      </tr>

                      {expanded &&
                        details && (
                          <tr
                            key={`${item.id}-details`}
                            className="audit-log-detail-row"
                          >
                            <td
                              colSpan={
                                6
                              }
                            >
                              <div className="audit-log-detail-panel">
                                <div className="audit-log-detail-panel__header">
                                  <span>
                                    Teknik detay
                                  </span>

                                  <code>
                                    #
                                    {
                                      item.id
                                    }
                                  </code>
                                </div>

                                <pre>
                                  {
                                    details
                                  }
                                </pre>
                              </div>
                            </td>
                          </tr>
                        )}
                    </>
                  );
                }
              )}

              {!loading &&
                data?.items.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={
                        6
                      }
                      className="audit-log-empty"
                    >
                      Bu kriterlere uygun
                      işlem kaydı bulunamadı.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>

        <div className="audit-log-pagination">
          <span>
            {data?.totalCount ?? 0} kayıt
            · Sayfa {data?.page ?? 1} /{" "}
            {Math.max(
              data?.totalPages ?? 0,
              1
            )}
          </span>

          <div>
            <button
              type="button"
              className="secondary-button"
              disabled={
                page <= 1 ||
                loading
              }
              onClick={() =>
                setPage(
                  current =>
                    Math.max(
                      1,
                      current - 1
                    )
                )
              }
            >
              <ChevronLeft
                size={
                  17
                }
              />
              Önceki
            </button>

            <button
              type="button"
              className="secondary-button"
              disabled={
                loading ||
                !data ||
                page >=
                  data.totalPages
              }
              onClick={() =>
                setPage(
                  current =>
                    current + 1
                )
              }
            >
              Sonraki
              <ChevronRight
                size={
                  17
                }
              />
            </button>
          </div>
        </div>
      </article>
    </>
  );
}
