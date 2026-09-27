import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { parseRatesSheet, resolveRates, ResolvedRates, YearRates } from "@/lib/tax-rates";

const STORAGE_KEY = "cukai.taxRatesSheet";

interface StoredSheet {
  url: string;
  csv: string | null;
  fetchedAt: string | null;
}

function loadStored(): StoredSheet | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSheet) : null;
  } catch { return null; }
}

function saveStored(value: StoredSheet | null) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* storage unavailable: rates still work for this session */ }
}

function safeParse(csv: string | null): Map<number, Partial<YearRates>> | null {
  if (!csv) return null;
  try { return parseRatesSheet(csv); } catch { return null; }
}

interface TaxRatesContextValue {
  sheetUrl: string | null;
  fetchedAt: string | null;
  loading: boolean;
  error: string | null;
  sheetYears: number[];
  setSheetUrl: (url: string | null) => Promise<boolean>;
  refresh: () => Promise<boolean>;
  ratesFor: (year: number) => ResolvedRates;
}

const TaxRatesContext = createContext<TaxRatesContextValue | null>(null);

export function TaxRatesProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredSheet | null>(loadStored);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Each load or remove bumps this; a response from an older request is ignored
  const requestId = useRef(0);

  const fetchSheet = useCallback(async (url: string): Promise<boolean> => {
    const id = ++requestId.current;
    const isLatest = () => id === requestId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Couldn't load the sheet (HTTP ${res.status}).`);
      const csv = await res.text();
      if (csv.trimStart().startsWith("<")) {
        throw new Error("That link returned a web page, not CSV. Use File → Share → Publish to web → CSV.");
      }
      const parsed = parseRatesSheet(csv);
      if (parsed.size === 0) throw new Error("No rate rows found in the sheet.");
      if (!isLatest()) return false;
      const next = { url, csv, fetchedAt: new Date().toISOString() };
      setStored(next);
      saveStored(next);
      return true;
    } catch (err) {
      if (isLatest()) setError(err instanceof Error ? err.message : "Couldn't load the sheet.");
      return false;
    } finally {
      if (isLatest()) setLoading(false);
    }
  }, []);

  // Refresh once on start; the cached copy is used until then (and when offline)
  useEffect(() => {
    if (stored?.url) fetchSheet(stored.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSheetUrl = useCallback(async (url: string | null) => {
    if (!url) {
      requestId.current++;
      setLoading(false);
      setStored(null);
      saveStored(null);
      setError(null);
      return true;
    }
    return fetchSheet(url.trim());
  }, [fetchSheet]);

  const refresh = useCallback(async () => (stored?.url ? fetchSheet(stored.url) : false), [stored, fetchSheet]);

  const sheet = useMemo(() => safeParse(stored?.csv ?? null), [stored]);
  const ratesFor = useCallback((year: number) => resolveRates(sheet, year), [sheet]);
  const sheetYears = useMemo(() => (sheet ? [...sheet.keys()].sort((a, b) => a - b) : []), [sheet]);

  return (
    <TaxRatesContext.Provider
      value={{
        sheetUrl: stored?.url ?? null,
        fetchedAt: stored?.fetchedAt ?? null,
        loading,
        error,
        sheetYears,
        setSheetUrl,
        refresh,
        ratesFor,
      }}
    >
      {children}
    </TaxRatesContext.Provider>
  );
}

export function useTaxRatesContext() {
  const ctx = useContext(TaxRatesContext);
  if (!ctx) throw new Error("useTaxRatesContext must be used within TaxRatesProvider");
  return ctx;
}

export function useTaxRates(year: number): ResolvedRates {
  const { ratesFor } = useTaxRatesContext();
  return useMemo(() => ratesFor(year), [ratesFor, year]);
}
