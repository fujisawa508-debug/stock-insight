import type { DailyQuote, MarketDataProvider } from "./market-data-provider";

// J-Quants API V2 (https://api.jquants.com) 向けの MarketDataProvider実装。
//
// 認証: ダッシュボードで発行した APIキーを x-api-key ヘッダーで送る
// （V1の refreshToken/idToken 方式は廃止されたため、トークン管理は不要）。
//
// Freeプランは直近12週間のデータを取得できないため、取得対象期間を
// 意図的に過去へずらし（90〜200日前）、その範囲内で最も新しい行を
// 「現時点で取得可能な最新終値」として返す。本当の意味での現在値では
// ない点はこのファイルのスコープ外の注意事項として呼び出し元に委ねる。

const BASE_URL = "https://api.jquants.com";
const LOOKBACK_FROM_DAYS = 200;
const LOOKBACK_TO_DAYS = 90;

// J-Quantsが受け付けるコード形式（4桁 または 5桁の数字）。
// 呼び出し元の判定ミス（ダミーコードを渡してしまう等）があっても、
// Provider自身がここで弾く。
const VALID_CODE_PATTERN = /^\d{4,5}$/;

type BarsDailyRow = {
  Date: string;
  Code: string;
  C: number | null;
};

type BarsDailyResponse = {
  data: BarsDailyRow[];
  pagination_key?: string;
};

function toDateParam(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function getApiKey(): string {
  const apiKey = process.env.JQUANTS_API_KEY;
  if (!apiKey) {
    throw new Error("JQUANTS_API_KEY が .env.local に設定されていません。");
  }
  return apiKey;
}

export class JQuantsMarketDataProvider implements MarketDataProvider {
  async getLatestDailyQuote(stockCode: string): Promise<DailyQuote | undefined> {
    if (!VALID_CODE_PATTERN.test(stockCode)) {
      throw new Error(`[jquants-market-data-provider] 不正な銘柄コード形式: ${stockCode}`);
    }

    const apiKey = getApiKey();

    const url = new URL(`${BASE_URL}/v2/equities/bars/daily`);
    url.searchParams.set("code", stockCode);
    url.searchParams.set("from", toDateParam(LOOKBACK_FROM_DAYS));
    url.searchParams.set("to", toDateParam(LOOKBACK_TO_DAYS));

    const response = await fetch(url, {
      headers: { "x-api-key": apiKey },
    });

    if (!response.ok) {
      throw new Error(
        `[jquants-market-data-provider] J-Quants APIエラー: ${response.status} ${response.statusText}`
      );
    }

    const body = (await response.json()) as BarsDailyResponse;
    const rows = body.data ?? [];
    if (rows.length === 0) {
      return undefined;
    }

    const latest = [...rows].sort((a, b) => (a.Date < b.Date ? 1 : -1))[0];
    if (latest.C == null) {
      return undefined;
    }

    return {
      stockCode,
      date: latest.Date,
      close: latest.C,
    };
  }
}
