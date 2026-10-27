import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { isAxiosError } from "axios";

import studentApi from "../api/studentClient";

import StudentComplaintDialog from "../components/StudentComplaintDialog";

import { useStudentAuth } from "../auth/StudentAuthContext";

import type {
  AcademicProgram,
  AcademicUnit,
  AcademicUniversity,
  StudentVerificationItem,
} from "../types";

type ApiErrorResponse = {
  message?: string;
};

type ActiveStudentResponse = {
  activeCount: number;
  windowSeconds: number;
};

const MAX_FILE_SIZE =
  10 * 1024 * 1024;


const profileMathSymbols = [
  "∑",
  "∫",
  "π",
  "√",
  "Δ",
  "λ",
  "∞",
  "θ",
  "α",
  "β",
  "∂",
  "≈",
  "∇",
  "μ",
  "φ",
  "×",
  "σ",
  "∈",
  "∀",
  "ℝ",
  "⊂",
  "⊆",
  "≠",
  "≡",
  "∝",
  "⊕",
  "∴",
  "∵",
  "∪",
  "∩",
  "⊥",
  "∮",
  "∅",
] as const;

export default function StudentProfilePage() {

  const mathLayerRef =
    useRef<HTMLDivElement | null>(null);

  const {
    student,
  } = useStudentAuth();

  const [items, setItems] =
    useState<StudentVerificationItem[]>([]);

  const [loading, setLoading] =
    useState(true);


  const [showForm, setShowForm] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  const [
    activeStudentCount,
    setActiveStudentCount,
  ] = useState(1);

  /*
   * Üniversite autocomplete state'leri.
   */
  const [
    universityQuery,
    setUniversityQuery,
  ] = useState("");

  const [
    selectedUniversity,
    setSelectedUniversity,
  ] = useState<AcademicUniversity | null>(
    null
  );

  const [
    universityResults,
    setUniversityResults,
  ] = useState<AcademicUniversity[]>([]);

  const [
    universitySearching,
    setUniversitySearching,
  ] = useState(false);

  const [
    universityDropdownOpen,
    setUniversityDropdownOpen,
  ] = useState(false);

  const [
    highlightedUniversityIndex,
    setHighlightedUniversityIndex,
  ] = useState(-1);

  const universityInputFocusedRef =
    useRef(false);

  const universityEditorRef =
    useRef<HTMLDivElement | null>(null);

  /*
   * Akademik birim autocomplete state'leri.
   */
  const [
    academicUnitQuery,
    setAcademicUnitQuery,
  ] = useState("");

  const [
    selectedAcademicUnit,
    setSelectedAcademicUnit,
  ] = useState<AcademicUnit | null>(
    null
  );

  const [
    academicUnitResults,
    setAcademicUnitResults,
  ] = useState<AcademicUnit[]>([]);

  const [
    academicUnitSearching,
    setAcademicUnitSearching,
  ] = useState(false);

  const [
    academicUnitDropdownOpen,
    setAcademicUnitDropdownOpen,
  ] = useState(false);

  const [
    highlightedAcademicUnitIndex,
    setHighlightedAcademicUnitIndex,
  ] = useState(-1);

  const academicUnitInputFocusedRef =
    useRef(false);

  const academicUnitEditorRef =
    useRef<HTMLDivElement | null>(null);

  /*
   * Bölüm / program autocomplete state'leri.
   */
  const [
    academicProgramQuery,
    setAcademicProgramQuery,
  ] = useState("");

  const [
    selectedAcademicProgram,
    setSelectedAcademicProgram,
  ] = useState<AcademicProgram | null>(
    null
  );

  const [
    academicProgramResults,
    setAcademicProgramResults,
  ] = useState<AcademicProgram[]>([]);

  const [
    academicProgramSearching,
    setAcademicProgramSearching,
  ] = useState(false);

  const [
    academicProgramDropdownOpen,
    setAcademicProgramDropdownOpen,
  ] = useState(false);

  const [
    highlightedAcademicProgramIndex,
    setHighlightedAcademicProgramIndex,
  ] = useState(-1);

  const academicProgramInputFocusedRef =
    useRef(false);

  const academicProgramEditorRef =
    useRef<HTMLDivElement | null>(null);

  /*
   * Belge alanları.
   */
  const [
    documentIssueDate,
    setDocumentIssueDate,
  ] = useState("");

  const [document, setDocument] =
    useState<File | null>(null);

  /*
   * Öğrencinin doğrulamalarını getirir.
   */
  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data } =
        await studentApi.get<
          StudentVerificationItem[]
        >(
          "/student/verifications"
        );

      setItems(data);
    } catch (error: unknown) {
      setMessage(
        getErrorMessage(
          error,
          "Doğrulamalar yüklenirken bir hata oluştu."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /*
   * Öğrenci panelindeki aktif oturum
   * sayısını periyodik olarak yeniler.
   */
  useEffect(() => {
    let cancelled =
      false;

    const loadActiveStudents =
      async () => {
        try {
          const { data } =
            await studentApi.get<
              ActiveStudentResponse
            >(
              "/analytics/active-students"
            );

          if (!cancelled) {
            setActiveStudentCount(
              Math.max(
                1,
                data.activeCount
              )
            );
          }
        } catch {
          /*
           * Sayaç hatası profil ekranını
           * etkilememelidir.
           */
        }
      };

    void loadActiveStudents();

    const timer =
      window.setInterval(
        () => {
          void loadActiveStudents();
        },
        30_000
      );

    return () => {
      cancelled =
        true;

      window.clearInterval(
        timer
      );
    };
  }, []);

  /*
   * contentEditable alanların görünen
   * metinlerini React state'leriyle
   * senkronize eder.
   */
  useEffect(() => {
    const editor =
      universityEditorRef.current;

    if (
      editor &&
      editor.textContent !== universityQuery
    ) {
      editor.textContent =
        universityQuery;
    }
  }, [universityQuery]);

  useEffect(() => {
    const editor =
      academicUnitEditorRef.current;

    if (
      editor &&
      editor.textContent !== academicUnitQuery
    ) {
      editor.textContent =
        academicUnitQuery;
    }
  }, [academicUnitQuery]);

  useEffect(() => {
    const editor =
      academicProgramEditorRef.current;

    if (
      editor &&
      editor.textContent !==
        academicProgramQuery
    ) {
      editor.textContent =
        academicProgramQuery;
    }
  }, [academicProgramQuery]);

  /*
   * Üniversite araması.
   */
  useEffect(() => {
    const query =
      universityQuery.trim();

    if (
      selectedUniversity &&
      query === selectedUniversity.name
    ) {
      setUniversityResults([]);
      setUniversityDropdownOpen(false);
      setUniversitySearching(false);
      setHighlightedUniversityIndex(-1);

      return;
    }

    if (query.length < 2) {
      setUniversityResults([]);
      setUniversityDropdownOpen(false);
      setUniversitySearching(false);
      setHighlightedUniversityIndex(-1);

      return;
    }

    const controller =
      new AbortController();

    const timer =
      window.setTimeout(
        async () => {
          setUniversitySearching(true);

          setUniversityDropdownOpen(
            universityInputFocusedRef.current
          );

          try {
            const { data } =
              await studentApi.get<
                AcademicUniversity[]
              >(
                "/academic/universities",
                {
                  params: {
                    search: query,
                  },
                  signal:
                    controller.signal,
                }
              );

            setUniversityResults(data);

            setHighlightedUniversityIndex(
              data.length > 0
                ? 0
                : -1
            );

            setUniversityDropdownOpen(
              universityInputFocusedRef.current
            );
          } catch (error: unknown) {
            if (!controller.signal.aborted) {
              console.error(
                "Üniversite arama hatası:",
                error
              );

              setUniversityResults([]);
              setHighlightedUniversityIndex(-1);

              setUniversityDropdownOpen(
                universityInputFocusedRef.current
              );
            }
          } finally {
            if (!controller.signal.aborted) {
              setUniversitySearching(false);
            }
          }
        },
        300
      );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    universityQuery,
    selectedUniversity,
  ]);

  /*
   * Seçili üniversiteye bağlı akademik
   * birimlerin aranması.
   */
  useEffect(() => {
    const query =
      academicUnitQuery.trim();

    if (!selectedUniversity) {
      setAcademicUnitResults([]);
      setAcademicUnitDropdownOpen(false);
      setAcademicUnitSearching(false);
      setHighlightedAcademicUnitIndex(-1);

      return;
    }

    if (
      selectedAcademicUnit &&
      query === selectedAcademicUnit.name
    ) {
      setAcademicUnitResults([]);
      setAcademicUnitDropdownOpen(false);
      setAcademicUnitSearching(false);
      setHighlightedAcademicUnitIndex(-1);

      return;
    }

    if (query.length < 2) {
      setAcademicUnitResults([]);
      setAcademicUnitDropdownOpen(false);
      setAcademicUnitSearching(false);
      setHighlightedAcademicUnitIndex(-1);

      return;
    }

    const controller =
      new AbortController();

    const timer =
      window.setTimeout(
        async () => {
          setAcademicUnitSearching(true);

          setAcademicUnitDropdownOpen(
            academicUnitInputFocusedRef.current
          );

          try {
            const { data } =
              await studentApi.get<
                AcademicUnit[]
              >(
                "/academic/units",
                {
                  params: {
                    universityId:
                      selectedUniversity.id,
                    search: query,
                  },
                  signal:
                    controller.signal,
                }
              );

            setAcademicUnitResults(data);

            setHighlightedAcademicUnitIndex(
              data.length > 0
                ? 0
                : -1
            );

            setAcademicUnitDropdownOpen(
              academicUnitInputFocusedRef.current
            );
          } catch (error: unknown) {
            if (!controller.signal.aborted) {
              console.error(
                "Akademik birim arama hatası:",
                error
              );

              setAcademicUnitResults([]);
              setHighlightedAcademicUnitIndex(-1);

              setAcademicUnitDropdownOpen(
                academicUnitInputFocusedRef.current
              );
            }
          } finally {
            if (!controller.signal.aborted) {
              setAcademicUnitSearching(false);
            }
          }
        },
        300
      );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    academicUnitQuery,
    selectedAcademicUnit,
    selectedUniversity,
  ]);

  /*
   * Seçili akademik birime bağlı bölüm
   * ve programların aranması.
   */
  useEffect(() => {
    const query =
      academicProgramQuery.trim();

    if (!selectedAcademicUnit) {
      setAcademicProgramResults([]);
      setAcademicProgramDropdownOpen(false);
      setAcademicProgramSearching(false);
      setHighlightedAcademicProgramIndex(-1);

      return;
    }

    if (
      selectedAcademicProgram &&
      query === selectedAcademicProgram.name
    ) {
      setAcademicProgramResults([]);
      setAcademicProgramDropdownOpen(false);
      setAcademicProgramSearching(false);
      setHighlightedAcademicProgramIndex(-1);

      return;
    }

    if (query.length < 2) {
      setAcademicProgramResults([]);
      setAcademicProgramDropdownOpen(false);
      setAcademicProgramSearching(false);
      setHighlightedAcademicProgramIndex(-1);

      return;
    }

    const controller =
      new AbortController();

    const timer =
      window.setTimeout(
        async () => {
          setAcademicProgramSearching(true);

          setAcademicProgramDropdownOpen(
            academicProgramInputFocusedRef.current
          );

          try {
            const { data } =
              await studentApi.get<
                AcademicProgram[]
              >(
                "/academic/programs",
                {
                  params: {
                    academicUnitId:
                      selectedAcademicUnit.id,
                    search: query,
                  },
                  signal:
                    controller.signal,
                }
              );

            setAcademicProgramResults(data);

            setHighlightedAcademicProgramIndex(
              data.length > 0
                ? 0
                : -1
            );

            setAcademicProgramDropdownOpen(
              academicProgramInputFocusedRef.current
            );
          } catch (error: unknown) {
            if (!controller.signal.aborted) {
              console.error(
                "Bölüm/program arama hatası:",
                error
              );

              setAcademicProgramResults([]);
              setHighlightedAcademicProgramIndex(-1);

              setAcademicProgramDropdownOpen(
                academicProgramInputFocusedRef.current
              );
            }
          } finally {
            if (!controller.signal.aborted) {
              setAcademicProgramSearching(false);
            }
          }
        },
        300
      );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    academicProgramQuery,
    selectedAcademicProgram,
    selectedAcademicUnit,
  ]);

  /*
   * Program alanını temizler.
   */
  const resetAcademicProgramSelection = () => {
    academicProgramInputFocusedRef.current =
      false;

    if (academicProgramEditorRef.current) {
      academicProgramEditorRef.current
        .replaceChildren();
    }

    setAcademicProgramQuery("");
    setSelectedAcademicProgram(null);
    setAcademicProgramResults([]);
    setAcademicProgramDropdownOpen(false);
    setAcademicProgramSearching(false);
    setHighlightedAcademicProgramIndex(-1);
  };

  /*
   * Akademik birim ve program alanlarını
   * birlikte temizler.
   */
  const resetAcademicUnitAndProgramSelections =
    () => {
      academicUnitInputFocusedRef.current =
        false;

      if (academicUnitEditorRef.current) {
        academicUnitEditorRef.current
          .replaceChildren();
      }

      setAcademicUnitQuery("");
      setSelectedAcademicUnit(null);
      setAcademicUnitResults([]);
      setAcademicUnitDropdownOpen(false);
      setAcademicUnitSearching(false);
      setHighlightedAcademicUnitIndex(-1);

      resetAcademicProgramSelection();
    };

  /*
   * Üniversite alanındaki metin değişimi.
   */
  const handleUniversityQueryChange = (
    value: string
  ) => {
    setUniversityQuery(value);
    setMessage("");

    if (
      selectedUniversity &&
      value !== selectedUniversity.name
    ) {
      setSelectedUniversity(null);

      resetAcademicUnitAndProgramSelections();
    }

    if (value.trim().length < 2) {
      setUniversityResults([]);
      setUniversityDropdownOpen(false);
      setUniversitySearching(false);
      setHighlightedUniversityIndex(-1);
    }
  };

  /*
   * Üniversite seçimi.
   *
   * Üniversite değiştiğinde önceki akademik
   * birim ve program seçimleri geçersiz olur.
   */
  const selectUniversity = (
    university: AcademicUniversity
  ) => {
    const universityChanged =
      selectedUniversity?.id !==
      university.id;

    setSelectedUniversity(university);
    setUniversityQuery(university.name);
    setUniversityResults([]);
    setUniversityDropdownOpen(false);
    setUniversitySearching(false);
    setHighlightedUniversityIndex(-1);
    setMessage("");

    if (universityChanged) {
      resetAcademicUnitAndProgramSelections();
    }
  };

  /*
   * Akademik birim alanındaki metin değişimi.
   */
  const handleAcademicUnitQueryChange = (
    value: string
  ) => {
    setAcademicUnitQuery(value);
    setMessage("");

    if (
      selectedAcademicUnit &&
      value !== selectedAcademicUnit.name
    ) {
      setSelectedAcademicUnit(null);

      resetAcademicProgramSelection();
    }

    if (value.trim().length < 2) {
      setAcademicUnitResults([]);
      setAcademicUnitDropdownOpen(false);
      setAcademicUnitSearching(false);
      setHighlightedAcademicUnitIndex(-1);
    }
  };

  /*
   * Akademik birim seçimi.
   */
  const selectAcademicUnit = (
    academicUnit: AcademicUnit
  ) => {
    const academicUnitChanged =
      selectedAcademicUnit?.id !==
      academicUnit.id;

    setSelectedAcademicUnit(academicUnit);
    setAcademicUnitQuery(academicUnit.name);
    setAcademicUnitResults([]);
    setAcademicUnitDropdownOpen(false);
    setAcademicUnitSearching(false);
    setHighlightedAcademicUnitIndex(-1);
    setMessage("");

    if (academicUnitChanged) {
      resetAcademicProgramSelection();
    }
  };

  /*
   * Program alanındaki metin değişimi.
   */
  const handleAcademicProgramQueryChange = (
    value: string
  ) => {
    setAcademicProgramQuery(value);
    setMessage("");

    if (
      selectedAcademicProgram &&
      value !== selectedAcademicProgram.name
    ) {
      setSelectedAcademicProgram(null);
    }

    if (value.trim().length < 2) {
      setAcademicProgramResults([]);
      setAcademicProgramDropdownOpen(false);
      setAcademicProgramSearching(false);
      setHighlightedAcademicProgramIndex(-1);
    }
  };

  /*
   * Bölüm / program seçimi.
   */
  const selectAcademicProgram = (
    academicProgram: AcademicProgram
  ) => {
    setSelectedAcademicProgram(
      academicProgram
    );

    setAcademicProgramQuery(
      academicProgram.name
    );

    setAcademicProgramResults([]);
    setAcademicProgramDropdownOpen(false);
    setAcademicProgramSearching(false);
    setHighlightedAcademicProgramIndex(-1);
    setMessage("");
  };

  /*
   * Üniversite klavye navigasyonu.
   */
  const handleUniversityKeyDown = (
    event: KeyboardEvent<HTMLDivElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();

      if (
        universityDropdownOpen &&
        highlightedUniversityIndex >= 0
      ) {
        const university =
          universityResults[
            highlightedUniversityIndex
          ];

        if (university) {
          selectUniversity(university);
        }
      }

      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();

      setUniversityDropdownOpen(false);
      setHighlightedUniversityIndex(-1);

      return;
    }

    if (
      !universityDropdownOpen ||
      universityResults.length === 0
    ) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      setHighlightedUniversityIndex(
        (currentIndex) =>
          currentIndex >=
          universityResults.length - 1
            ? 0
            : currentIndex + 1
      );

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setHighlightedUniversityIndex(
        (currentIndex) =>
          currentIndex <= 0
            ? universityResults.length - 1
            : currentIndex - 1
      );
    }
  };

  /*
   * Akademik birim klavye navigasyonu.
   */
  const handleAcademicUnitKeyDown = (
    event: KeyboardEvent<HTMLDivElement>
  ) => {
    if (!selectedUniversity) {
      event.preventDefault();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (
        academicUnitDropdownOpen &&
        highlightedAcademicUnitIndex >= 0
      ) {
        const academicUnit =
          academicUnitResults[
            highlightedAcademicUnitIndex
          ];

        if (academicUnit) {
          selectAcademicUnit(
            academicUnit
          );
        }
      }

      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();

      setAcademicUnitDropdownOpen(false);
      setHighlightedAcademicUnitIndex(-1);

      return;
    }

    if (
      !academicUnitDropdownOpen ||
      academicUnitResults.length === 0
    ) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      setHighlightedAcademicUnitIndex(
        (currentIndex) =>
          currentIndex >=
          academicUnitResults.length - 1
            ? 0
            : currentIndex + 1
      );

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setHighlightedAcademicUnitIndex(
        (currentIndex) =>
          currentIndex <= 0
            ? academicUnitResults.length - 1
            : currentIndex - 1
      );
    }
  };

  /*
   * Bölüm / program klavye navigasyonu.
   */
  const handleAcademicProgramKeyDown = (
    event: KeyboardEvent<HTMLDivElement>
  ) => {
    if (!selectedAcademicUnit) {
      event.preventDefault();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (
        academicProgramDropdownOpen &&
        highlightedAcademicProgramIndex >= 0
      ) {
        const academicProgram =
          academicProgramResults[
            highlightedAcademicProgramIndex
          ];

        if (academicProgram) {
          selectAcademicProgram(
            academicProgram
          );
        }
      }

      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();

      setAcademicProgramDropdownOpen(false);
      setHighlightedAcademicProgramIndex(-1);

      return;
    }

    if (
      !academicProgramDropdownOpen ||
      academicProgramResults.length === 0
    ) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      setHighlightedAcademicProgramIndex(
        (currentIndex) =>
          currentIndex >=
          academicProgramResults.length - 1
            ? 0
            : currentIndex + 1
      );

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setHighlightedAcademicProgramIndex(
        (currentIndex) =>
          currentIndex <= 0
            ? academicProgramResults.length - 1
            : currentIndex - 1
      );
    }
  };

  /*
   * Formu tamamen temizler.
   */
  const resetForm = () => {
    universityInputFocusedRef.current =
      false;

    if (universityEditorRef.current) {
      universityEditorRef.current
        .replaceChildren();
    }

    setUniversityQuery("");
    setSelectedUniversity(null);
    setUniversityResults([]);
    setUniversityDropdownOpen(false);
    setUniversitySearching(false);
    setHighlightedUniversityIndex(-1);

    resetAcademicUnitAndProgramSelections();

    setDocumentIssueDate("");
    setDocument(null);
  };

  /*
   * Yeni doğrulama gönderimi.
   */
  const submit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      !selectedUniversity ||
      universityQuery.trim() !==
        selectedUniversity.name
    ) {
      setMessage(
        "Lütfen arama sonuçlarından geçerli bir Türkiye üniversitesi seçin."
      );

      return;
    }

    if (
      !selectedAcademicUnit ||
      academicUnitQuery.trim() !==
        selectedAcademicUnit.name
    ) {
      setMessage(
        "Lütfen seçilen üniversiteye bağlı geçerli bir fakülte veya akademik birim seçin."
      );

      return;
    }

    if (
      !selectedAcademicProgram ||
      academicProgramQuery.trim() !==
        selectedAcademicProgram.name
    ) {
      setMessage(
        "Lütfen seçilen akademik birime bağlı geçerli bir bölüm veya program seçin."
      );

      return;
    }

    if (!documentIssueDate) {
      setMessage(
        "Belge tarihini seçmelisiniz."
      );

      return;
    }

    const minimumDocumentDate =
      getMinimumDocumentDateInputValue();

    const today =
      getTodayInputValue();

    if (
      documentIssueDate <
        minimumDocumentDate ||
      documentIssueDate > today
    ) {
      setMessage(
        "Öğrenci belgesi son 30 gün içinde alınmış olmalıdır."
      );

      return;
    }

    if (!document) {
      setMessage(
        "Öğrenci belgesi PDF dosyasını seçmelisiniz."
      );

      return;
    }

    if (
      document.type !== "application/pdf" &&
      !document.name
        .toLocaleLowerCase("tr-TR")
        .endsWith(".pdf")
    ) {
      setMessage(
        "Öğrenci belgesi PDF formatında olmalıdır."
      );

      return;
    }

    if (document.size > MAX_FILE_SIZE) {
      setMessage(
        "Öğrenci belgesi en fazla 10 MB olabilir."
      );

      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const formData =
        new FormData();

      formData.append(
        "UniversityId",
        selectedUniversity.id
      );

      formData.append(
        "AcademicUnitId",
        selectedAcademicUnit.id
      );

      formData.append(
        "AcademicProgramId",
        selectedAcademicProgram.id
      );

      formData.append(
        "DocumentIssueDate",
        documentIssueDate
      );

      formData.append(
        "Document",
        document
      );

      await studentApi.post(
        "/student/verifications",
        formData
      );

      resetForm();
      setShowForm(false);

      setMessage(
        "Öğrenci belgeniz incelemeye gönderildi."
      );

      await load();
    } catch (error: unknown) {
      setMessage(
        getErrorMessage(
          error,
          "Belge yüklenirken hata oluştu."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * Pending doğrulama başvurusunu siler.
   */
  const deleteVerification = async (
    item: StudentVerificationItem
  ) => {
    if (item.status !== "Pending") {
      setMessage(
        "Yalnızca inceleme bekleyen doğrulamalar silinebilir."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `"${item.universityName} - ${item.departmentName}" doğrulamasını silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(item.id);
    setMessage("");

    try {
      await studentApi.delete(
        `/student/verifications/${item.id}`
      );

      setMessage(
        "Doğrulama başvurunuz başarıyla silindi."
      );

      await load();
    } catch (error: unknown) {
      setMessage(
        getErrorMessage(
          error,
          "Doğrulama silinirken hata oluştu."
        )
      );
    } finally {
      setDeletingId(null);
    }
  };

  const toggleForm = () => {
    const nextValue =
      !showForm;

    if (!nextValue) {
      resetForm();
    }

    setShowForm(nextValue);
    setMessage("");
  };




  // NOTMARK MATH POINTER ENGINE V34
  // Serbest süzülme: CSS iç katman / Savrulma: JS dış katman.
  useEffect(() => {
    if (loading) return;

    const layer = mathLayerRef.current;
    const page = layer?.parentElement;
    if (!layer || !page) return;

    const shell = page.closest<HTMLElement>(".student-app-shell");
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    );
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    type Particle = {
      element: HTMLElement;
      homeX: number;
      homeY: number;
      x: number;
      y: number;
      vx: number;
      vy: number;
      angle: number;
      va: number;
    };

    const particles: Particle[] = Array.from(
      layer.querySelectorAll<HTMLElement>(
        ".notmark-profile-math-particle"
      )
    ).map((element) => ({
      element,
      homeX: 0,
      homeY: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      angle: 0,
      va: 0,
    }));

    if (particles.length !== 33) return;

    let frame = 0;
    let previousTime = 0;
    let pointerInside = false;
    let pointerX = 0;
    let pointerY = 0;

    const motionEnabled = () =>
      finePointer.matches &&
      !reduced.matches &&
      shell?.getAttribute("data-motion") !== "off" &&
      shell?.getAttribute("data-motion") !== "reduced";

    // NOTMARK DYNAMIC DISTRIBUTION V35
    // İçerik kutularının dışındaki boş alanlara dağıtım.
    const measure = () => {
      const width = page.clientWidth;
      const height = page.clientHeight;

      if (!width || !height) return;

      const pageRect = page.getBoundingClientRect();

      const section = page.querySelector<HTMLElement>(
        ".student-profile-section"
      );

      const header = page.querySelector<HTMLElement>(
        ".student-profile-header"
      );

      const sectionRect = section?.getBoundingClientRect();
      const headerRect = header?.getBoundingClientRect();

      const panel = sectionRect
        ? {
            left: sectionRect.left - pageRect.left,
            right: sectionRect.right - pageRect.left,
            top: sectionRect.top - pageRect.top,
            bottom: sectionRect.bottom - pageRect.top,
          }
        : {
            left: width * 0.17,
            right: width * 0.83,
            top: height * 0.45,
            bottom: height * 0.75,
          };

      const heroBottom = headerRect
        ? headerRect.bottom - pageRect.top
        : Math.min(300, height * 0.35);

      const margin = 58;
      const edge = 20;

      type Zone = {
        left: number;
        top: number;
        right: number;
        bottom: number;
        weight: number;
      };

      const zones: Zone[] = [];

      const addZone = (
        left: number,
        top: number,
        right: number,
        bottom: number,
        weight: number
      ) => {
        const zone = {
          left: Math.max(edge, left),
          top: Math.max(edge, top),
          right: Math.min(width - edge, right),
          bottom: Math.min(height - edge, bottom),
          weight,
        };

        if (
          zone.right - zone.left >= 35 &&
          zone.bottom - zone.top >= 35
        ) {
          zones.push(zone);
        }
      };

      // Karşılama alanında yalnızca birkaç sembol.
      addZone(
        edge,
        edge,
        Math.max(edge + 35, panel.left - margin),
        heroBottom,
        0.35
      );

      addZone(
        panel.right + margin,
        edge,
        width - edge,
        heroBottom,
        0.35
      );

      // Panelin iki yanında yoğun dağılım.
      addZone(
        edge,
        heroBottom + 18,
        panel.left - margin,
        panel.bottom + 30,
        1.4
      );

      addZone(
        panel.right + margin,
        heroBottom + 18,
        width - edge,
        panel.bottom + 30,
        1.4
      );

      // Panelin altındaki boş alan.
      addZone(
        edge,
        panel.bottom + margin,
        width - edge,
        height - edge,
        1.25
      );

      // Panelin üstünde kalan boş alan.
      addZone(
        panel.left,
        heroBottom + margin,
        panel.right,
        panel.top - margin,
        0.45
      );

      // Dar ekranlar için güvenli dağılım.
      if (!zones.length) {
        addZone(
          edge,
          Math.max(heroBottom + 20, panel.bottom + 20),
          width - edge,
          height - edge,
          1
        );
      }

      if (!zones.length) {
        for (const p of particles) {
          p.homeX = p.element.offsetLeft;
          p.homeY = p.element.offsetTop;
        }
        return;
      }

      // Deterministik dağılım:
      // Her yeniden ölçümde semboller rastgele sıçramaz.
      const random = (seed: number) => {
        const value = Math.sin(seed * 127.1 + 78.233) * 43758.5453;
        return value - Math.floor(value);
      };

      const weightedZones = zones.map((zone) => ({
        zone,
        capacity:
          (zone.right - zone.left) *
          (zone.bottom - zone.top) *
          zone.weight,
      }));

      const totalCapacity = weightedZones.reduce(
        (sum, item) => sum + item.capacity,
        0
      );

      particles.forEach((p, index) => {
        const ticket = (
          (index + random(index + 91) * 0.65) /
          particles.length
        ) * totalCapacity;

        let remaining = ticket;
        let selected = weightedZones[weightedZones.length - 1].zone;

        for (const item of weightedZones) {
          if (remaining <= item.capacity) {
            selected = item.zone;
            break;
          }

          remaining -= item.capacity;
        }

        const columns = Math.max(
          1,
          Math.ceil(
            Math.sqrt(
              particles.length *
              (selected.right - selected.left) /
              Math.max(1, selected.bottom - selected.top)
            )
          )
        );

        const rows = Math.max(
          1,
          Math.ceil(particles.length / columns)
        );

        const column = index % columns;
        const row = Math.floor(index / columns) % rows;

        const jitterX = random(index + 7);
        const jitterY = random(index + 19);

        const x = selected.left +
          ((column + 0.2 + jitterX * 0.6) / columns) *
          (selected.right - selected.left);

        const y = selected.top +
          ((row + 0.2 + jitterY * 0.6) / rows) *
          (selected.bottom - selected.top);

        p.element.style.setProperty(
          "left",
          `${Math.max(edge, Math.min(width - edge, x))}px`,
          "important"
        );

        p.element.style.setProperty(
          "top",
          `${Math.max(edge, Math.min(height - edge, y))}px`,
          "important"
        );

        p.homeX = x;
        p.homeY = y;
      });
    };

    const stopAndReset = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      pointerInside = false;
      for (const p of particles) {
        p.x = p.y = p.vx = p.vy = p.angle = p.va = 0;
        p.element.style.transform = "";
      }
    };

    const render = (now: number) => {
      frame = 0;
      if (!motionEnabled() || window.document.hidden) {
        stopAndReset();
        return;
      }

      const step = previousTime
        ? Math.min(1.7, Math.max(0.5, (now - previousTime) / 16.667))
        : 1;
      previousTime = now;
      let moving = false;

      particles.forEach((p, index) => {
        let targetX = 0;
        let targetY = 0;
        let targetAngle = 0;

        if (pointerInside) {
          // Sembolün fiziksel merkezi; CSS'teki iç süzülme bağımsızdır.
          const dx = p.homeX + p.x - pointerX;
          const dy = p.homeY + p.y - pointerY;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const radius = 205;

          if (distance < radius) {
            const t = 1 - distance / radius;
            const falloff = t * t * (3 - 2 * t);
            const strength = (70 / (1 + (index % 5) * 0.09)) * falloff;
            targetX = (dx / distance) * strength;
            targetY = (dy / distance) * strength;
            targetAngle = (targetX / 70) * 11;
          }
        }

        const damp = Math.pow(0.79, step);
        p.vx = (p.vx + (targetX - p.x) * 0.105 * step) * damp;
        p.vy = (p.vy + (targetY - p.y) * 0.105 * step) * damp;
        p.va = (p.va + (targetAngle - p.angle) * 0.09 * step) * damp;
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.angle += p.va * step;

        if (
          Math.abs(p.x - targetX) > 0.15 ||
          Math.abs(p.y - targetY) > 0.15 ||
          Math.abs(p.vx) > 0.08 ||
          Math.abs(p.vy) > 0.08 ||
          Math.abs(p.angle - targetAngle) > 0.12 ||
          Math.abs(p.va) > 0.07
        ) moving = true;

        // Yalnızca transform güncellenir; top/left veya layout ölçümü yok.
        if (moving || Math.abs(p.x) > 0.1 || Math.abs(p.y) > 0.1) {
          p.element.style.transform =
            `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0) ` +
            `rotate(${p.angle.toFixed(2)}deg)`;
        }
      });

      if (moving) frame = window.requestAnimationFrame(render);
      else previousTime = 0;
    };

    const schedule = () => {
      if (!frame && motionEnabled() && !window.document.hidden) {
        frame = window.requestAnimationFrame(render);
      }
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !motionEnabled()) return;
      const rect = page.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
      pointerInside = true;
      schedule();
    };

    const onLeave = () => {
      pointerInside = false;
      schedule();
    };

    const onPreferenceChange = () => {
      if (!motionEnabled()) stopAndReset();
      else {
        measure();
        schedule();
      }
    };

    let layoutFrame = 0;

    const scheduleMeasure = () => {
      if (layoutFrame) {
        window.cancelAnimationFrame(layoutFrame);
      }

      layoutFrame = window.requestAnimationFrame(() => {
        layoutFrame = 0;
        measure();
      });
    };

    const observer = new ResizeObserver(scheduleMeasure);

    observer.observe(page);

    const profileSection = page.querySelector(
      ".student-profile-section"
    );

    const profileHeader = page.querySelector(
      ".student-profile-header"
    );

    if (profileSection) observer.observe(profileSection);
    if (profileHeader) observer.observe(profileHeader);

    window.addEventListener("resize", scheduleMeasure);

    scheduleMeasure();

    const appearanceObserver = shell
      ? new MutationObserver(onPreferenceChange)
      : null;
    if (shell && appearanceObserver) {
      appearanceObserver.observe(shell, {
        attributes: true,
        attributeFilter: ["data-motion"],
      });
    }

    page.addEventListener("pointermove", onMove, { passive: true });
    page.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    window.document.addEventListener("visibilitychange", onPreferenceChange);
    finePointer.addEventListener("change", onPreferenceChange);
    reduced.addEventListener("change", onPreferenceChange);

    return () => {
      stopAndReset();
      observer.disconnect();
      window.removeEventListener("resize", scheduleMeasure);

      if (layoutFrame) {
        window.cancelAnimationFrame(layoutFrame);
      }

      appearanceObserver?.disconnect();
      page.removeEventListener("pointermove", onMove);
      page.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      window.document.removeEventListener("visibilitychange", onPreferenceChange);
      finePointer.removeEventListener("change", onPreferenceChange);
      reduced.removeEventListener("change", onPreferenceChange);
    };
  }, [loading]);

  if (loading) {
    return null;
  }

  const approvedCount =
    items.filter(
      (item) =>
        item.status === "Approved"
    ).length;

  const pendingCount =
    items.filter(
      (item) =>
        item.status === "Pending"
    ).length;

  const activeUniversityCount =
    new Set(
      items
        .filter(
          (item) =>
            item.status === "Approved"
        )
        .map(
          (item) =>
            item.universityName
        )
    ).size;

  return (
    <div
      className="student-profile-page"
      >
        <div
          ref={mathLayerRef}
          className="notmark-profile-math-layer"
          aria-hidden="true"
        >
          {profileMathSymbols.map((symbol, index) => (
            <span
              key={`profile-math-${index}`}
              className="notmark-profile-math-particle"
            >
              <span className="notmark-profile-math-symbol">
                {symbol}
              </span>
            </span>
          ))}
        </div>
      <header className="student-profile-header">
        <div
          className="student-profile-live-users"
          title="Son 90 saniyede aktif öğrenci oturumları"
          aria-live="polite"
        >
          <span
            className="student-profile-live-users__dot"
            aria-hidden="true"
          />

          <span className="student-profile-live-users__live">
            CANLI
          </span>

          <span className="student-profile-live-users__label">
            Çevrimiçi Kullanıcı:
          </span>

          <strong
            key={activeStudentCount}
            className="student-profile-live-users__count"
          >
            {activeStudentCount}
          </strong>
        </div>

        <div className="student-profile-header__content">
          <span className="student-profile-eyebrow">
            <span className="student-profile-eyebrow__dot" />
            ÖĞRENCİ HESABI
          </span>

          <h1>
            Hoş geldin,{" "}
            <span>
              {student?.displayName}
            </span>
          </h1>

          <p>
            Akademik kimliğinizi,
            doğrulamalarınızı ve NotMark
            içerisindeki yetkilerinizi tek
            merkezden yönetin.
          </p>

          <div className="student-profile-hero-status">
            <span className="student-profile-hero-status__icon">
              <CheckCircle2 size={14} />
            </span>

            <span className="student-profile-hero-status__badge">
              DOĞRULANDI
            </span>

            <span className="student-profile-hero-status__label">
              Akademik Erişiminiz Aktif
            </span>
          </div>
        </div>

        <div className="student-profile-stats">
          <div className="student-profile-stat-card">
            <div className="student-profile-stat-card__icon">
              <CheckCircle2 size={19} />
            </div>

            <div>
              <strong>
                {approvedCount}
              </strong>

              <span>
                Doğrulanmış bölüm
              </span>
            </div>
          </div>

          <div className="student-profile-stat-card">
            <div className="student-profile-stat-card__icon">
              <GraduationCap size={19} />
            </div>

            <div>
              <strong>
                {activeUniversityCount}
              </strong>

              <span>
                Aktif üniversite
              </span>
            </div>
          </div>

          <div className="student-profile-stat-card">
            <div className="student-profile-stat-card__icon">
              <Clock3 size={19} />
            </div>

            <div>
              <strong>
                {pendingCount}
              </strong>

              <span>
                Bekleyen başvuru
              </span>
            </div>
          </div>
        </div>
      </header>

      {message && (
        <div
          className="student-message"
          role="status"
          aria-live="polite"
        >
          {message}
        </div>
      )}

      <section className="student-profile-section">
        <div className="student-section-heading">
          <div>
            <h2>
              Üniversite Doğrulamalarım
            </h2>

            <p>
              Onaylanan her bölüm
              NotMark içerisinde ayrı
              akademik yetki sağlar.
            </p>
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={toggleForm}
          >
            <Plus size={17} />

            {showForm
              ? "Formu kapat"
              : "Yeni üniversite ekle"}
          </button>
        </div>

        {showForm && (
          <form
            className="student-verification-form"
            onSubmit={submit}
            autoComplete="off"
          >
            <h3>
              Yeni öğrenci doğrulaması
            </h3>

            <div className="student-form-grid">
              <label className="university-autocomplete">
                <span id="university-field-label">
                  Üniversite
                </span>

                <div className="university-autocomplete__control">
                  <div
                    ref={universityEditorRef}
                    id="notmarket-university-search"
                    className="university-autocomplete__editor"
                    contentEditable
                    suppressContentEditableWarning
                    tabIndex={0}
                    data-placeholder="Üniversite adını yazın"
                    role="combobox"
                    aria-labelledby="university-field-label"
                    aria-required="true"
                    aria-autocomplete="list"
                    aria-haspopup="listbox"
                    aria-expanded={
                      universityDropdownOpen
                    }
                    aria-controls={
                      universityDropdownOpen
                        ? "university-search-results"
                        : undefined
                    }
                    aria-activedescendant={
                      universityDropdownOpen &&
                      highlightedUniversityIndex >= 0
                        ? `university-option-${highlightedUniversityIndex}`
                        : undefined
                    }
                    spellCheck={false}
                    onInput={(event) => {
                      const rawValue =
                        event.currentTarget
                          .textContent ?? "";

                      const value =
                        normalizeEditableText(
                          rawValue
                        );

                      if (rawValue !== value) {
                        event.currentTarget
                          .textContent =
                            value;
                      }

                      handleUniversityQueryChange(
                        value
                      );
                    }}
                    onPaste={(event) => {
                      event.preventDefault();

                      const text =
                        normalizeEditableText(
                          event.clipboardData
                            .getData("text/plain")
                        );

                      insertPlainTextAtCursor(
                        text
                      );

                      const currentValue =
                        event.currentTarget
                          .textContent ?? "";

                      handleUniversityQueryChange(
                        currentValue
                      );
                    }}
                    onKeyDown={
                      handleUniversityKeyDown
                    }
                    onFocus={() => {
                      universityInputFocusedRef.current =
                        true;

                      if (
                        universityQuery
                          .trim()
                          .length >= 2 &&
                        !selectedUniversity
                      ) {
                        setUniversityDropdownOpen(
                          true
                        );
                      }
                    }}
                    onBlur={() => {
                      universityInputFocusedRef.current =
                        false;

                      window.setTimeout(
                        () => {
                          setUniversityDropdownOpen(
                            false
                          );

                          setHighlightedUniversityIndex(
                            -1
                          );
                        },
                        150
                      );
                    }}
                  />

                  <input
                    type="hidden"
                    name="UniversityId"
                    value={
                      selectedUniversity?.id ??
                      ""
                    }
                  />

                  {selectedUniversity && (
                    <span className="university-selected-indicator">
                      Seçildi
                    </span>
                  )}
                </div>

                {universityDropdownOpen && (
                  <div
                    id="university-search-results"
                    className="university-autocomplete__dropdown"
                    role="listbox"
                    aria-label="Üniversite arama sonuçları"
                    aria-busy={
                      universitySearching
                    }
                  >
                    {universitySearching && (
                      <div className="university-autocomplete__state">
                        Üniversiteler aranıyor...
                      </div>
                    )}

                    {!universitySearching &&
                      universityResults.length ===
                        0 && (
                        <div className="university-autocomplete__state">
                          Eşleşen üniversite
                          bulunamadı.
                        </div>
                      )}

                    {!universitySearching &&
                      universityResults.map(
                        (
                          university,
                          index
                        ) => (
                          <button
                            id={`university-option-${index}`}
                            key={
                              university.id
                            }
                            type="button"
                            role="option"
                            aria-selected={
                              index ===
                              highlightedUniversityIndex
                            }
                            className={
                              index ===
                              highlightedUniversityIndex
                                ? "university-autocomplete__option university-autocomplete__option--active"
                                : "university-autocomplete__option"
                            }
                            onMouseEnter={() =>
                              setHighlightedUniversityIndex(
                                index
                              )
                            }
                            onPointerDown={(
                              event
                            ) => {
                              event.preventDefault();
                            }}
                            onClick={() =>
                              selectUniversity(
                                university
                              )
                            }
                          >
                            {
                              university.name
                            }
                          </button>
                        )
                      )}
                  </div>
                )}

                <small>
                  En az iki karakter yazın ve
                  listeden bir Türkiye
                  üniversitesi seçin.
                </small>
              </label>

              <label className="university-autocomplete">
                <span id="academic-unit-field-label">
                  Fakülte / Akademik birim
                </span>

                <div className="university-autocomplete__control">
                  <div
                    ref={academicUnitEditorRef}
                    id="notmarket-academic-unit-search"
                    className="university-autocomplete__editor"
                    contentEditable={
                      Boolean(
                        selectedUniversity
                      )
                    }
                    suppressContentEditableWarning
                    tabIndex={
                      selectedUniversity
                        ? 0
                        : -1
                    }
                    data-placeholder={
                      selectedUniversity
                        ? "Fakülte veya akademik birim yazın"
                        : "Önce üniversite seçin"
                    }
                    role="combobox"
                    aria-labelledby="academic-unit-field-label"
                    aria-required="true"
                    aria-disabled={
                      !selectedUniversity
                    }
                    aria-autocomplete="list"
                    aria-haspopup="listbox"
                    aria-expanded={
                      academicUnitDropdownOpen
                    }
                    aria-controls={
                      academicUnitDropdownOpen
                        ? "academic-unit-search-results"
                        : undefined
                    }
                    aria-activedescendant={
                      academicUnitDropdownOpen &&
                      highlightedAcademicUnitIndex >=
                        0
                        ? `academic-unit-option-${highlightedAcademicUnitIndex}`
                        : undefined
                    }
                    spellCheck={false}
                    onInput={(event) => {
                      if (!selectedUniversity) {
                        return;
                      }

                      const rawValue =
                        event.currentTarget
                          .textContent ?? "";

                      const value =
                        normalizeEditableText(
                          rawValue
                        );

                      if (rawValue !== value) {
                        event.currentTarget
                          .textContent =
                            value;
                      }

                      handleAcademicUnitQueryChange(
                        value
                      );
                    }}
                    onPaste={(event) => {
                      if (!selectedUniversity) {
                        event.preventDefault();
                        return;
                      }

                      event.preventDefault();

                      const text =
                        normalizeEditableText(
                          event.clipboardData
                            .getData("text/plain")
                        );

                      insertPlainTextAtCursor(
                        text
                      );

                      const currentValue =
                        event.currentTarget
                          .textContent ?? "";

                      handleAcademicUnitQueryChange(
                        currentValue
                      );
                    }}
                    onKeyDown={
                      handleAcademicUnitKeyDown
                    }
                    onFocus={() => {
                      if (!selectedUniversity) {
                        return;
                      }

                      academicUnitInputFocusedRef.current =
                        true;

                      if (
                        academicUnitQuery
                          .trim()
                          .length >= 2 &&
                        !selectedAcademicUnit
                      ) {
                        setAcademicUnitDropdownOpen(
                          true
                        );
                      }
                    }}
                    onBlur={() => {
                      academicUnitInputFocusedRef.current =
                        false;

                      window.setTimeout(
                        () => {
                          setAcademicUnitDropdownOpen(
                            false
                          );

                          setHighlightedAcademicUnitIndex(
                            -1
                          );
                        },
                        150
                      );
                    }}
                  />

                  <input
                    type="hidden"
                    name="AcademicUnitId"
                    value={
                      selectedAcademicUnit?.id ??
                      ""
                    }
                  />

                  {selectedAcademicUnit && (
                    <span className="university-selected-indicator">
                      Seçildi
                    </span>
                  )}
                </div>

                {academicUnitDropdownOpen && (
                  <div
                    id="academic-unit-search-results"
                    className="university-autocomplete__dropdown"
                    role="listbox"
                    aria-label="Akademik birim arama sonuçları"
                    aria-busy={
                      academicUnitSearching
                    }
                  >
                    {academicUnitSearching && (
                      <div className="university-autocomplete__state">
                        Akademik birimler
                        aranıyor...
                      </div>
                    )}

                    {!academicUnitSearching &&
                      academicUnitResults.length ===
                        0 && (
                        <div className="university-autocomplete__state">
                          Eşleşen akademik birim
                          bulunamadı.
                        </div>
                      )}

                    {!academicUnitSearching &&
                      academicUnitResults.map(
                        (
                          academicUnit,
                          index
                        ) => (
                          <button
                            id={`academic-unit-option-${index}`}
                            key={
                              academicUnit.id
                            }
                            type="button"
                            role="option"
                            aria-selected={
                              index ===
                              highlightedAcademicUnitIndex
                            }
                            className={
                              index ===
                              highlightedAcademicUnitIndex
                                ? "university-autocomplete__option university-autocomplete__option--active"
                                : "university-autocomplete__option"
                            }
                            onMouseEnter={() =>
                              setHighlightedAcademicUnitIndex(
                                index
                              )
                            }
                            onPointerDown={(
                              event
                            ) => {
                              event.preventDefault();
                            }}
                            onClick={() =>
                              selectAcademicUnit(
                                academicUnit
                              )
                            }
                          >
                            <span>
                              {
                                academicUnit.name
                              }
                            </span>
                          </button>
                        )
                      )}
                  </div>
                )}

                <small>
                  Üniversiteyi seçtikten sonra
                  en az iki karakter yazın.
                </small>
              </label>

              <label className="university-autocomplete">
                <span id="academic-program-field-label">
                  Bölüm / Program
                </span>

                <div className="university-autocomplete__control">
                  <div
                    ref={academicProgramEditorRef}
                    id="notmarket-academic-program-search"
                    className="university-autocomplete__editor"
                    contentEditable={
                      Boolean(
                        selectedAcademicUnit
                      )
                    }
                    suppressContentEditableWarning
                    tabIndex={
                      selectedAcademicUnit
                        ? 0
                        : -1
                    }
                    data-placeholder={
                      selectedAcademicUnit
                        ? "Bölüm veya program yazın"
                        : "Önce akademik birim seçin"
                    }
                    role="combobox"
                    aria-labelledby="academic-program-field-label"
                    aria-required="true"
                    aria-disabled={
                      !selectedAcademicUnit
                    }
                    aria-autocomplete="list"
                    aria-haspopup="listbox"
                    aria-expanded={
                      academicProgramDropdownOpen
                    }
                    aria-controls={
                      academicProgramDropdownOpen
                        ? "academic-program-search-results"
                        : undefined
                    }
                    aria-activedescendant={
                      academicProgramDropdownOpen &&
                      highlightedAcademicProgramIndex >=
                        0
                        ? `academic-program-option-${highlightedAcademicProgramIndex}`
                        : undefined
                    }
                    spellCheck={false}
                    onInput={(event) => {
                      if (
                        !selectedAcademicUnit
                      ) {
                        return;
                      }

                      const rawValue =
                        event.currentTarget
                          .textContent ?? "";

                      const value =
                        normalizeEditableText(
                          rawValue
                        );

                      if (rawValue !== value) {
                        event.currentTarget
                          .textContent =
                            value;
                      }

                      handleAcademicProgramQueryChange(
                        value
                      );
                    }}
                    onPaste={(event) => {
                      if (
                        !selectedAcademicUnit
                      ) {
                        event.preventDefault();
                        return;
                      }

                      event.preventDefault();

                      const text =
                        normalizeEditableText(
                          event.clipboardData
                            .getData("text/plain")
                        );

                      insertPlainTextAtCursor(
                        text
                      );

                      const currentValue =
                        event.currentTarget
                          .textContent ?? "";

                      handleAcademicProgramQueryChange(
                        currentValue
                      );
                    }}
                    onKeyDown={
                      handleAcademicProgramKeyDown
                    }
                    onFocus={() => {
                      if (
                        !selectedAcademicUnit
                      ) {
                        return;
                      }

                      academicProgramInputFocusedRef.current =
                        true;

                      if (
                        academicProgramQuery
                          .trim()
                          .length >= 2 &&
                        !selectedAcademicProgram
                      ) {
                        setAcademicProgramDropdownOpen(
                          true
                        );
                      }
                    }}
                    onBlur={() => {
                      academicProgramInputFocusedRef.current =
                        false;

                      window.setTimeout(
                        () => {
                          setAcademicProgramDropdownOpen(
                            false
                          );

                          setHighlightedAcademicProgramIndex(
                            -1
                          );
                        },
                        150
                      );
                    }}
                  />

                  <input
                    type="hidden"
                    name="AcademicProgramId"
                    value={
                      selectedAcademicProgram?.id ??
                      ""
                    }
                  />

                  {selectedAcademicProgram && (
                    <span className="university-selected-indicator">
                      Seçildi
                    </span>
                  )}
                </div>

                {academicProgramDropdownOpen && (
                  <div
                    id="academic-program-search-results"
                    className="university-autocomplete__dropdown"
                    role="listbox"
                    aria-label="Bölüm ve program arama sonuçları"
                    aria-busy={
                      academicProgramSearching
                    }
                  >
                    {academicProgramSearching && (
                      <div className="university-autocomplete__state">
                        Bölüm ve programlar
                        aranıyor...
                      </div>
                    )}

                    {!academicProgramSearching &&
                      academicProgramResults.length ===
                        0 && (
                        <div className="university-autocomplete__state">
                          Eşleşen bölüm veya
                          program bulunamadı.
                        </div>
                      )}

                    {!academicProgramSearching &&
                      academicProgramResults.map(
                        (
                          academicProgram,
                          index
                        ) => (
                          <button
                            id={`academic-program-option-${index}`}
                            key={
                              academicProgram.id
                            }
                            type="button"
                            role="option"
                            aria-selected={
                              index ===
                              highlightedAcademicProgramIndex
                            }
                            className={
                              index ===
                              highlightedAcademicProgramIndex
                                ? "university-autocomplete__option university-autocomplete__option--active"
                                : "university-autocomplete__option"
                            }
                            onMouseEnter={() =>
                              setHighlightedAcademicProgramIndex(
                                index
                              )
                            }
                            onPointerDown={(
                              event
                            ) => {
                              event.preventDefault();
                            }}
                            onClick={() =>
                              selectAcademicProgram(
                                academicProgram
                              )
                            }
                          >
                            {
                              academicProgram.name
                            }
                          </button>
                        )
                      )}
                  </div>
                )}

                <small>
                  Akademik birimi seçtikten
                  sonra en az iki karakter
                  yazın.
                </small>
              </label>

              <label>
                Belge tarihi

                <input
                  name="notmarket-document-issue-date"
                  type="date"
                  value={documentIssueDate}
                  min={
                    getMinimumDocumentDateInputValue()
                  }
                  max={
                    getTodayInputValue()
                  }
                  autoComplete="off"
                  onChange={(event) =>
                    setDocumentIssueDate(
                      event.target.value
                    )
                  }
                  required
                />
              </label>
            </div>

            <label className="student-file-field">
              Öğrenci belgesi

              <input
                name="notmarket-student-document"
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) =>
                  setDocument(
                    event.target.files?.[0] ??
                      null
                  )
                }
                required
              />

              <small>
                Yalnızca PDF • Maksimum
                10 MB • Son 30 gün içinde
                alınmış belge
              </small>
            </label>

            <div className="student-form-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={submitting}
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                  setMessage("");
                }}
              >
                Vazgeç
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={submitting}
              >
                {submitting
                  ? "Gönderiliyor..."
                  : "İncelemeye gönder"}
              </button>
            </div>
          </form>
        )}

        <div className="student-verification-list">
          {items.length === 0 && (
              <div className="empty-state">
                Henüz öğrenci
                doğrulamanız yok.
              </div>
            )}

          {items.map((item) => (
              <VerificationCard
                key={item.id}
                item={item}
                deleting={
                  deletingId === item.id
                }
                onDelete={
                  deleteVerification
                }
              />
            ))}
        </div>
      </section>
    </div>
  );
}

function VerificationCard({
  item,
  deleting,
  onDelete,
}: {
  item: StudentVerificationItem;
  deleting: boolean;
  onDelete: (
    item: StudentVerificationItem
  ) => Promise<void>;
}) {
  const [
    appealOpen,
    setAppealOpen,
  ] = useState(false);

  return (
    <article className="student-verification-card">
      <div className="student-verification-icon">
        <GraduationCap size={22} />
      </div>

      <div className="student-verification-main">
        <div className="student-verification-title">
          <div>
            <h3>
              {item.universityName}
            </h3>

            <p>
              {item.facultyName}
              {" • "}
              {item.departmentName}
            </p>
          </div>

          <StudentVerificationStatus
            status={item.status}
          />
        </div>

        <div className="student-verification-meta">
          <span>
            Belge tarihi:{" "}
            <strong>
              {formatDate(
                item.documentIssueDate
              )}
            </strong>
          </span>

          <span>
            Geçerlilik:{" "}
            <strong>
              {item.expiresAt
                ? formatDate(
                    item.expiresAt
                  )
                : "Henüz yok"}
            </strong>
          </span>
        </div>

        {item.status === "Pending" && (
          <div className="student-verification-card__actions">
            <button
              type="button"
              className="student-delete-button"
              disabled={deleting}
              onClick={() =>
                void onDelete(item)
              }
            >
              <Trash2 size={16} />

              {deleting
                ? "Siliniyor..."
                : "Doğrulamayı sil"}
            </button>
          </div>
        )}

        {item.status === "Rejected" &&
          item.reviewNote && (
            <div className="student-rejection-note">
              <strong>
                Ret gerekçesi
              </strong>

              <p>
                {item.reviewNote}
              </p>
            </div>
          )}

        {item.status === "Rejected" && (
          <div className="student-verification-card__actions">
            <button
              type="button"
              className="student-appeal-button"
              onClick={() =>
                setAppealOpen(true)
              }
            >
              <AlertTriangle size={16} />
              Karara İtiraz Et
            </button>
          </div>
        )}

        <StudentComplaintDialog
          open={appealOpen}
          category="Verification"
          relatedEntityId={item.id}
          title="Doğrulama Kararına İtiraz"
          description={`${item.universityName} doğrulaması için verilen ret kararının yeniden incelenmesini talep edebilirsiniz.`}
          defaultSubject={`${item.universityName} doğrulama ret kararına itiraz`}
          onClose={() =>
            setAppealOpen(false)
          }
        />
      </div>
    </article>
  );
}

function StudentVerificationStatus({
  status,
}: {
  status: string;
}) {
  if (status === "Approved") {
    return (
      <span className="student-status student-status--approved">
        <CheckCircle2 size={15} />
        Doğrulandı
      </span>
    );
  }

  if (status === "Rejected") {
    return (
      <span className="student-status student-status--rejected">
        <XCircle size={15} />
        Reddedildi
      </span>
    );
  }

  return (
    <span className="student-status student-status--pending">
      <Clock3 size={15} />
      İncelemede
    </span>
  );
}

function formatDate(
  value: string
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "tr-TR"
  );
}

function getTodayInputValue(): string {
  return formatDateForInput(
    new Date()
  );
}

function getMinimumDocumentDateInputValue(): string {
  const minimumDate =
    new Date();

  minimumDate.setDate(
    minimumDate.getDate() - 30
  );

  return formatDateForInput(
    minimumDate
  );
}

function formatDateForInput(
  date: Date
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/*
 * contentEditable metnini tek satıra
 * ve düz boşluklara dönüştürür.
 */
function normalizeEditableText(
  value: string
): string {
  return value
    .replace(
      /[\r\n]+/g,
      " "
    )
    .replace(
      /\u00a0/g,
      " "
    );
}

/*
 * Clipboard içeriğini contentEditable alana
 * yalnızca düz metin olarak ekler.
 */
function insertPlainTextAtCursor(
  text: string
) {
  const selection =
    window.getSelection();

  if (
    !selection ||
    selection.rangeCount === 0
  ) {
    return;
  }

  const range =
    selection.getRangeAt(0);

  range.deleteContents();

  const textNode =
    document.createTextNode(text);

  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.collapse(true);

  selection.removeAllRanges();
  selection.addRange(range);
}

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (
    isAxiosError<ApiErrorResponse>(
      error
    )
  ) {
    return (
      error.response?.data
        ?.message ??
      fallback
    );
  }

  return fallback;
}
