import { getSupabaseClient } from "@/lib/supabase/server-client";
import {
  getRecentChanges as getDummyRecentChanges,
  getThemeStocks as getDummyThemeStocks,
  getThemes as getDummyThemes,
} from "@/lib/dummy-data";
import type { RecentChange, Theme, ThemeStockSummary } from "@/types";

// HOME / THEME 向けの Repository（Supabase版）。
// dummy-data.ts と同じ関数名・戻り値の型にしてあるので、
// page.tsx 側は import 元を変えるだけで差し替えられる。
//
// 注意（2026-09-11 ユーザー確認済み・STEP2時点の暫定対応）:
// - 「最近の変化」（recentUpdateCount / recentUpdateLabel / getRecentChanges）は
//   News/Disclosure Provider（未接続）から取得する想定のデータで、現在のDB
//   スキーマには保存先が無いため、dummy-data.ts の値をそのまま使う。
// - THEME の成長性・割高感（growth / valuation）は AI Provider（未接続）が
//   生成する想定のデータで、theme_stocks テーブルには列が無いため、
//   dummy-data.ts の該当銘柄の値を暫定的に重ね合わせる。
//   dummy-data.ts に対応データが無い銘柄は暫定値 "△" とする。

type ThemeRow = { id: string; name: string };
type ThemeStockCountRow = { theme_id: string };
type ThemeStockRow = {
  stock_code: string;
  reason: string;
  stocks: { name: string } | null;
};

async function fetchStockCountByTheme(): Promise<Map<string, number>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("theme_stocks").select("theme_id");
  if (error) {
    throw error;
  }

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as ThemeStockCountRow[]) {
    counts.set(row.theme_id, (counts.get(row.theme_id) ?? 0) + 1);
  }
  return counts;
}

export async function getThemes(): Promise<Theme[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("themes").select("id, name").order("id");
  if (error) {
    throw error;
  }

  const stockCountByTheme = await fetchStockCountByTheme();
  const dummyById = new Map(getDummyThemes().map((theme) => [theme.id, theme]));

  return (data as ThemeRow[]).map((row) => {
    const dummy = dummyById.get(row.id);
    return {
      id: row.id,
      name: row.name,
      stockCount: stockCountByTheme.get(row.id) ?? 0,
      recentUpdateCount: dummy?.recentUpdateCount ?? 0,
      recentUpdateLabel: dummy?.recentUpdateLabel ?? "",
    };
  });
}

export async function getThemeById(id: string): Promise<Theme | undefined> {
  const themes = await getThemes();
  return themes.find((theme) => theme.id === id);
}

export async function getThemeStocks(themeId: string): Promise<ThemeStockSummary[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("theme_stocks")
    .select("stock_code, reason, stocks(name)")
    .eq("theme_id", themeId);
  if (error) {
    throw error;
  }

  const dummyByCode = new Map(getDummyThemeStocks(themeId).map((stock) => [stock.code, stock]));

  return (data as unknown as ThemeStockRow[]).map((row) => {
    const dummy = dummyByCode.get(row.stock_code);
    return {
      code: row.stock_code,
      name: row.stocks?.name ?? row.stock_code,
      reason: row.reason,
      growth: dummy?.growth ?? "△",
      valuation: dummy?.valuation ?? "△",
    };
  });
}

export function getRecentChanges(): RecentChange[] {
  return getDummyRecentChanges();
}
