import { getSupabaseClient } from "@/lib/supabase/server-client";
import { getAnalysisSetById } from "@/lib/repositories/analysis-repository";
import {
  getReviewNote as getDummyReviewNote,
  getReviewRows as getDummyReviewRows,
} from "@/lib/dummy-data";
import type { Rating, ReviewData, ReviewRow } from "@/types";

// REVIEW画面向けRepository（STEP2: 部分接続）。
// 画面(page.tsx)はここだけを呼び、Supabaseを直接呼ばない。
//
// スコープ:
// - 分析セット本体・銘柄ごとの分析時点スナップショット(price/per/pbr/roe)は
//   既存の analysis-repository.getAnalysisSetById() をそのまま再利用する。
// - 当時の判断(judgmentAtAnalysis)は analysis_items.growth / valuation から組み立てる。
// - 振り返りメモ(reviewNote)は review_notes テーブルから取得する（1セット1件、表示のみ）。
// - 現在株価(currentPrice)はMarket Data Provider未接続のため、引き続き dummy-data.ts を使う。
// - Supabase未設定・接続エラー時はアプリを落とさず、dummy-data.ts の内容にフォールバックする。

type AnalysisItemJudgmentRow = {
  stock_code: string;
  growth: Rating;
  valuation: Rating;
};

type ReviewNoteRow = {
  note: string;
};

export async function getReviewData(analysisSetId: string): Promise<ReviewData | undefined> {
  const analysisSet = await getAnalysisSetById(analysisSetId);
  if (!analysisSet) {
    return undefined;
  }

  const dummyRows = getDummyReviewRows(analysisSetId);
  const dummyRowByCode = new Map(dummyRows.map((row) => [row.stockCode, row]));

  let judgmentByCode = new Map<string, string>(
    dummyRows.map((row) => [row.stockCode, row.judgmentAtAnalysis])
  );
  let reviewNote = getDummyReviewNote(analysisSetId);

  try {
    const supabase = getSupabaseClient();

    const { data: itemRows, error: itemError } = await supabase
      .from("analysis_items")
      .select("stock_code, growth, valuation")
      .eq("set_id", analysisSetId);

    if (itemError) {
      throw itemError;
    }

    judgmentByCode = new Map(
      (itemRows as AnalysisItemJudgmentRow[]).map((row) => [
        row.stock_code,
        `成長 ${row.growth} / 割高 ${row.valuation}`,
      ])
    );

    const { data: noteRow, error: noteError } = await supabase
      .from("review_notes")
      .select("note")
      .eq("analysis_set_id", analysisSetId)
      .maybeSingle();

    if (noteError) {
      throw noteError;
    }

    reviewNote = (noteRow as ReviewNoteRow | null)?.note ?? "";
  } catch (error) {
    console.error(
      "[review-repository] Supabaseからの振り返りデータ取得に失敗したため、dummy-data.tsにフォールバックしました:",
      error
    );
  }

  const rows: ReviewRow[] = analysisSet.items.map((item) => {
    const dummyRow = dummyRowByCode.get(item.stockCode);
    const currentPrice = dummyRow?.currentPrice ?? item.priceAtAnalysis;
    const changeRate =
      item.priceAtAnalysis > 0
        ? Math.round(((currentPrice - item.priceAtAnalysis) / item.priceAtAnalysis) * 1000) / 10
        : 0;

    return {
      stockCode: item.stockCode,
      stockName: item.stockName,
      priceAtAnalysis: item.priceAtAnalysis,
      currentPrice,
      changeRate,
      judgmentAtAnalysis: judgmentByCode.get(item.stockCode) ?? "",
    };
  });

  return {
    title: analysisSet.title,
    analyzedAt: analysisSet.analyzedAt,
    rows,
    reviewNote,
  };
}
