import { getSupabaseClient } from "@/lib/supabase/server-client";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import {
  getAnalysisSetById as getDummyAnalysisSetById,
  getStockDetail as getDummyStockDetail,
} from "@/lib/dummy-data";
import { isMarketDataCandidate, type MarketDataProvider } from "@/lib/providers/market-data-provider";
import { JQuantsMarketDataProvider } from "@/lib/providers/jquants-market-data-provider";
import type { AiProvider, StockAnalysisInput } from "@/lib/providers/ai-provider";
import { ClaudeAiProvider } from "@/lib/providers/claude-ai-provider";
import type { NewsArticle, NewsProvider } from "@/lib/providers/news-provider";
import { GoogleNewsRssProvider } from "@/lib/providers/google-news-rss-provider";
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
// - growth/profitability/financial/valuationは、AIの自由判断ではなく
//   コード側で確定的に計算する（deriveGrowthRating等。同じ入力で評価が
//   揺れることを避けるため）。現状のデータでは根拠不足のfinancial/
//   valuationは常に"—"（未評価）にする。AiProviderはsummary/riskの
//   文章生成のみを担当し、ratingの決定には一切関与しない。
// - AiProvider呼び出しに失敗した場合（APIキー未設定・API失敗・
//   応答形式不正・禁止ワード検出等）は、summary/riskをdummy-data.tsの
//   stockDetailの値へフォールバックする（ratingは元々AI非依存のため
//   フォールバック対象にならない）。
// - NewsProvider（Google News RSS）で取得した関連ニュースはAiProviderの
//   入力に含める。取得失敗時は空配列のまま進め、保存処理全体は失敗
//   させない（AI要約は「ニュース無し」の状態で数値のみから生成される）。
//   使用したニュースはAI分析の再現性確保のため、sources テーブルへ
//   analysis_itemの子として保存する（記事全文は保存しない）。
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
const aiProvider: AiProvider = new ClaudeAiProvider();
const newsProvider: NewsProvider = new GoogleNewsRssProvider();
const MAX_NEWS_ARTICLES = 3;

export type CreateAnalysisSetResult = { ok: true; id: string } | { ok: false; error: string };

// Rating判定ロジック（AI非依存・確定的）。
//
// growth/profitabilityは、現状取得できている数値（前年比営業利益成長率・
// ROE）だけで、業種を問わずある程度共通の基準で判断できるため、固定の
// しきい値で判定する。しきい値は一般的な目安であり、検証済みの会計基準
// ではないため、将来チューニングの余地がある。
function deriveGrowthRating(profitYoy: number): Rating {
  if (profitYoy >= 15) return "◎";
  if (profitYoy >= 5) return "○";
  if (profitYoy >= 0) return "△";
  return "×";
}

function deriveProfitabilityRating(roe: number): Rating {
  if (roe >= 15) return "◎";
  if (roe >= 8) return "○";
  if (roe >= 3) return "△";
  return "×";
}

// PER/PBRは業種によって「妥当な水準」が大きく異なるため、業種別
// ベンチマークが無い現状では割安/割高を断定できない。常に未評価とする。
// 将来、業種別の基準値等が接続された時点でこの関数を拡張する。
function deriveValuationRating(): Rating {
  return "—";
}

// 自己資本比率・有利子負債・営業CF・現金等（EDINET由来）が無いと
// 財務健全性は判断できないため、financialDataが無い間は常に未評価とする。
function deriveFinancialRating(financialData: StockAnalysisInput["financialData"]): Rating {
  if (!financialData) {
    return "—";
  }
  // 将来の拡張ポイント（EDINET接続後に判定ロジックを実装する）。
  return "—";
}

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
  news: NewsArticle[];
};

async function resolveItemForSave(item: AnalysisSetItem): Promise<ResolvedItem> {
  const dummyDetail = getDummyStockDetail(item.stockCode);
  const profitYoy = dummyDetail?.operatingProfitGrowthYoy ?? 0;

  // 1. 価格解決（既存ロジック。AI要約に渡す価格もこの解決後の値を使う）。
  let price = item.priceAtAnalysis;
  let priceDate: string | null = null;

  if (isMarketDataCandidate(item.stockCode)) {
    try {
      const quote = await marketDataProvider.getLatestDailyQuote(item.stockCode);
      if (quote) {
        price = quote.close;
        priceDate = quote.date;
      }
    } catch (error) {
      console.error(
        "[analysis-repository] MarketDataProviderからの価格取得に失敗したため、既存値にフォールバックしました:",
        error
      );
    }
  }

  // 2. Rating確定（AI非依存・確定的）。
  const ratings = {
    growth: deriveGrowthRating(profitYoy),
    profitability: deriveProfitabilityRating(item.roe),
    financial: deriveFinancialRating(undefined), // financialData未接続のため常に"—"
    valuation: deriveValuationRating(), // 業種ベンチマーク未接続のため常に"—"
  };

  // 3. ニュース取得（失敗時は空配列のまま進める。保存全体は失敗させない）。
  let news: NewsArticle[] = [];
  try {
    news = await newsProvider.getRecentNews(item.stockName, MAX_NEWS_ARTICLES);
  } catch (error) {
    console.error(
      "[analysis-repository] NewsProviderからのニュース取得に失敗したため、ニュース無しで進めます:",
      error
    );
  }

  // 4. AI要約生成（summary/riskのみ。失敗時はdummy-data.tsへフォールバック）。
  let aiSummary = dummyDetail?.reason ?? "詳細分析は未接続のため未評価";
  let risk = dummyDetail?.risk ?? "詳細分析は未接続のため未評価";

  try {
    const analysis = await aiProvider.analyzeStock({
      stockCode: item.stockCode,
      stockName: item.stockName,
      price,
      per: item.per,
      pbr: item.pbr,
      roe: item.roe,
      profitYoy,
      ratings,
      news,
    });
    aiSummary = analysis.summary;
    risk = analysis.risk;
  } catch (error) {
    console.error(
      "[analysis-repository] AI Providerからの要約取得に失敗したため、dummy-data.tsにフォールバックしました:",
      error
    );
  }

  return {
    stockCode: item.stockCode,
    per: item.per,
    pbr: item.pbr,
    roe: item.roe,
    profitYoy,
    aiSummary,
    growth: ratings.growth,
    profitability: ratings.profitability,
    financial: ratings.financial,
    valuation: ratings.valuation,
    risk,
    price,
    priceDate,
    news,
  };
}

function generateAnalysisSetId(themeId: string): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `${themeId}-${today}-${suffix}`;
}

const REPOST_SUFFIX = "（再保存）";

// 既に「（再保存）」が付いているタイトルを再保存すると
// 「Xxx（再保存）（再保存）」のように重複してしまうため、
// 既に付いている場合は付け足さない。
function buildRepostTitle(sourceTitle: string): string {
  return sourceTitle.endsWith(REPOST_SUFFIX) ? sourceTitle : `${sourceTitle}${REPOST_SUFFIX}`;
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
    title: buildRepostTitle(source.title),
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
      sources: item.news.map((article) => ({
        title: article.title,
        url: article.url,
        published_at: article.publishedAt,
        source: article.source,
        snippet: article.snippet,
      })),
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
