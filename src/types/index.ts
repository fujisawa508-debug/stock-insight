// ドメイン型定義。
// design.md の DB設計（themes / stocks / theme_stocks / analysis_sets /
// analysis_items / stock_snapshots / sources）に対応する形で、
// 画面表示に必要な項目だけを定義している。
// 現時点ではダミーデータ用の型だが、将来 Supabase 連携時も
// この形をそのまま Repository の戻り値として使う想定。

/** 成長性・割高感・収益性・財務などの評価レーティング */
export type Rating = "◎" | "○" | "△" | "×";

export interface Theme {
  id: string;
  name: string;
  /** テーマに紐づく銘柄数 */
  stockCount: number;
  /** 直近の更新件数（決算・重要イベントなど） */
  recentUpdateCount: number;
  /** 更新件数のラベル（例: 「重要更新」「決算更新」） */
  recentUpdateLabel: string;
}

/** HOME「最近の変化」に表示する更新情報 */
export interface RecentChange {
  themeId: string;
  themeName: string;
  stockCode: string;
  stockName: string;
  summary: string;
  /** ISO 8601 形式の日付文字列 */
  date: string;
}

/** THEME 画面：テーマ内銘柄の比較用サマリ */
export interface ThemeStockSummary {
  code: string;
  name: string;
  growth: Rating;
  valuation: Rating;
  /** 注目理由（短文） */
  reason: string;
}

/** STOCK 画面：銘柄の詳細分析情報 */
export interface StockDetail {
  code: string;
  name: string;
  industry: string;
  /** 注目理由（詳細文） */
  reason: string;
  growth: Rating;
  profitability: Rating;
  financial: Rating;
  valuation: Rating;
  /** リスクの説明文 */
  risk: string;
  per: number;
  pbr: number;
  /** ROE（%） */
  roe: number;
  /** 前年同期比の営業利益成長率（%） */
  operatingProfitGrowthYoy: number;
}

/** SET 画面：分析セットに含まれる1銘柄分のスナップショット */
export interface AnalysisSetItem {
  stockCode: string;
  stockName: string;
  /** 分析時点の株価 */
  priceAtAnalysis: number;
  per: number;
  pbr: number;
  roe: number;
}

/** SET / REVIEW 画面共通：分析セットそのもの */
export interface AnalysisSet {
  id: string;
  title: string;
  themeId: string;
  /** ISO 8601 形式の分析日 */
  analyzedAt: string;
  items: AnalysisSetItem[];
}

/** REVIEW 画面：1銘柄分の「分析時点 vs 現在」比較行 */
export interface ReviewRow {
  stockCode: string;
  stockName: string;
  priceAtAnalysis: number;
  currentPrice: number;
  /** 変化率（%） */
  changeRate: number;
  /** 当時の判断（分析時点の評価コメント） */
  judgmentAtAnalysis: string;
  /** ユーザーが後から記入する振り返りメモ */
  reviewNote: string;
}
