import type { Rating } from "@/types";

// 成長性・割高感・収益性・財務などの ◎○△× 評価を色分け表示する小部品。
// THEME の比較行と STOCK の詳細の両方で使う。
const RATING_STYLE: Record<Rating, string> = {
  "◎": "bg-emerald-100 text-emerald-800",
  "○": "bg-sky-100 text-sky-800",
  "△": "bg-amber-100 text-amber-800",
  "×": "bg-rose-100 text-rose-800",
};

export function RatingBadge({ label, rating }: { label: string; rating: Rating }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span
        className={`inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 font-semibold ${RATING_STYLE[rating]}`}
      >
        {rating}
      </span>
    </span>
  );
}
