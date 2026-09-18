import { getSupabaseClient } from "@/lib/supabase/server-client";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import {
  getAnalysisSetById as getDummyAnalysisSetById,
  getStockDetail as getDummyStockDetail,
} from "@/lib/dummy-data";
import { isMarketDataCandidate, type MarketDataProvider } from "@/lib/providers/market-data-provider";
import { JQuantsMarketDataProvider } from "@/lib/providers/jquants-market-data-provider";
import type { AnalysisSet, AnalysisSetItem, Rating } from "@/types";

// SET画面向けRepository（STEP2: 最小構成 / STEP3: 保存機能を追加）。
// 画面(page.tsx)はここだけを呼び、Supabase / MarketDataProviderを直接呼ばない。
//
// スコープ:
// - analysis_sets / analysis_items / stock_snapshots / stocks を結合し、
//   分析セット本体と銘柄ごとの分析時点スナップショットを取得する。
// - REVIEW画面（reviewNote / currentPrice）はこのSTEPの対象外。
// - Supabase未設定・接続エラー時はアプリを落とさず、dummy-data.ts の内容
//   をそのまま返す（フォールバック）。
//
// 保存機能（createAnalysisSetFromExisting）について:
// - 現在表示中の分析セットを元に、新しいIDで analysis_sets/analysis_items/
//   stock_snapshots を作成する。既存行は一切更新・削除しない。
// - 実在銘柄(isMarketDataCandidate)は保存の都度MarketDataProviderから
//   最新終値を取得し直す。取得失敗時・ダミー銘柄は既存のpriceAtAnalysisを使う。
// - growth/profitability/financial/valuation/risk/ai_summaryはAI Provider
//   未接続のため、dummy-data.tsのstockDetailから補完する（無い場合は
//   他の実在銘柄と同じ暫定プレースホルダ値）。
// - 3テーブルへの書き込みは、PostgreSQL関数 create_analysis_set(jsonb) を
//   1回呼ぶだけで行う（Repository側で個別にinsertしない）。この関数は
//   1トランザクションとして実行され、途中で失敗すれば全体がロールバック
//   される（migration: 20260918060000_create_analysis_set_rpc.sql）。
// - この関数は service_role からしか実行できない（PUBLIC/anon/authenticated
//   のEXECUTE権限を明示的にrevokeしている）ため、呼び出しには
//   admin-client.ts（service_role key）を使う。GET系のgetAnalysisSetById()
//   は引き続き server-client.ts（anon key）のまま変更しない。

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

const marketDataProvider: MarketDataProvider = new JQuantsMarketDataProvider();

export type CreateAnalysisSetResult = { ok: true; id: string } | { ok: false; error: string };

type ResolvedItem = {
  stockCode: string;
  per: number;
  pbr: number;
  roe: number;
  profitYoy: number;
  aiSummary: string;
  growth: Rating;
  profitability: Rating;
  financial: Rating;
  valuation: Rating;
  risk: string;
  price: number;
  priceDate: string | null;
};

async function resolveItemForSave(item: AnalysisSetItem): Promise<ResolvedItem> {
  const dummyDetail = getDummyStockDetail(item.stockCode);
  const base = {
    stockCode: item.stockCode,
    per: item.per,
    pbr: item.pbr,
    roe: item.roe,
    profitYoy: dummyDetail?.operatingProfitGrowthYoy ?? 0,
    aiSummary: dummyDetail?.reason ?? "詳細分析は未接続のため未評価",
    growth: dummyDetail?.growth ?? "△",
    profitability: dummyDetail?.profitability ?? "△",
    financial: dummyDetail?.financial ?? "△",
    valuation: dummyDetail?.valuation ?? "△",
    risk: dummyDetail?.risk ?? "詳細分析は未接続のため未評価",
  };

  if (!isMarketDataCandidate(item.stockCode)) {
    return { ...base, price: item.priceAtAnalysis, priceDate: null };
  }

  try {
    const quote = await marketDataProvider.getLatestDailyQuote(item.stockCode);
    if (!quote) {
      return { ...base, price: item.priceAtAnalysis, priceDate: null };
    }
    return { ...base, price: quote.close, priceDate: quote.date };
  } catch (error) {
    console.error(
      "[analysis-repository] MarketDataProviderからの価格取得に失敗したため、既存値にフォールバックしました:",
      error
    );
    return { ...base, price: item.priceAtAnalysis, priceDate: null };
  }
}

function generateAnalysisSetId(themeId: string): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `${themeId}-${today}-${suffix}`;
}

// 現在表示中の分析セットを元に、新しい analysis_set / analysis_items /
// stock_snapshots をSupabaseへ作成する。既存の行は一切変更しない。
export async function createAnalysisSetFromExisting(
  sourceId: string
): Promise<CreateAnalysisSetResult> {
  const source = await getAnalysisSetById(sourceId);
  if (!source) {
    return { ok: false, error: "元になる分析セットが見つかりませんでした。" };
  }

  const resolvedItems = await Promise.all(source.items.map(resolveItemForSave));

  const newId = generateAnalysisSetId(source.themeId);
  const capturedAt = new Date().toISOString();

  const payload = {
    id: newId,
    theme_id: source.themeId,
    title: `${source.title}（再保存）`,
    analyzed_at: capturedAt.slice(0, 10),
    items: resolvedItems.map((item) => ({
      stock_code: item.stockCode,
      ai_summary: item.aiSummary,
      growth: item.growth,
      profitability: item.profitability,
      financial: item.financial,
      valuation: item.valuation,
      risk: item.risk,
      price: item.price,
      per: item.per,
      pbr: item.pbr,
      roe: item.roe,
      profit_yoy: item.profitYoy,
      captured_at: capturedAt,
      price_date: item.priceDate,
    })),
  };

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc("create_analysis_set", { payload });

  if (error) {
    console.error("[analysis-repository] RPC create_analysis_setの実行に失敗しました:", error);
    return { ok: false, error: "分析セットの保存に失敗しました。時間をおいて再度お試しください。" };
  }

  return { ok: true, id: data as string };
}
