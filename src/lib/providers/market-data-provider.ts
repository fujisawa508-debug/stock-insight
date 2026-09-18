// MarketDataProvider（外部の市場データAPIを吸収するProvider層の入口）。
//
// 目的: 「株価をどこから・どうやって取るか」をこのinterfaceの裏に隠し、
// Repository/画面からは具体的な外部API（J-Quants等）の仕様を一切見せない。
// 将来 J-Quants 以外に差し替える場合も、この interface を満たす実装を
// 追加するだけでよい（呼び出し側の変更は不要）。

/** 1銘柄・1取引日分の日次終値。 */
export interface DailyQuote {
  /** 呼び出し時に指定した銘柄コードをそのまま保持する */
  stockCode: string;
  /** 終値が記録された取引日（YYYY-MM-DD） */
  date: string;
  /** 終値（円、調整前） */
  close: number;
}

export interface MarketDataProvider {
  /**
   * 指定銘柄の、現時点で取得可能な最新の日次終値を返す。
   *
   * 契約プランの遅延等により対象期間にデータが存在しない場合は
   * undefined を返す（呼び出し元でのフォールバック判断に使う値であり、
   * エラーではない）。接続エラー・認証エラー等は例外を投げる。
   */
  getLatestDailyQuote(stockCode: string): Promise<DailyQuote | undefined>;
}
