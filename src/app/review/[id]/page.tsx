import { notFound } from "next/navigation";
import { getAnalysisSetById, getReviewRows } from "@/lib/dummy-data";

// REVIEW（"/review/[id]"）
// 役割: 過去の分析セットについて、分析時点の値・現在値・変化率・当時の判断・
// 振り返りメモを表示する。
//
// 「現在値」について:
// 本来は REVIEW 表示のたびに現在の株価・指標を再取得する想定（design.md 保存ルール参照）だが、
// STEP1では外部API未接続のため、ダミーの固定値を「現在値」として表示している。
export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const analysisSet = getAnalysisSetById(id);

  if (!analysisSet) {
    notFound();
  }

  const rows = getReviewRows(analysisSet.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">振り返り｜{analysisSet.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">分析日 {analysisSet.analyzedAt}</p>
      </div>

      <div className="flex flex-col gap-4">
        {rows.map((row) => (
          <div key={row.stockCode} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold text-zinc-900">{row.stockName}</h2>
              <span
                className={`text-sm font-semibold ${
                  row.changeRate >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {row.changeRate >= 0 ? "+" : ""}
                {row.changeRate}%
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-2">
              <div>
                <div className="text-zinc-500">分析時点</div>
                <div className="text-zinc-900">{row.priceAtAnalysis.toLocaleString()}円</div>
              </div>
              <div>
                <div className="text-zinc-500">現在値</div>
                <div className="text-zinc-900">{row.currentPrice.toLocaleString()}円</div>
              </div>
            </div>

            <div className="mt-3 text-sm">
              <div className="text-zinc-500">当時の判断</div>
              <div className="text-zinc-900">{row.judgmentAtAnalysis}</div>
            </div>

            <div className="mt-3 text-sm">
              <div className="text-zinc-500">振り返りメモ</div>
              <div className="text-zinc-900">{row.reviewNote}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
