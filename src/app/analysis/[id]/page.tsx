import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnalysisSetById } from "@/lib/repositories/analysis-repository";

// SET（"/analysis/[id]"）
// 役割: 複数銘柄を分析セットとして一覧表示し、分析日・対象銘柄・当時の主要指標を見せる。
// REVIEW 画面への入口。
//
// 「保存ボタン」について:
// STEP1ではDB（Supabase）未接続のため、押しても永続化されない。
// design.md の実装ロードマップ Step5「保存」で実データ保存に差し替える想定のため、
// ここでは非活性ボタンとして仮実装している。
export default async function AnalysisSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const analysisSet = await getAnalysisSetById(id);

  if (!analysisSet) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">分析セット｜{analysisSet.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          分析日 {analysisSet.analyzedAt}　｜　対象 {analysisSet.items.length}銘柄
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">銘柄</th>
              <th className="px-4 py-2 font-medium">分析時株価</th>
              <th className="px-4 py-2 font-medium">PER</th>
              <th className="px-4 py-2 font-medium">PBR</th>
              <th className="px-4 py-2 font-medium">ROE</th>
            </tr>
          </thead>
          <tbody>
            {analysisSet.items.map((item) => (
              <tr key={item.stockCode} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-2 font-medium text-zinc-900">{item.stockName}</td>
                <td className="px-4 py-2 text-zinc-700">{item.priceAtAnalysis.toLocaleString()}</td>
                <td className="px-4 py-2 text-zinc-700">{item.per}x</td>
                <td className="px-4 py-2 text-zinc-700">{item.pbr}x</td>
                <td className="px-4 py-2 text-zinc-700">{item.roe}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled
          title="STEP1未実装: DB接続後に保存できるようになります"
          className="rounded-lg border border-zinc-300 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-400"
        >
          保存（未実装）
        </button>
        <Link
          href={`/review/${analysisSet.id}`}
          className="inline-flex items-center rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-800"
        >
          振り返りを見る（REVIEW）
        </Link>
      </div>
    </div>
  );
}
