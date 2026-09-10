import Link from "next/link";
import type { Theme } from "@/types";

// HOME の「あなたのテーマ」一覧で使うカード。THEME 画面への入口。
export function ThemeCard({ theme }: { theme: Theme }) {
  return (
    <Link
      href={`/themes/${theme.id}`}
      className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-400"
    >
      <div className="text-base font-semibold text-zinc-900">{theme.name}</div>
      <div className="text-sm text-zinc-500">{theme.stockCount}銘柄</div>
      <div className="text-sm text-zinc-500">
        {theme.recentUpdateLabel} {theme.recentUpdateCount}件
      </div>
      <span className="mt-2 text-sm font-medium text-sky-700">分析を見る →</span>
    </Link>
  );
}
