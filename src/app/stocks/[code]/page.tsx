import Link from "next/link";
import { notFound } from "next/navigation";
import { MetricBadge } from "@/components/MetricBadge";
import { RatingBadge } from "@/components/RatingBadge";
import { getStockDetail } from "@/lib/repositories/stock-repository";

// STOCK（"/stocks/[code]"）
// 役割: 1銘柄の詳細（注目理由・各評価・主要指標・リスク）を表示する。
//
// 「分析セットに追加する導線」について:
// STEP1では保存機能（DB・状態管理）がまだ無いため、実際に追加はできない。
// 仕様上「今回は遷移のみ」としたため、ダミーの分析セット画面へのリンクとして
// 仮実装している。実際の追加処理は design.md の実装ロードマップ Step5「保存」で
// POST /api/analysis 相当の処理と合わせて実装する想定。
const PLACEHOLDER_ANALYSIS_SET_ID = "ai-2026-08";

export default async function StockPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const stock = await getStockDetail(code);

  if (!stock) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-zinc-500">{stock.industry}</p>
        <h1 className="text-xl font-semibold text-zinc-900">{stock.name}</h1>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-500">注目理由</h2>
        <p className="mt-1 text-zinc-900">{stock.reason}</p>
      </section>

      <section className="flex flex-wrap gap-4 rounded-lg border border-zinc-200 bg-white p-4">
        <RatingBadge label="成長性" rating={stock.growth} />
        <RatingBadge label="収益性" rating={stock.profitability} />
        <RatingBadge label="財務" rating={stock.financial} />
        <RatingBadge label="割高感" rating={stock.valuation} />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-zinc-500">主要指標</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricBadge label="PER" value={`${stock.per}x`} />
          <MetricBadge label="PBR" value={`${stock.pbr}x`} />
          <MetricBadge label="ROE" value={`${stock.roe}%`} />
          <MetricBadge
            label="営業利益成長(YoY)"
            value={`${stock.operatingProfitGrowthYoy > 0 ? "+" : ""}${stock.operatingProfitGrowthYoy}%`}
          />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-500">リスク</h2>
        <p className="mt-1 text-zinc-900">{stock.risk}</p>
      </section>

      <Link
        href={`/analysis/${PLACEHOLDER_ANALYSIS_SET_ID}`}
        className="inline-flex w-fit items-center rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-800"
      >
        分析セットに追加する
      </Link>
    </div>
  );
}
