import { getSupabaseClient } from "@/lib/supabase/server-client";
import { getStockDetail as getDummyStockDetail } from "@/lib/dummy-data";
import type { StockDetail } from "@/types";

// STOCK画面向けRepository（STEP2: 最小構成）。
// 画面(page.tsx)はここだけを呼び、Supabaseを直接呼ばない。
//
// スコープ:
// - Supabaseの stocks テーブルから code / name / industry を取得する。
// - reason / growth / profitability / financial / valuation / risk / per / pbr / roe /
//   operatingProfitGrowthYoy は Market Data / AI Provider（いずれも未接続）が必要なため、
//   このSTEPでは対象外とし、dummy-data.ts の値をそのまま使う。
// - dummy-data.ts に指標データが無い銘柄（F006 等）は、このSTEPでは
//   これまで通り undefined を返す（表示対象外は変えない）。
// - Supabase未設定・接続エラー時はアプリを落とさず、dummy-data.ts の内容
//   をそのまま返す（フォールバック）。

type StockRow = {
  code: string;
  name: string;
  industry: string;
};

export async function getStockDetail(code: string): Promise<StockDetail | undefined> {
  const dummyDetail = getDummyStockDetail(code);

  // 指標・注目理由等のdummyデータが無い銘柄は、このSTEPでは対象外のまま。
  if (!dummyDetail) {
    return undefined;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("stocks")
      .select("code, name, industry")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return dummyDetail;
    }

    const row = data as StockRow;

    return {
      ...dummyDetail,
      code: row.code,
      name: row.name,
      industry: row.industry,
    };
  } catch (error) {
    console.error(
      "[stock-repository] Supabaseからの銘柄取得に失敗したため、dummy-data.tsにフォールバックしました:",
      error
    );
    return dummyDetail;
  }
}
