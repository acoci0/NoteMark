import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AdminTheme =
  | "light"
  | "dark"
  | "system";

type ResolvedTheme =
  | "light"
  | "dark";

type AdminAppearanceContextValue = {
  theme: AdminTheme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: AdminTheme) => void;
  resetAppearance: () => void;
};

const STORAGE_KEY =
  "notmark_admin_appearance_v1";

const AdminAppearanceContext =
  createContext<
    AdminAppearanceContextValue | undefined
  >(undefined);

function getStoredTheme(): AdminTheme {
  try {
    const raw =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) {
      return "system";
    }

    const parsed =
      JSON.parse(raw) as {
        theme?: AdminTheme;
      };

    if (
      parsed.theme === "light" ||
      parsed.theme === "dark" ||
      parsed.theme === "system"
    ) {
      return parsed.theme;
    }
  } catch {
    // Geçersiz localStorage verisinde
    // sistem temasına dön.
  }

  return "system";
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches
    ? "dark"
    : "light";
}

export function AdminAppearanceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    theme,
    setThemeState,
  ] =
    useState<AdminTheme>(
      getStoredTheme
    );

  const [
    systemTheme,
    setSystemTheme,
  ] =
    useState<ResolvedTheme>(
      getSystemTheme
    );

  useEffect(() => {
    const media =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

    const handleChange = () => {
      setSystemTheme(
        media.matches
          ? "dark"
          : "light"
      );
    };

    media.addEventListener(
      "change",
      handleChange
    );

    return () => {
      media.removeEventListener(
        "change",
        handleChange
      );
    };
  }, []);

  const setTheme = (
    nextTheme: AdminTheme
  ) => {
    setThemeState(nextTheme);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        theme: nextTheme,
      })
    );
  };

  const resetAppearance = () => {
    setTheme("system");
  };

  const resolvedTheme =
    theme === "system"
      ? systemTheme
      : theme;

  const value =
    useMemo(
      () => ({
        theme,
        resolvedTheme,
        setTheme,
        resetAppearance,
      }),
      [
        theme,
        resolvedTheme,
      ]
    );

  return (
    <AdminAppearanceContext.Provider
      value={value}
    >
      {children}
    </AdminAppearanceContext.Provider>
  );
}

export function useAdminAppearance() {
  const context =
    useContext(
      AdminAppearanceContext
    );

  if (!context) {
    throw new Error(
      "useAdminAppearance must be used inside AdminAppearanceProvider."
    );
  }

  return context;
}
