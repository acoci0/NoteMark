/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type StudentTheme =
  | "light"
  | "dark"
  | "system";

export type StudentAccent =
  | "yellow"
  | "purple"
  | "blue"
  | "green";

export type StudentMotion =
  | "full"
  | "reduced"
  | "off";

type StudentAppearanceContextValue = {
  theme: StudentTheme;
  resolvedTheme: "light" | "dark";
  accent: StudentAccent;
  motion: StudentMotion;

  setTheme: (
    value: StudentTheme
  ) => void;

  setAccent: (
    value: StudentAccent
  ) => void;

  setMotion: (
    value: StudentMotion
  ) => void;

  resetAppearance: () => void;
};

type StoredAppearance = {
  theme: StudentTheme;
  accent: StudentAccent;
  motion: StudentMotion;
};

const STORAGE_KEY =
  "notmark_student_appearance_v1";

const DEFAULT_APPEARANCE: StoredAppearance = {
  theme: "system",
  accent: "yellow",
  motion: "full",
};

const StudentAppearanceContext =
  createContext<
    StudentAppearanceContextValue | undefined
  >(undefined);

function isTheme(
  value: unknown
): value is StudentTheme {
  return (
    value === "light" ||
    value === "dark" ||
    value === "system"
  );
}

function isAccent(
  value: unknown
): value is StudentAccent {
  return (
    value === "yellow" ||
    value === "purple" ||
    value === "blue" ||
    value === "green"
  );
}

function isMotion(
  value: unknown
): value is StudentMotion {
  return (
    value === "full" ||
    value === "reduced" ||
    value === "off"
  );
}

function readStoredAppearance():
  StoredAppearance {
  const stored =
    localStorage.getItem(
      STORAGE_KEY
    );

  if (!stored) {
    return DEFAULT_APPEARANCE;
  }

  try {
    const parsed =
      JSON.parse(stored) as Partial<
        StoredAppearance
      >;

    return {
      theme:
        isTheme(parsed.theme)
          ? parsed.theme
          : DEFAULT_APPEARANCE.theme,

      accent:
        isAccent(parsed.accent)
          ? parsed.accent
          : DEFAULT_APPEARANCE.accent,

      motion:
        isMotion(parsed.motion)
          ? parsed.motion
          : DEFAULT_APPEARANCE.motion,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function getSystemTheme():
  "light" | "dark" {
  return window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches
    ? "dark"
    : "light";
}

export function StudentAppearanceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const initial =
    readStoredAppearance();

  const [theme, setTheme] =
    useState<StudentTheme>(
      initial.theme
    );

  const [accent, setAccent] =
    useState<StudentAccent>(
      initial.accent
    );

  const [motion, setMotion] =
    useState<StudentMotion>(
      initial.motion
    );

  const [
    systemTheme,
    setSystemTheme,
  ] =
    useState<"light" | "dark">(
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

  useEffect(() => {
    const value: StoredAppearance = {
      theme,
      accent,
      motion,
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(value)
    );
  }, [
    theme,
    accent,
    motion,
  ]);

  const resolvedTheme =
    theme === "system"
      ? systemTheme
      : theme;

  const resetAppearance = () => {
    setTheme(
      DEFAULT_APPEARANCE.theme
    );

    setAccent(
      DEFAULT_APPEARANCE.accent
    );

    setMotion(
      DEFAULT_APPEARANCE.motion
    );
  };

  const value =
    useMemo<StudentAppearanceContextValue>(
      () => ({
        theme,
        resolvedTheme,
        accent,
        motion,
        setTheme,
        setAccent,
        setMotion,
        resetAppearance,
      }),
      [
        theme,
        resolvedTheme,
        accent,
        motion,
      ]
    );

  return (
    <StudentAppearanceContext.Provider
      value={value}
    >
      {children}
    </StudentAppearanceContext.Provider>
  );
}

export function useStudentAppearance() {
  const context =
    useContext(
      StudentAppearanceContext
    );

  if (!context) {
    throw new Error(
      "useStudentAppearance yalnızca StudentAppearanceProvider içerisinde kullanılabilir."
    );
  }

  return context;
}
