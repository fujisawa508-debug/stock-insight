import { getSupabaseClient } from "@/lib/supabase/server-client";
import { getAnalysisSetById } from "@/lib/repositories/analysis-repository";
import {
  getReviewNote as getDummyReviewNote,
  getReviewRows as getDummyReviewRows,
} from "@/lib/dummy-data";
import type { MarketDataProvider } from "@/lib/providers/market-data-provider";
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
// - 現在株価(currentPrice)は、実在銘柄コードへの移行が済んだ銘柄
//   （REAL_MARKET_DATA_STOCK_CODES）のみ MarketDataProvider(J-Quants) から取得する。
//   それ以外のダミー銘柄は引き続き dummy-data.ts を使う。
//   J-QuantsはFreeプランのため、取得できても最大12週間遅延した値になる
//   （「現在値」という名前だが、厳密な現在値ではない点はUI未反映の既知の制約）。
// - Supabase未設定・接続エラー時、およびMarketDataProvider取得失敗時も
//   アプリを落とさず dummy-data.ts の内容にフォールバックする。

const marketDataProvider: MarketDataProvider = new JQuantsMarketDataProvider();

// J-Quantsへの実在銘柄コード移行が済んでいる銘柄だけをここに追加する。
// それ以外のコードは従来通り dummy-data.ts の currentPrice にフォールバックする。
const REAL_MARKET_DATA_STOCK_CODES = new Set(["6758"]);

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

  if (!REAL_MARKET_DATA_STOCK_CODES.has(item.stockCode)) {
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
