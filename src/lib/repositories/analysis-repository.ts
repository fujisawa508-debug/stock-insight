import { getSupabaseClient } from "@/lib/supabase/server-client";
import { getAnalysisSetById as getDummyAnalysisSetById } from "@/lib/dummy-data";
import type { AnalysisSet, AnalysisSetItem } from "@/types";

// SET画面向けRepository（STEP2: 最小構成）。
// 画面(page.tsx)はここだけを呼び、Supabaseを直接呼ばない。
//
// スコープ:
// - analysis_sets / analysis_items / stock_snapshots / stocks を結合し、
//   分析セット本体と銘柄ごとの分析時点スナップショットを取得する。
// - REVIEW画面（reviewNote / currentPrice）はこのSTEPの対象外。
// - Supabase未設定・接続エラー時はアプリを落とさず、dummy-data.ts の内容
//   をそのまま返す（フォールバック）。

type AnalysisSetRow = {
  id: string;
  theme_id: string;
  title: string;
  analyzed_at: string;
};

type Snapshot = {
  price: number;
  per: number;
  pbr: number;
  roe: number;
};

type AnalysisItemRow = {
  stock_code: string;
  stocks: { name: string } | null;
  stock_snapshots: Snapshot | Snapshot[] | null;
};

// PostgRESTの1:1埋め込みは戻り値が単一オブジェクトのことも配列のこともあるため、
// どちらの形でも先頭要素を安全に取り出す。
function firstOrSelf<T>(value: T | T[] | null): T | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value ?? undefined;
}

export async function getAnalysisSetById(id: string): Promise<AnalysisSet | undefined> {
  const dummySet = getDummyAnalysisSetById(id);

  try {
    const supabase = getSupabaseClient();

    const { data: setRow, error: setError } = await supabase
      .from("analysis_sets")
      .select("id, theme_id, title, analyzed_at")
      .eq("id", id)
      .maybeSingle();

    if (setError) {
      throw setError;
    }

    if (!setRow) {
      return dummySet;
    }

    const { data: itemRows, error: itemError } = await supabase
      .from("analysis_items")
      .select("stock_code, stocks(name), stock_snapshots(price, per, pbr, roe)")
      .eq("set_id", id);

    if (itemError) {
      throw itemError;
    }

    const row = setRow as AnalysisSetRow;

    const items: AnalysisSetItem[] = (itemRows as unknown as AnalysisItemRow[]).map((item) => {
      const snapshot = firstOrSelf(item.stock_snapshots);
      return {
        stockCode: item.stock_code,
        stockName: item.stocks?.name ?? item.stock_code,
        priceAtAnalysis: snapshot?.price ?? 0,
        per: snapshot?.per ?? 0,
        pbr: snapshot?.pbr ?? 0,
        roe: snapshot?.roe ?? 0,
      };
    });

    return {
      id: row.id,
      title: row.title,
      themeId: row.theme_id,
      analyzedAt: row.analyzed_at,
      items,
    };
  } catch (error) {
    console.error(
      "[analysis-repository] Supabaseからの分析セット取得に失敗したため、dummy-data.tsにフォールバックしました:",
      error
    );
    return dummySet;
  }
}
