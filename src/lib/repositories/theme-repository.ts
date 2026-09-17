import { getSupabaseClient } from "@/lib/supabase/server-client";
import {
  getThemes as getDummyThemes,
  getThemeStocks as getDummyThemeStocks,
} from "@/lib/dummy-data";
import type { Theme, ThemeStockSummary } from "@/types";

// HOME / THEME 画面向けRepository。
// 画面(page.tsx)はここだけを呼び、Supabaseを直接呼ばない。
//
// スコープ:
// - Supabaseの themes テーブルから id / name を取得する（getThemes / getThemeById）。
// - Supabaseの theme_stocks + stocks を結合し、テーマ内銘柄一覧を取得する（getThemeStocks）。
// - stockCount / recentUpdateCount / recentUpdateLabel、および growth / valuation は
//   theme_stocks集計・News/Disclosure/AI Provider（いずれも未接続）が必要なため、
//   このSTEPでは対象外とし、dummy-data.ts の値をそのまま重ね合わせる。
// - Supabase未設定・接続エラー時はアプリを落とさず、dummy-data.ts の内容
//   をそのまま返す（フォールバック）。

type ThemeRow = {
  id: string;
  name: string;
};

type ThemeStockRow = {
  stock_code: string;
  reason: string;
  stocks: { name: string } | null;
};

export async function getThemes(): Promise<Theme[]> {
  const dummyThemes = getDummyThemes();

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("themes")
      .select("id, name")
      .order("id");

    if (error) {
      throw error;
    }

    const dummyById = new Map(dummyThemes.map((theme) => [theme.id, theme]));

    return (data as ThemeRow[]).map((row) => {
      const dummy = dummyById.get(row.id);
      return {
        id: row.id,
        name: row.name,
        stockCount: dummy?.stockCount ?? 0,
        recentUpdateCount: dummy?.recentUpdateCount ?? 0,
        recentUpdateLabel: dummy?.recentUpdateLabel ?? "",
      };
    });
  } catch (error) {
    console.error(
      "[theme-repository] Supabaseからのテーマ取得に失敗したため、dummy-data.tsにフォールバックしました:",
      error
    );
    return dummyThemes;
  }
}

export async function getThemeById(id: string): Promise<Theme | undefined> {
  const themes = await getThemes();
  return themes.find((theme) => theme.id === id);
}

export async function getThemeStocks(themeId: string): Promise<ThemeStockSummary[]> {
  const dummyStocks = getDummyThemeStocks(themeId);

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("theme_stocks")
      .select("stock_code, reason, stocks(name)")
      .eq("theme_id", themeId);

    if (error) {
      throw error;
    }

    const dummyByCode = new Map(dummyStocks.map((stock) => [stock.code, stock]));

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
  } catch (error) {
    console.error(
      "[theme-repository] Supabaseからの銘柄取得に失敗したため、dummy-data.tsにフォールバックしました:",
      error
    );
    return dummyStocks;
  }
}
