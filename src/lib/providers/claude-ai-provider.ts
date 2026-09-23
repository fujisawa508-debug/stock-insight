import type { AiProvider, StockAnalysis, StockAnalysisInput } from "./ai-provider";

// Claude API (Messages API, tool use) 向けの AiProvider実装。
//
// 認証: ANTHROPIC_API_KEY を x-api-key ヘッダーで送る（サーバー専用）。
//
// 出力はtool use（structured output）で強制し、自由文のJSON生成には
// 頼らない。summary/riskの2フィールドのみを返させ、growth等の
// ◎○△×判定はAIに一切求めない（呼び出し元が渡したratingsをそのまま
// 前提として説明文を書かせるだけ）。
// 禁止ワードチェックは補助的なガードであり、主な防御はsystem prompt +
// tool schemaによる出力制約側で行う。

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-sonnet-5";

const FORBIDDEN_WORDS = ["買い", "売り", "おすすめ", "推奨", "買う", "売る", "買うべき", "売るべき"];

function getApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が .env.local に設定されていません。");
  }
  return apiKey;
}

function containsForbiddenWord(text: string): boolean {
  return FORBIDDEN_WORDS.some((word) => text.includes(word));
}

const SYSTEM_PROMPT = `あなたは株式の公開データを整理・要約するアシスタントです。

厳守事項:
- 売買判断・投資推奨（買い/売り/おすすめ等）は絶対に出力しないこと。
- 与えられた入力データに存在しない事実を創作・推測しないこと（決算内容・
  financialデータ等、渡されていない情報には一切触れないこと）。
- growth/profitability/financial/valuationの評価はすでに確定済みの値
  として渡される。あなたはこれらの評価を変更せず、その評価に至った
  数値的根拠を summary の中で簡潔に説明すること。
- risk は、渡された数値（PER/PBR/ROE/前年比営業利益成長率）および
  ニュースが渡されていればその内容から直接読み取れる注意点のみを
  1文で述べること。
- 関連ニュースが渡された場合、そこに記載された内容の範囲でのみ言及
  してよい。ニュースの見出し・抜粋に書かれていない事実を補完・推測
  しないこと。
- 関連ニュースが渡されていない、または0件の場合は、数値データのみを
  根拠にすること（ニュースが無い旨を無理に触れる必要はない）。`;

function buildUserMessage(input: StockAnalysisInput): string {
  const newsSection =
    input.news && input.news.length > 0
      ? [
          "関連ニュース（直近30日以内）:",
          ...input.news.map(
            (article, index) =>
              `${index + 1}. [${article.publishedAt.slice(0, 10)}] ${article.title}（${article.source}）: ${article.snippet}`
          ),
        ].join("\n")
      : "関連ニュース: なし";

  return [
    `銘柄コード: ${input.stockCode}`,
    `銘柄名: ${input.stockName}`,
    `株価: ${input.price}円`,
    `PER: ${input.per}倍`,
    `PBR: ${input.pbr}倍`,
    `ROE: ${input.roe}%`,
    `前年比営業利益成長率: ${input.profitYoy}%`,
    `確定済み評価: 成長性=${input.ratings.growth} / 収益性=${input.ratings.profitability} / ` +
      `財務健全性=${input.ratings.financial} / 割高感=${input.ratings.valuation}`,
    newsSection,
    "上記の数値・確定済み評価・関連ニュース（あれば）だけを根拠に、" +
      "record_stock_summaryツールでsummaryとriskを出力してください。",
  ].join("\n");
}

type AnthropicContentBlock = { type: string; input?: unknown };
type AnthropicMessageResponse = { content: AnthropicContentBlock[] };

export class ClaudeAiProvider implements AiProvider {
  async analyzeStock(input: StockAnalysisInput): Promise<StockAnalysis> {
    const apiKey = getApiKey();

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserMessage(input) }],
        tools: [
          {
            name: "record_stock_summary",
            description: "銘柄の数値データに基づく要約とリスクを記録する。",
            input_schema: {
              type: "object",
              properties: {
                summary: { type: "string" },
                risk: { type: "string" },
              },
              required: ["summary", "risk"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "record_stock_summary" },
      }),
    });

    if (!response.ok) {
      throw new Error(`[claude-ai-provider] Claude APIエラー: ${response.status} ${response.statusText}`);
    }

    const body = (await response.json()) as AnthropicMessageResponse;
    const toolUse = body.content?.find((block) => block.type === "tool_use");

    if (!toolUse || typeof toolUse.input !== "object" || toolUse.input === null) {
      throw new Error("[claude-ai-provider] Claude応答からtool_useが取得できませんでした。");
    }

    const result = toolUse.input as { summary?: unknown; risk?: unknown };
    if (typeof result.summary !== "string" || typeof result.risk !== "string") {
      throw new Error("[claude-ai-provider] Claude応答の形式が不正です。");
    }

    if (containsForbiddenWord(result.summary) || containsForbiddenWord(result.risk)) {
      throw new Error("[claude-ai-provider] Claude応答に禁止ワードが含まれていたため破棄しました。");
    }

    return { summary: result.summary, risk: result.risk };
  }
}
