// PER / PBR / ROE / 営業利益成長 など、ラベルと数値を並べて見せる指標タイル。
// STOCK 画面の「主要指標」欄で使う。
export function MetricBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-lg font-semibold text-zinc-900">{value}</div>
    </div>
  );
}
