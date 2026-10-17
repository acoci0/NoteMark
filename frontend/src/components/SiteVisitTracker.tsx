import {
  useEffect,
} from "react";

import {
  useLocation,
} from "react-router-dom";

import api from "../api/client";

const sessionStorageKey =
  "notmarket_analytics_session";

const STUDENT_HEARTBEAT_MS =
  45_000;

function getSessionId() {
  const existing =
    localStorage.getItem(
      sessionStorageKey
    );

  if (existing) {
    return existing;
  }

  const sessionId =
    `${crypto.randomUUID()}-${crypto.randomUUID()}`;

  localStorage.setItem(
    sessionStorageKey,
    sessionId
  );

  return sessionId;
}

function trackVisit(
  path: string,
  signal?: AbortSignal
) {
  return api.post(
    "/analytics/visits",
    {
      sessionId:
        getSessionId(),

      path,
    },
    signal
      ? {
          signal,
        }
      : undefined
  );
}

export default function SiteVisitTracker() {
  const location =
    useLocation();

  useEffect(() => {
    const path =
      location.pathname;

    const controller =
      new AbortController();

    void trackVisit(
      path,
      controller.signal
    ).catch(() => {
      /*
       * Analitik işlemleri sayfanın
       * çalışmasını engellememelidir.
       */
    });

    const isStudentPanel =
      path.startsWith(
        "/student/"
      ) &&
      path !==
        "/student/login";

    let heartbeat:
      number | undefined;

    if (isStudentPanel) {
      heartbeat =
        window.setInterval(
          () => {
            void trackVisit(
              path
            ).catch(() => {
              /*
               * Heartbeat hataları sessizdir.
               */
            });
          },
          STUDENT_HEARTBEAT_MS
        );
    }

    return () => {
      controller.abort();

      if (
        heartbeat !==
        undefined
      ) {
        window.clearInterval(
          heartbeat
        );
      }
    };
  }, [
    location.pathname,
  ]);

  return null;
}
