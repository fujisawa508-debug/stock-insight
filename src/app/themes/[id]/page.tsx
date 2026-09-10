import { notFound } from "next/navigation";
import { StockCompareRow } from "@/components/StockCompareRow";
import { getThemeById, getThemeStocks } from "@/lib/dummy-data";

// THEME（"/themes/[id]"）
// 役割: 選択テーマに紐づく銘柄を、成長性・割高感・注目理由という同じ軸で比較表示する。
// STOCK 画面への入口。
export default async function ThemePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const theme = getThemeById(id);

  if (!theme) {
    notFound();
  }

  const stocks = getThemeStocks(theme.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">{theme.name}｜分析候補</h1>
        <p className="mt-1 text-sm text-zinc-500">{stocks.length}銘柄</p>
      </div>

      <div className="flex flex-col gap-3">
        {stocks.map((stock) => (
          <StockCompareRow key={stock.code} stock={stock} />
        ))}
      </div>
    </div>
  );
}
