import { notFound } from "next/navigation";
import { getReviewData } from "@/lib/repositories/review-repository";

// REVIEW（"/review/[id]"）
// 役割: 過去の分析セットについて、分析時点の値・現在値・変化率・当時の判断・
// 振り返りメモを表示する。
//
// データソース:
// - 分析セット本体・分析時点の株価/指標・当時の判断は Supabase から取得する。
// - 振り返りメモは review_notes テーブルから取得する（1分析セットにつき1件、表示のみ）。
// - 「現在値」は本来 REVIEW 表示のたびに再取得する想定（design.md 保存ルール参照）だが、
//   Market Data Provider が未接続のため、引き続きダミーの固定値を使う。
export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const review = await getReviewData(id);

  if (!review) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">振り返り｜{review.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">分析日 {review.analyzedAt}</p>
      </div>

      <div className="flex flex-col gap-4">
        {review.rows.map((row) => (
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
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-500">振り返りメモ（分析セット全体）</h2>
        <p className="mt-1 whitespace-pre-wrap text-zinc-900">
          {review.reviewNote || "（まだ振り返りメモが登録されていません）"}
        </p>
      </section>
    </div>
  );
}
