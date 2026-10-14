
import {

  ArrowLeft,

  BookOpen,

  FileCheck2,

  ReceiptText,

  ShoppingBag,

  Upload,

  UserRound,

  WalletCards,

} from "lucide-react";

import {

  useEffect,

  useState,

} from "react";

import {

  useNavigate,

  useParams,

} from "react-router-dom";

import api from "../api/client";

import StatusBadge from "../components/StatusBadge";

type Verification = {

  id: string;

  universityName: string;

  facultyName: string;

  departmentName: string;

  documentIssueDate: string;

  status: string;

  reviewNote: string | null;

  reviewedAt: string | null;

  expiresAt: string | null;

  createdAt: string;

};

type NoteRequest = {

  id: string;

  universityName: string;

  departmentName: string;

  courseName: string;

  classLevel: number;

  topic: string | null;

  contentType: string | null;

  questionCount: number | null;

  suggestedMinPrice: number;

  suggestedMaxPrice: number;

  submissionCount: number;

  createdAt: string;

};

type NoteSubmission = {

  id: string;

  requestId: string;

  title: string;

  courseName: string;

  status: string;

  matchScore: number;

  readabilityScore: number;

  originalityRiskScore: number;

  salePrice: number | null;

  createdAt: string;

};

type Order = {

  orderId: string;

  noteSubmissionId: string;

  noteTitle: string;

  grossAmount: number;

  platformCommissionAmount: number;

  sellerEarningAmount: number;

  currency: string;

  status: string;

  paidAt: string | null;

  createdAt: string;

};

type AuditItem = {

  id: number;

  action: string;

  entityType: string;

  entityId: string;

  detailsJson: string | null;

  createdAt: string;

};

type UserDetail = {

  id: string;

  email: string;

  displayName: string;

  role: string;

  status: string;

  createdAt: string;

  lastLoginAt: string | null;

  summary: {

    verificationCount: number;

    noteRequestCount: number;

    noteSubmissionCount: number;

    totalPurchases: number;

    totalSales: number;

    purchaseExpense: number;

    salesIncome: number;

    pendingSalesIncome: number;

    currency: string;

  };

  verifications: Verification[];

  noteRequests: NoteRequest[];

  noteSubmissions: NoteSubmission[];

  purchases: Order[];

  sales: Order[];

  recentActivity: AuditItem[];

};

const moneyFormatter =

  new Intl.NumberFormat(

    "tr-TR",

    {

      style: "currency",

      currency: "TRY",

    }

  );

function formatDate(

  value: string | null

) {

  if (!value) {

    return "—";

  }

  return new Date(

    value

  ).toLocaleString(

    "tr-TR",

    {

      dateStyle: "medium",

      timeStyle: "short",

    }

  );

}

function formatShortDate(

  value: string | null

) {

  if (!value) {

    return "—";

  }

  return new Date(

    value

  ).toLocaleDateString(

    "tr-TR"

  );

}

function contentTypeLabel(

  value: string | null

) {

  switch (value) {

    case "NoteOnly":

      return "Ders notu";

    case "DetailedSummary":

      return "Detaylı özet";

    case "StudyQuestions":

      return "Çalışma soruları";

    default:

      return "Eski kayıt";

  }

}

function actionLabel(

  action: string

) {

  const labels:

    Record<string, string> = {

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

        "Kullanıcı durumu değiştirildi",

    };

  return (

    labels[action] ??

    action

  );

}

export default function AdminUserDetailPage() {

  const { id } =

    useParams();

  const navigate =

    useNavigate();

  const [

    data,

    setData,

  ] =

    useState<UserDetail | null>(

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

    statusBusy,

    setStatusBusy,

  ] =

    useState(false);

  const load = async () => {

    if (!id) {

      return;

    }

    setLoading(true);

    setError(null);

    try {

      const response =

        await api.get<UserDetail>(

          `/admin/users/${id}`

        );

      setData(

        response.data

      );

    } catch (requestError) {

      console.error(

        requestError

      );

      setError(

        "Kullanıcı detayları yüklenemedi."

      );

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    void load();

  }, [id]);

  const toggleStatus =

    async () => {

      if (!data) {

        return;

      }

      setStatusBusy(true);

      try {

        await api.patch(

          `/admin/users/${data.id}/status`,

          {

            status:

              data.status ===

              "Active"

                ? "Suspended"

                : "Active",

          }

        );

        await load();

      } finally {

        setStatusBusy(false);

      }

    };

  if (loading) {

    return (

      <article className="panel admin-user-detail-loading">

        Kullanıcı bilgileri yükleniyor...

      </article>

    );

  }

  if (

    error ||

    !data

  ) {

    return (

      <article className="panel">

        <div className="admin-user-detail-error">

          {error ??

            "Kullanıcı bulunamadı."}

        </div>

      </article>

    );

  }

  return (

    <>

      <div className="admin-user-detail-back-row">

        <button

          type="button"

          className="secondary-button"

          onClick={() =>

            navigate(

              "/users"

            )

          }

        >

          <ArrowLeft

            size={17}

          />

          Kullanıcılara dön

        </button>

      </div>

      <div className="page-heading admin-user-detail-heading">

        <div>

          <span className="section-kicker">

            Kullanıcı inceleme

          </span>

          <h1>

            {data.displayName}

          </h1>

          <p>

            Hesap geçmişini,

            doğrulamalarını,

            not hareketlerini ve

            finansal işlemlerini

            tek ekrandan inceleyin.

          </p>

        </div>

        <div className="admin-user-detail-heading__actions">

          <StatusBadge

            status={

              data.status

            }

          />

          {data.role !==

            "Admin" && (

            <button

              type="button"

              className={

                data.status ===

                "Active"

                  ? "secondary-button danger-text"

                  : "primary-button"

              }

              disabled={

                statusBusy

              }

              onClick={() =>

                void toggleStatus()

              }

            >

              {statusBusy

                ? "İşleniyor..."

                : data.status ===

                    "Active"

                  ? "Hesabı askıya al"

                  : "Hesabı aktifleştir"}

            </button>

          )}

        </div>

      </div>

      <section className="admin-user-profile-grid">

        <article className="panel admin-user-profile-card">

          <div className="admin-user-profile-card__icon">

            <UserRound

              size={23}

            />

          </div>

          <div>

            <span>

              Kullanıcı

            </span>

            <strong>

              {data.displayName}

            </strong>

            <small>

              {data.email}

            </small>

          </div>

        </article>

        <article className="panel admin-user-profile-card">

          <div className="admin-user-profile-card__icon">

            <FileCheck2

              size={23}

            />

          </div>

          <div>

            <span>

              Doğrulama

            </span>

            <strong>

              {

                data.summary

                  .verificationCount

              }

            </strong>

            <small>

              toplam kayıt

            </small>

          </div>

        </article>

        <article className="panel admin-user-profile-card">

          <div className="admin-user-profile-card__icon">

            <BookOpen

              size={23}

            />

          </div>

          <div>

            <span>

              Not talepleri

            </span>

            <strong>

              {

                data.summary

                  .noteRequestCount

              }

            </strong>

            <small>

              oluşturulan talep

            </small>

          </div>

        </article>

        <article className="panel admin-user-profile-card">

          <div className="admin-user-profile-card__icon">

            <Upload

              size={23}

            />

          </div>

          <div>

            <span>

              Gönderilen not

            </span>

            <strong>

              {

                data.summary

                  .noteSubmissionCount

              }

            </strong>

            <small>

              satıcı gönderimi

            </small>

          </div>

        </article>

        <article className="panel admin-user-profile-card">

          <div className="admin-user-profile-card__icon">

            <ShoppingBag

              size={23}

            />

          </div>

          <div>

            <span>

              Satın alma

            </span>

            <strong>

              {

                data.summary

                  .totalPurchases

              }

            </strong>

            <small>

              {moneyFormatter.format(

                data.summary

                  .purchaseExpense

              )}

            </small>

          </div>

        </article>

        <article className="panel admin-user-profile-card">

          <div className="admin-user-profile-card__icon">

            <WalletCards

              size={23}

            />

          </div>

          <div>

            <span>

              Satış

            </span>

            <strong>

              {

                data.summary

                  .totalSales

              }

            </strong>

            <small>

              {moneyFormatter.format(

                data.summary

                  .salesIncome

              )}

            </small>

          </div>

        </article>

      </section>

      <section className="admin-user-detail-columns">

        <article className="panel admin-user-account-panel">

          <div className="admin-user-section-heading">

            <div>

              <span className="section-kicker">

                Hesap

              </span>

              <h2>

                Hesap bilgileri

              </h2>

            </div>

          </div>

          <dl className="admin-user-info-grid">

            <div>

              <dt>

                Kullanıcı ID

              </dt>

              <dd>

                <code>

                  {data.id}

                </code>

              </dd>

            </div>

            <div>

              <dt>

                Rol

              </dt>

              <dd>

                {data.role}

              </dd>

            </div>

            <div>

              <dt>

                Kayıt tarihi

              </dt>

              <dd>

                {formatDate(

                  data.createdAt

                )}

              </dd>

            </div>

            <div>

              <dt>

                Son giriş

              </dt>

              <dd>

                {formatDate(

                  data.lastLoginAt

                )}

              </dd>

            </div>

          </dl>

        </article>

        <article className="panel admin-user-account-panel">

          <div className="admin-user-section-heading">

            <div>

              <span className="section-kicker">

                Finans

              </span>

              <h2>

                Finans özeti

              </h2>

            </div>

          </div>

          <div className="admin-user-finance-list">

            <div>

              <span>

                Alış gideri

              </span>

              <strong>

                {moneyFormatter.format(

                  data.summary

                    .purchaseExpense

                )}

              </strong>

            </div>

            <div>

              <span>

                Satış geliri

              </span>

              <strong>

                {moneyFormatter.format(

                  data.summary

                    .salesIncome

                )}

              </strong>

            </div>

            <div>

              <span>

                Bekleyen satış geliri

              </span>

              <strong>

                {moneyFormatter.format(

                  data.summary

                    .pendingSalesIncome

                )}

              </strong>

            </div>

          </div>

        </article>

      </section>

      <article className="panel admin-user-section">

        <div className="admin-user-section-heading">

          <div>

            <span className="section-kicker">

              Öğrencilik

            </span>

            <h2>

              Doğrulamalar

            </h2>

          </div>

          <strong className="admin-user-section-count">

            {

              data.verifications

                .length

            }

          </strong>

        </div>

        <div className="table-wrapper">

          <table>

            <thead>

              <tr>

                <th>

                  Üniversite

                </th>

                <th>

                  Fakülte / Bölüm

                </th>

                <th>

                  Belge tarihi

                </th>

                <th>

                  Durum

                </th>

                <th>

                  İnceleme notu

                </th>

                <th>

                  Oluşturulma

                </th>

              </tr>

            </thead>

            <tbody>

              {data.verifications.map(

                item => (

                  <tr

                    key={

                      item.id

                    }

                  >

                    <td>

                      <strong>

                        {

                          item.universityName

                        }

                      </strong>

                    </td>

                    <td>

                      {

                        item.facultyName

                      }

                      <span className="table-subtext">

                        {

                          item.departmentName

                        }

                      </span>

                    </td>

                    <td>

                      {

                        item.documentIssueDate

                      }

                    </td>

                    <td>

                      <StatusBadge

                        status={

                          item.status

                        }

                      />

                    </td>

                    <td>

                      {item.reviewNote ??

                        "—"}

                    </td>

                    <td>

                      {formatShortDate(

                        item.createdAt

                      )}

                    </td>

                  </tr>

                )

              )}

            </tbody>

          </table>

        </div>

      </article>

      <article className="panel admin-user-section">

        <div className="admin-user-section-heading">

          <div>

            <span className="section-kicker">

              Alıcı

            </span>

            <h2>

              Not talepleri

            </h2>

          </div>

          <strong className="admin-user-section-count">

            {

              data.noteRequests

                .length

            }

          </strong>

        </div>

        <div className="table-wrapper">

          <table>

            <thead>

              <tr>

                <th>

                  Ders

                </th>

                <th>

                  Konu

                </th>

                <th>

                  İçerik

                </th>

                <th>

                  Sınıf

                </th>

                <th>

                  Fiyat aralığı

                </th>

                <th>

                  Gönderim

                </th>

                <th>

                  Tarih

                </th>

              </tr>

            </thead>

            <tbody>

              {data.noteRequests.map(

                item => (

                  <tr

                    key={

                      item.id

                    }

                  >

                    <td>

                      <strong>

                        {

                          item.courseName

                        }

                      </strong>

                      <span className="table-subtext">

                        {

                          item.departmentName

                        }

                      </span>

                    </td>

                    <td>

                      {item.topic ??

                        "Belirtilmemiş"}

                    </td>

                    <td>

                      {contentTypeLabel(

                        item.contentType

                      )}

                      {item.questionCount && (

                        <span className="table-subtext">

                          {

                            item.questionCount

                          }{" "}

                          soru

                        </span>

                      )}

                    </td>

                    <td>

                      {

                        item.classLevel

                      }

                    </td>

                    <td>

                      {moneyFormatter.format(

                        item.suggestedMinPrice

                      )}

                      {" – "}

                      {moneyFormatter.format(

                        item.suggestedMaxPrice

                      )}

                    </td>

                    <td>

                      {

                        item.submissionCount

                      }

                    </td>

                    <td>

                      {formatShortDate(

                        item.createdAt

                      )}

                    </td>

                  </tr>

                )

              )}

            </tbody>

          </table>

        </div>

      </article>

      <article className="panel admin-user-section">

        <div className="admin-user-section-heading">

          <div>

            <span className="section-kicker">

              Satıcı

            </span>

            <h2>

              Gönderilen notlar

            </h2>

          </div>

          <strong className="admin-user-section-count">

            {

              data.noteSubmissions

                .length

            }

          </strong>

        </div>

        {data.noteSubmissions.length ===

        0 ? (

          <div className="admin-user-empty-state">

            Bu kullanıcı henüz not

            göndermedi.

          </div>

        ) : (

          <div className="table-wrapper">

            <table>

              <thead>

                <tr>

                  <th>

                    Not

                  </th>

                  <th>

                    Ders

                  </th>

                  <th>

                    Durum

                  </th>

                  <th>

                    Eşleşme

                  </th>

                  <th>

                    Okunabilirlik

                  </th>

                  <th>

                    Fiyat

                  </th>

                  <th />

                </tr>

              </thead>

              <tbody>

                {data.noteSubmissions.map(

                  item => (

                    <tr

                      key={

                        item.id

                      }

                    >

                      <td>

                        <strong>

                          {

                            item.title

                          }

                        </strong>

                      </td>

                      <td>

                        {

                          item.courseName

                        }

                      </td>

                      <td>

                        <StatusBadge

                          status={

                            item.status

                          }

                        />

                      </td>

                      <td>

                        {

                          item.matchScore

                        }

                      </td>

                      <td>

                        {

                          item.readabilityScore

                        }

                      </td>

                      <td>

                        {item.salePrice ===

                        null

                          ? "—"

                          : moneyFormatter.format(

                              item.salePrice

                            )}

                      </td>

                      <td className="table-actions">

                        <button

                          type="button"

                          className="secondary-button"

                          onClick={() =>

                            navigate(

                              `/notes/${item.id}`

                            )

                          }

                        >

                          İncele

                        </button>

                      </td>

                    </tr>

                  )

                )}

              </tbody>

            </table>

          </div>

        )}

      </article>

      <section className="admin-user-detail-columns">

        <article className="panel admin-user-section">

          <div className="admin-user-section-heading">

            <div>

              <span className="section-kicker">

                Siparişler

              </span>

              <h2>

                Satın almalar

              </h2>

            </div>

          </div>

          {data.purchases.length ===

          0 ? (

            <div className="admin-user-empty-state">

              Satın alma bulunmuyor.

            </div>

          ) : (

            <div className="admin-user-order-list">

              {data.purchases.map(

                order => (

                  <div

                    key={

                      order.orderId

                    }

                    className="admin-user-order-item"

                  >

                    <div>

                      <strong>

                        {

                          order.noteTitle

                        }

                      </strong>

                      <span>

                        {formatDate(

                          order.paidAt ??

                            order.createdAt

                        )}

                      </span>

                    </div>

                    <strong>

                      {moneyFormatter.format(

                        order.grossAmount

                      )}

                    </strong>

                  </div>

                )

              )}

            </div>

          )}

        </article>

        <article className="panel admin-user-section">

          <div className="admin-user-section-heading">

            <div>

              <span className="section-kicker">

                Siparişler

              </span>

              <h2>

                Satışlar

              </h2>

            </div>

          </div>

          {data.sales.length ===

          0 ? (

            <div className="admin-user-empty-state">

              Satış bulunmuyor.

            </div>

          ) : (

            <div className="admin-user-order-list">

              {data.sales.map(

                order => (

                  <div

                    key={

                      order.orderId

                    }

                    className="admin-user-order-item"

                  >

                    <div>

                      <strong>

                        {

                          order.noteTitle

                        }

                      </strong>

                      <span>

                        {formatDate(

                          order.paidAt ??

                            order.createdAt

                        )}

                      </span>

                    </div>

                    <strong>

                      {moneyFormatter.format(

                        order.sellerEarningAmount

                      )}

                    </strong>

                  </div>

                )

              )}

            </div>

          )}

        </article>

      </section>

      <article className="panel admin-user-section">

        <div className="admin-user-section-heading">

          <div>

            <span className="section-kicker">

              Audit log

            </span>

            <h2>

              Son işlemler

            </h2>

          </div>

        </div>

        {data.recentActivity.length ===

        0 ? (

          <div className="admin-user-empty-state">

            İlişkili işlem kaydı

            bulunmuyor.

          </div>

        ) : (

          <div className="admin-user-activity-list">

            {data.recentActivity.map(

              item => (

                <div

                  key={

                    item.id

                  }

                  className="admin-user-activity-item"

                >

                  <div className="admin-user-activity-item__icon">

                    <ReceiptText

                      size={17}

                    />

                  </div>

                  <div>

                    <strong>

                      {actionLabel(

                        item.action

                      )}

                    </strong>

                    <span>

                      {

                        item.entityType

                      }{" "}

                      ·{" "}

                      {formatDate(

                        item.createdAt

                      )}

                    </span>

                  </div>

                  <code>

                    #

                    {

                      item.id

                    }

                  </code>

                </div>

              )

            )}

          </div>

        )}

      </article>

    </>

  );

}

