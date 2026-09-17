import { ThemeCard } from "@/components/ThemeCard";
import { getRecentChanges } from "@/lib/dummy-data";
import { getThemes } from "@/lib/repositories/theme-repository";

// HOME（"/"）
// 役割: 登録テーマ一覧 / 最近の変化 の表示、各テーマの THEME 画面への入口。
// テーマ一覧のみ Supabase (theme-repository.ts) から取得する。
// 「最近の変化」はSTEP2の対象外のため、引き続き dummy-data.ts を使う。
export default async function HomePage() {
  const themes = await getThemes();
  const recentChanges = getRecentChanges();

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-xl font-semibold text-zinc-900">あなたのテーマ</h1>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {themes.map((theme) => (
            <ThemeCard key={theme.id} theme={theme} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">最近の変化</h2>
        <ul className="mt-4 flex flex-col gap-2">
          {recentChanges.map((change) => (
            <li
              key={`${change.themeId}-${change.stockCode}`}
              className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <span className="mr-2 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                  {change.themeName}
                </span>
                <span className="font-medium text-zinc-900">{change.stockName}</span>
                <span className="ml-2 text-zinc-600">{change.summary}</span>
              </div>
              <span className="text-sm text-zinc-400">{change.date}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
