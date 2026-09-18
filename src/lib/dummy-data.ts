// STEP1 時点のダミーデータ置き場。
//
// docs/requirements.md のモックアップ（テーマ: AI / 宇宙 / 半導体、
// 銘柄: A社〜E社 等）を元にした固定データで、実際の株価・財務・AI要約
// ではない。
//
// 将来 Supabase / 外部API に差し替える際は、この下にある
// get〇〇() 関数のシグネチャ（引数・戻り値の型）はそのまま残し、
// 中身だけを lib/repositories・lib/providers 経由の実データ取得に
// 置き換える想定（design.md のレイヤー構成: page -> service -> repository/provider）。

import type {
  AnalysisSet,
  RecentChange,
  ReviewRow,
  StockDetail,
  Theme,
  ThemeStockSummary,
} from "@/types";

const themes: Theme[] = [
  { id: "ai", name: "AI", stockCount: 8, recentUpdateCount: 3, recentUpdateLabel: "重要更新" },
  { id: "space", name: "宇宙", stockCount: 6, recentUpdateCount: 1, recentUpdateLabel: "重要更新" },
  {
    id: "semiconductor",
    name: "半導体",
    stockCount: 10,
    recentUpdateCount: 2,
    recentUpdateLabel: "決算更新",
  },
];

const recentChanges: RecentChange[] = [
  {
    themeId: "ai",
    themeName: "AI",
    stockCode: "A001",
    stockName: "A社",
    summary: "業績予想を上方修正",
    date: "2026-08-27",
  },
  {
    themeId: "semiconductor",
    themeName: "半導体",
    stockCode: "B002",
    stockName: "B社",
    summary: "営業利益率が改善",
    date: "2026-08-27",
  },
  {
    themeId: "space",
    themeName: "宇宙",
    stockCode: "C003",
    stockName: "C社",
    summary: "大型受注を発表",
    date: "2026-08-26",
  },
];

// テーマごとの構成銘柄。MVPでは「AI」テーマのみモックアップ相当の詳細を用意し、
// 他テーマは画面遷移確認用の最小データとする。
const themeStocks: Record<string, ThemeStockSummary[]> = {
  ai: [
    { code: "A001", name: "A社", growth: "◎", valuation: "△", reason: "AI需要増" },
    { code: "B002", name: "B社", growth: "○", valuation: "○", reason: "利益率改善" },
    { code: "C003", name: "C社", growth: "○", valuation: "◎", reason: "大型案件" },
    { code: "D004", name: "D社", growth: "△", valuation: "○", reason: "新規事業" },
    { code: "E005", name: "E社", growth: "◎", valuation: "×", reason: "決算期待" },
    { code: "F006", name: "F社", growth: "○", valuation: "○", reason: "提携拡大" },
    { code: "G007", name: "G社", growth: "△", valuation: "△", reason: "コスト増懸念" },
    { code: "H008", name: "H社", growth: "○", valuation: "◎", reason: "海外展開" },
    // STEP3: 実在銘柄コード移行の第1弾。ダミー銘柄と併存させる。
    { code: "6758", name: "ソニーグループ", growth: "○", valuation: "○", reason: "AI活用の広がりに注目" },
  ],
  space: [
    { code: "S001", name: "S社", growth: "◎", valuation: "△", reason: "大型受注を発表" },
    { code: "S002", name: "S社2", growth: "○", valuation: "○", reason: "打ち上げ成功" },
  ],
  semiconductor: [
    { code: "B002", name: "B社", growth: "○", valuation: "○", reason: "営業利益率が改善" },
    { code: "M001", name: "M社", growth: "△", valuation: "○", reason: "在庫調整中" },
  ],
};

const stockDetails: Record<string, StockDetail> = {
  A001: {
    code: "A001",
    name: "A社",
    industry: "AI関連",
    reason:
      "AI向け需要の拡大に加え、直近決算で営業利益率が改善。一方でPERは過去平均より高め。",
    growth: "◎",
    profitability: "○",
    financial: "○",
    valuation: "△",
    risk: "PER高め",
    per: 22.4,
    pbr: 2.1,
    roe: 13.8,
    operatingProfitGrowthYoy: 18,
  },
  B002: {
    code: "B002",
    name: "B社",
    industry: "半導体",
    reason: "直近決算で営業利益率が改善。業績は堅調だが市場期待には届いていない。",
    growth: "○",
    profitability: "○",
    financial: "○",
    valuation: "○",
    risk: "市場期待とのギャップ",
    per: 15.2,
    pbr: 1.4,
    roe: 9.6,
    operatingProfitGrowthYoy: 6,
  },
  C003: {
    code: "C003",
    name: "C社",
    industry: "宇宙関連",
    reason: "大型受注を発表。テーマ全体の追い風もあり成長期待は高いが、リスクも大きい。",
    growth: "○",
    profitability: "△",
    financial: "△",
    valuation: "◎",
    risk: "高リスク・高ボラティリティ",
    per: 34.7,
    pbr: 3.2,
    roe: 8.1,
    operatingProfitGrowthYoy: 40,
  },
  D004: {
    code: "D004",
    name: "D社",
    industry: "AI関連",
    reason: "割安感はあるものの、直近で利益悪化が見られる新規事業案件。",
    growth: "△",
    profitability: "△",
    financial: "○",
    valuation: "○",
    risk: "利益悪化の兆候",
    per: 11.8,
    pbr: 0.9,
    roe: 5.4,
    operatingProfitGrowthYoy: -12,
  },
  E005: {
    code: "E005",
    name: "E社",
    industry: "AI関連",
    reason: "決算期待は高いが、現時点では割高感が強い。",
    growth: "◎",
    profitability: "○",
    financial: "○",
    valuation: "×",
    risk: "期待先行によるPER上昇",
    per: 41.2,
    pbr: 4.8,
    roe: 12.1,
    operatingProfitGrowthYoy: 22,
  },
  // STEP3: 実在銘柄コード移行の第1弾。reason等はAI/Market Data Provider
  // 未接続のため、他社同様の暫定プレースホルダ値。
  "6758": {
    code: "6758",
    name: "ソニーグループ",
    industry: "AI関連",
    reason: "AI活用の広がりに注目が集まる大型株。",
    growth: "○",
    profitability: "○",
    financial: "○",
    valuation: "○",
    risk: "詳細分析は未接続のため未評価",
    per: 20.0,
    pbr: 2.5,
    roe: 12.0,
    operatingProfitGrowthYoy: 10,
  },
};

// SET / REVIEW 共通の分析セット。
// requirements.md モックアップ「分析セット｜AI関連株 2026年8月」を元にした
// 固定データで、分析時点の値は snapshot として保存された想定の数値。
// currentPrice など「現在値」に相当する項目は本来 REVIEW 表示時に
// 再取得する値だが、STEP1ではダミーの固定値として持たせている。
const analysisSets: Record<string, AnalysisSet> = {
  "ai-2026-08": {
    id: "ai-2026-08",
    title: "AI関連株 2026年8月",
    themeId: "ai",
    analyzedAt: "2026-08-27",
    items: [
      { stockCode: "A001", stockName: "A社", priceAtAnalysis: 2000, per: 22.4, pbr: 2.1, roe: 13.8 },
      { stockCode: "B002", stockName: "B社", priceAtAnalysis: 1500, per: 15.2, pbr: 1.4, roe: 9.6 },
      { stockCode: "C003", stockName: "C社", priceAtAnalysis: 3000, per: 34.7, pbr: 3.2, roe: 8.1 },
      { stockCode: "D004", stockName: "D社", priceAtAnalysis: 1200, per: 11.8, pbr: 0.9, roe: 5.4 },
    ],
  },
};

const reviewRows: Record<string, ReviewRow[]> = {
  "ai-2026-08": [
    {
      stockCode: "A001",
      stockName: "A社",
      priceAtAnalysis: 2000,
      currentPrice: 2400,
      changeRate: 20,
      judgmentAtAnalysis: "成長 ◎ / 割高 △",
    },
    {
      stockCode: "B002",
      stockName: "B社",
      priceAtAnalysis: 1500,
      currentPrice: 1350,
      changeRate: -10,
      judgmentAtAnalysis: "成長 ○ / 財務 ○",
    },
    {
      stockCode: "C003",
      stockName: "C社",
      priceAtAnalysis: 3000,
      currentPrice: 4200,
      changeRate: 40,
      judgmentAtAnalysis: "リスク 高",
    },
    {
      stockCode: "D004",
      stockName: "D社",
      priceAtAnalysis: 1200,
      currentPrice: 980,
      changeRate: -18,
      judgmentAtAnalysis: "割安 ○",
    },
  ],
};

// 振り返りメモ（分析セット全体で1件）。
// review_notes テーブル設計（1 analysis_set : 1 note）に合わせて、
// 銘柄ごとではなくセット単位で持つ。
const reviewNotesBySet: Record<string, string> = {
  "ai-2026-08":
    "AI需要→上方修正。注目理由は有効だった。B社は業績堅調だが市場期待には届かず。C社は高リスク判断が妥当でテーマ全体が上昇。D社は割安だけでは不十分で、利益悪化を見落としていた。",
};

export function getThemes(): Theme[] {
  return themes;
}

export function getRecentChanges(): RecentChange[] {
  return recentChanges;
}

export function getThemeById(id: string): Theme | undefined {
  return themes.find((theme) => theme.id === id);
}

export function getThemeStocks(themeId: string): ThemeStockSummary[] {
  return themeStocks[themeId] ?? [];
}

export function getStockDetail(code: string): StockDetail | undefined {
  return stockDetails[code];
}

export function getAnalysisSetById(id: string): AnalysisSet | undefined {
  return analysisSets[id];
}

export function getReviewRows(analysisSetId: string): ReviewRow[] {
  return reviewRows[analysisSetId] ?? [];
}

export function getReviewNote(analysisSetId: string): string {
  return reviewNotesBySet[analysisSetId] ?? "";
}
