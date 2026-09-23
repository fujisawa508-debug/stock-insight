import { notFound } from "next/navigation";
import { getReviewData } from "@/lib/repositories/review-repository";
import { ReviewNoteForm } from "@/components/ReviewNoteForm";

// REVIEW（"/review/[id]"）
// 役割: 過去の分析セットについて、分析時点の値・取得可能な最新価格・変化率・
// 当時の判断・振り返りメモを表示する。
//
// データソース:
// - 分析セット本体・分析時点の株価/指標・当時の判断は Supabase から取得する。
// - 振り返りメモは review_notes テーブルから取得・編集・保存できる
//   （1分析セットにつき1件。保存はactions.ts(Server Action)→
//   review-repository.tsのsaveReviewNote()経由でservice_role upsertする）。
// - 表示上「取得可能な最新価格」としているのは、Market Data Provider
//   (J-Quants Freeプラン)が直近12週間のデータを返せず、実在銘柄コードの
//   場合でも厳密な意味での「今の値」ではない場合があるため
//   （ダミー銘柄コードは引き続きdummy-data.tsの固定値を使う）。
//   「現在値」という表現は誤解を招くため使わない。
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
                <div className="text-zinc-500">取得可能な最新価格</div>
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
        <div className="mt-2">
          <ReviewNoteForm analysisSetId={id} initialNote={review.reviewNote} />
        </div>
      </section>
    </div>
  );
}
