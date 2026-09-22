import type { Rating } from "@/types";

// AiProvider（外部のAI要約APIを吸収するProvider層の入口）。
//
// 役割の境界（重要）:
// - growth/profitability/financial/valuationの「◎○△×」判定はAIに
//   委ねない。呼び出し元(analysis-repository.ts)がコード側で確定的に
//   計算し、この確定済みのratingsをAIへ「説明対象」として渡す。
// - AIの役割は summary（要約）と risk（注意点）の文章生成に限定する。
//   入力に無い事実の創作・推測、売買判断/投資推奨は行わせない
//   （具体的な制約はProvider実装のsystem prompt側で強制する）。

export interface StockAnalysisInput {
  stockCode: string;
  stockName: string;
  price: number;
  per: number;
  pbr: number;
  roe: number;
  profitYoy: number;
  /** コード側で確定済みの評価。AIはこれを変更せず、説明のみ行う。 */
  ratings: {
    growth: Rating;
    profitability: Rating;
    financial: Rating;
    valuation: Rating;
  };
  /**
   * 将来EDINET接続後に追加する財務データ。現段階では常にundefined。
   * （stock-repository.ts等、他Providerとの対称性のためここに型だけ
   * 予約しておく。ratings.financialの算出ロジック側で参照する想定。）
   */
  financialData?: {
    equityRatio: number;
    interestBearingDebt: number;
    operatingCashFlow: number;
    cashAndEquivalents: number;
  };
}

export interface StockAnalysis {
  summary: string;
  risk: string;
}

export interface AiProvider {
  analyzeStock(input: StockAnalysisInput): Promise<StockAnalysis>;
}
