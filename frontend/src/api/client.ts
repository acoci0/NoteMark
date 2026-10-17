import axios from "axios";

const configuredBaseUrl =
  (
    import.meta.env.VITE_API_BASE_URL ??
    "https://localhost:7001"
  )
    .trim()
    .replace(/\/+$/, "");

const apiBaseUrl =
  configuredBaseUrl.endsWith("/api")
    ? configuredBaseUrl
    : `${configuredBaseUrl}/api`;

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
});

function isStudentArea() {
  return window.location.pathname.startsWith(
    "/student"
  );
}

api.interceptors.request.use(
  (config) => {
    /*
     * Admin ve öğrenci panelleri aynı Axios
     * instance'ını kullanıyor.
     *
     * Aktif panel hangi taraftaysa o role ait
     * JWT gönderilir.
     */
    const token =
      isStudentArea()
        ? localStorage.getItem(
            "notmarket_student_token"
          )
        : localStorage.getItem(
            "notmarket_admin_token"
          );

    if (token) {
      config.headers =
        config.headers ?? {};

      (
        config.headers as
          Record<string, string>
      ).Authorization =
        `Bearer ${token}`;
    }

    return config;
  }
);

api.interceptors.response.use(
  (response) =>
    response,

  (error) => {
    if (
      error.response?.status ===
      401
    ) {
      /*
       * Öğrenci oturumu geçersizse yalnızca
       * öğrenci oturumunu temizle.
       */
      if (isStudentArea()) {
        localStorage.removeItem(
          "notmarket_student_token"
        );

        localStorage.removeItem(
          "notmarket_student_profile"
        );

        if (
          window.location.pathname !==
          "/student/login"
        ) {
          window.location.href =
            "/student/login";
        }
      } else {
        /*
         * Admin oturumu geçersizse yalnızca
         * admin oturumunu temizle.
         */
        localStorage.removeItem(
          "notmarket_admin_token"
        );

        localStorage.removeItem(
          "notmarket_admin_profile"
        );

        if (
          window.location.pathname !==
          "/login"
        ) {
          window.location.href =
            "/login";
        }
      }
    }

    return Promise.reject(
      error
    );
  }
);

export default api;
