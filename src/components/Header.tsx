import Link from "next/link";

// 全画面共通のヘッダー。
// 動的URL（/themes/[id] など）へのナビゲーションは各画面内のリンクで行うため、
// ここではアプリ名からHOMEへ戻れることだけを保証する。
export function Header() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-zinc-900">
          Stock Insight
        </Link>
      </div>
    </header>
  );
}
