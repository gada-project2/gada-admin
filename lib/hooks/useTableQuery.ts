"use client";

// Must be used inside a <Suspense> boundary — Next.js 16 calls useSearchParams()
// inside this hook, which requires Suspense at the page level.

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, type QueryKey } from "@tanstack/react-query";
import type { PaginationMeta } from "@/lib/api/types/admin";

interface TableState {
  page: number;
  perPage: number;
  search: string;
  extras: Record<string, string>;
}

export interface UseTableQueryResult<TRow> {
  rows: TRow[];
  meta: PaginationMeta | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  search: string;
  setSearch: (s: string) => void;
  page: number;
  setPage: (p: number) => void;
  params: Record<string, string>;
  setParam: (key: string, value: string) => void;
}

export interface UseTableQueryOptions<TRow, TParams> {
  // Raw generated fetch function (e.g. adminControllerGetVendors), NOT the hook wrapper.
  // useTableQuery calls TanStack's useQuery internally, so hook rules are fully satisfied.
  fetchFn: (params: TParams, options?: RequestInit) => Promise<unknown>;
  queryKey: (params: TParams) => QueryKey;
  mapParams: (state: TableState) => TParams;
  extractRows: (data: unknown) => TRow[];
  extractMeta: (data: unknown) => PaginationMeta | undefined;
  perPage?: number;
  // URL param keys beyond page/search to read/write (e.g. ["status", "startDate"])
  extraParamKeys?: string[];
}

export function useTableQuery<TRow, TParams>({
  fetchFn,
  queryKey,
  mapParams,
  extractRows,
  extractMeta,
  perPage = 10,
  extraParamKeys = [],
}: UseTableQueryOptions<TRow, TParams>): UseTableQueryResult<TRow> {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const searchInUrl = searchParams.get("search") ?? "";

  const extras: Record<string, string> = {};
  for (const key of extraParamKeys) {
    const val = searchParams.get(key);
    if (val !== null) extras[key] = val;
  }

  const [searchInput, setSearchInput] = useState(searchInUrl);

  // Keep local input in sync when URL changes externally (e.g. browser back)
  useEffect(() => { setSearchInput(searchInUrl); }, [searchInUrl]);

  // Debounce: push search to URL 400 ms after the user stops typing
  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams(searchParams.toString());
      if (searchInput) p.set("search", searchInput); else p.delete("search");
      p.set("page", "1");
      router.replace(`?${p.toString()}`);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const setPage = useCallback(
    (p: number) => {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("page", String(p));
      router.replace(`?${sp.toString()}`);
    },
    [router, searchParams],
  );

  const setParam = useCallback(
    (key: string, value: string) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (value) sp.set(key, value); else sp.delete(key);
      sp.set("page", "1");
      router.replace(`?${sp.toString()}`);
    },
    [router, searchParams],
  );

  const queryParams = mapParams({ page, perPage, search: searchInUrl, extras });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKey(queryParams),
    queryFn: ({ signal }) => fetchFn(queryParams, { signal } as RequestInit),
  });

  return {
    rows: extractRows(data),
    meta: extractMeta(data),
    isLoading,
    isError,
    refetch,
    search: searchInput,
    setSearch: setSearchInput,
    page,
    setPage,
    params: extras,
    setParam,
  };
}
