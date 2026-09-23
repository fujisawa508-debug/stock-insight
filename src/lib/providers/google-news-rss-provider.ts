import type { NewsArticle, NewsProvider } from "./news-provider";

// Google News RSS (https://news.google.com/rss/search) 向けの
// NewsProvider実装（Phase 1）。
//
// 採用理由: NewsAPI.org・GNews等の主要ニュースAPIは無料枠の利用規約で
// 「本番/商用利用を明確に禁止」しており、このアプリは既にVercelで
// 公開済み（本番環境）のため採用できなかった。Google News RSSは正式な
// API契約ではなく「本番禁止」規約自体が存在しないため、料金なし・
// キー不要で使える唯一の現実的な選択肢としてPhase 1に採用する。
//
// 既知の制約（利用者に伝えるべき前提）:
// - 非公式のRSSフィードであり、SLA・後方互換性の保証は無い。
//   Google側の都合で仕様変更・遮断される可能性がある。
// - <link>が指す先はGoogle Newsのリダイレクトリンクであり、配信元の
//   実URLではない（リダイレクト解決は行わない。Phase 1のスコープ外）。
// - Google News RSS固有の処理（URL構築・XML/RSSパース・CDATA/HTML
//   エンティティ処理）は全てこのファイル内に閉じ込め、呼び出し元には
//   NewsArticleというアプリ独自の型だけを返す。

const BASE_URL = "https://news.google.com/rss/search";
const MAX_AGE_DAYS = 30;

function extractTag(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1];
}

function unwrapCdata(value: string): string {
  const match = value.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  return (match ? match[1] : value).trim();
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, "").trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

type RawRssItem = {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
};

// Google News RSSの<item>要素を、正規表現ベースの簡易パーサで読み取る。
// フィード構造は単純なため、フルのXMLパーサ依存を追加しない設計にする
// （このProject全体の「必要最小限のfetchベース実装」という方針に合わせる）。
function parseRssItems(xml: string): RawRssItem[] {
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

  return itemBlocks.map((block) => {
    const titleRaw = extractTag(block, "title") ?? "";
    const sourceRaw = extractTag(block, "source");
    const descriptionRaw = extractTag(block, "description");

    return {
      title: decodeHtmlEntities(unwrapCdata(titleRaw)),
      link: decodeHtmlEntities((extractTag(block, "link") ?? "").trim()),
      pubDate: (extractTag(block, "pubDate") ?? "").trim(),
      source: sourceRaw ? decodeHtmlEntities(unwrapCdata(sourceRaw)) : "Google News",
      description: descriptionRaw ? stripHtmlTags(decodeHtmlEntities(unwrapCdata(descriptionRaw))) : "",
    };
  });
}

export class GoogleNewsRssProvider implements NewsProvider {
  async getRecentNews(stockName: string, limit: number): Promise<NewsArticle[]> {
    const url = `${BASE_URL}?q=${encodeURIComponent(stockName)}&hl=ja&gl=JP&ceid=JP:ja`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`[google-news-rss-provider] Google News RSS取得エラー: ${response.status}`);
    }

    const xml = await response.text();
    const items = parseRssItems(xml);

    const cutoffMs = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const articles: NewsArticle[] = [];

    for (const item of items) {
      if (articles.length >= limit) break;
      if (!item.title || !item.link) continue;

      const publishedAtMs = Date.parse(item.pubDate);
      if (Number.isNaN(publishedAtMs) || publishedAtMs < cutoffMs) continue;

      // 同一URL・同一タイトルの重複記事を除外する（Google Newsは同じ
      // ニュースが複数配信元から転載されるケースが多いため）。
      if (seenUrls.has(item.link) || seenTitles.has(item.title)) continue;

      seenUrls.add(item.link);
      seenTitles.add(item.title);

      articles.push({
        title: item.title,
        publishedAt: new Date(publishedAtMs).toISOString(),
        source: item.source,
        url: item.link,
        snippet: item.description || item.title,
      });
    }

    return articles;
  }
}
