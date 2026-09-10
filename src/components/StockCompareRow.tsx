import Link from "next/link";
import type { ThemeStockSummary } from "@/types";
import { RatingBadge } from "@/components/RatingBadge";

// THEME 画面：テーマ内銘柄を同じ軸（成長性・割高感・注目理由）で並べる比較行。
// STOCK 画面への入口。
export function StockCompareRow({ stock }: { stock: ThemeStockSummary }) {
  return (
    <Link
      href={`/stocks/${stock.code}`}
      className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <div className="font-semibold text-zinc-900">{stock.name}</div>
        <div className="text-sm text-zinc-500">{stock.reason}</div>
      </div>
      <div className="flex gap-4">
        <RatingBadge label="成長性" rating={stock.growth} />
        <RatingBadge label="割高感" rating={stock.valuation} />
      </div>
    </Link>
  );
}
