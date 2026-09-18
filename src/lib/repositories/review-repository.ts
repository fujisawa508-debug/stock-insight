import { getSupabaseClient } from "@/lib/supabase/server-client";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { getAnalysisSetById } from "@/lib/repositories/analysis-repository";
import {
  getReviewNote as getDummyReviewNote,
  getReviewRows as getDummyReviewRows,
} from "@/lib/dummy-data";
import { isMarketDataCandidate, type MarketDataProvider } from "@/lib/providers/market-data-provider";
import { JQuantsMarketDataProvider } from "@/lib/providers/jquants-market-data-provider";
import type { AnalysisSetItem, Rating, ReviewData, ReviewRow } from "@/types";

// REVIEW画面向けRepository（STEP3: currentPriceの一部MarketDataProvider接続）。
// 画面(page.tsx)はここだけを呼び、Supabase / MarketDataProviderを直接呼ばない。
//
// スコープ:
// - 分析セット本体・銘柄ごとの分析時点スナップショット(price/per/pbr/roe)は
//   既存の analysis-repository.getAnalysisSetById() をそのまま再利用する。
// - 当時の判断(judgmentAtAnalysis)は analysis_items.growth / valuation から組み立てる。
// - 振り返りメモ(reviewNote)は review_notes テーブルから取得する（1セット1件、表示のみ）。
// - 現在株価(currentPrice)は、銘柄コードの形式（isMarketDataCandidate）で
//   「MarketDataProviderに問い合わせる候補か」を判定する。数字4桁の形式は
//   あくまで問い合わせ候補というだけで、実在・取引可能であることは保証しない
//   （それは getLatestDailyQuote() の成功/失敗/undefinedで判断される）。
//   ダミー銘柄コード（A001等、英字1桁+数字3桁）はこの形式に一致しないため、
//   問い合わせ自体を行わず引き続き dummy-data.ts を使う。
//   銘柄コードを個別に列挙したリストは持たないため、新しい実在銘柄を
//   stocks/theme_stocks/analysis_items に追加するだけで、コード変更なしに
//   ここで自動的にMarketDataProviderへの問い合わせ候補になる。
//   J-QuantsはFreeプランのため、取得できても最大12週間遅延した値になる
//   （「現在値」という名前だが、厳密な現在値ではない点はUI未反映の既知の制約）。
// - Supabase未設定・接続エラー時、およびMarketDataProvider取得失敗時も
//   アプリを落とさず dummy-data.ts の内容にフォールバックする。

const marketDataProvider: MarketDataProvider = new JQuantsMarketDataProvider();

type AnalysisItemJudgmentRow = {
  stock_code: string;
  growth: Rating;
  valuation: Rating;
};

type ReviewNoteRow = {
  note: string;
};

async function resolveCurrentPrice(
  item: AnalysisSetItem,
  dummyRowByCode: Map<string, ReviewRow>
): Promise<number> {
  const dummyFallbackPrice = dummyRowByCode.get(item.stockCode)?.currentPrice ?? item.priceAtAnalysis;

  if (!isMarketDataCandidate(item.stockCode)) {
    return dummyFallbackPrice;
  }

  try {
    const quote = await marketDataProvider.getLatestDailyQuote(item.stockCode);
    return quote?.close ?? dummyFallbackPrice;
  } catch (error) {
    console.error(
      "[review-repository] MarketDataProviderからの現在値取得に失敗したため、dummy-data.tsにフォールバックしました:",
      error
    );
    return dummyFallbackPrice;
  }
}

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

  const rows: ReviewRow[] = await Promise.all(
    analysisSet.items.map(async (item) => {
      const currentPrice = await resolveCurrentPrice(item, dummyRowByCode);
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
    })
  );

  return {
    title: analysisSet.title,
    analyzedAt: analysisSet.analyzedAt,
    rows,
    reviewNote,
  };
}

export type SaveReviewNoteResult = { ok: true } | { ok: false; error: string };

// review_notesはanalysis_set_idにunique制約があるため、upsert1回で
// 「新規作成（まだメモが無いセット）」「既存メモの上書き」の両方を扱う。
// 単一テーブル・単一行の操作であり、upsert自体が1つのSQL文として
// 原子的に実行されるため、analysis_set保存機能のようなRPC関数化はしない。
// anonへのINSERT/UPDATE policyは追加しないため、admin client(service_role)
// から直接呼ぶ。price/analysis_set等、他のテーブル・列は一切更新しない。
export async function saveReviewNote(
  analysisSetId: string,
  note: string
): Promise<SaveReviewNoteResult> {
  const admin = getSupabaseAdminClient();

  const { error } = await admin
    .from("review_notes")
    .upsert(
      { analysis_set_id: analysisSetId, note, updated_at: new Date().toISOString() },
      { onConflict: "analysis_set_id" }
    );

  if (error) {
    console.error("[review-repository] review_notesの保存に失敗しました:", error);
    return { ok: false, error: "振り返りメモの保存に失敗しました。時間をおいて再度お試しください。" };
  }

  return { ok: true };
}
