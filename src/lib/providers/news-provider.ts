// NewsProvider（外部のニュース検索を吸収するProvider層の入口）。
//
// 役割: 会社名から関連ニュースを取得し、アプリ独自の型(NewsArticle)へ
// 統一する。呼び出し元(Repository)・AiProviderは、具体的なニュースAPI
// （Google News RSS等）の仕様を一切知らない。
//
// 記事全文は扱わない（title/snippetのみ）。著作権的な観点、および
// AIへの入力トークン量を抑える観点の両方から、見出し・短い抜粋に限定する。

export interface NewsArticle {
  title: string;
  /** ISO 8601 形式の公開日時 */
  publishedAt: string;
  /** 情報源名（例: "日本経済新聞"）。取得できない場合は "Google News" 等の代替値 */
  source: string;
  url: string;
  /** 本文抜粋。取得できない場合は title で代替する */
  snippet: string;
}

export interface NewsProvider {
  /**
   * 指定した会社名に関連する直近のニュースを新しい順に取得する。
   * 記事が見つからない場合は空配列を返す（エラーではない）。
   * 接続エラー等は例外を投げる。
   */
  getRecentNews(stockName: string, limit: number): Promise<NewsArticle[]>;
}
