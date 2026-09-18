"use client";

import { useActionState } from "react";
import { saveAnalysisSetAction } from "@/app/analysis/[id]/actions";

// SET画面「保存する」ボタン。押下中はdisabledにして二重送信を防ぐ。
// 保存処理そのもの（Supabaseへの書き込み）はServer Action(actions.ts)→
// Repositoryが行い、このComponentはpending/error表示のみを担当する。
export function SaveAnalysisSetButton({ analysisSetId }: { analysisSetId: string }) {
  const action = saveAnalysisSetAction.bind(null, analysisSetId);
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        {isPending ? "保存中..." : "保存する"}
      </button>
      {state?.error && <p className="text-sm text-rose-700">{state.error}</p>}
    </form>
  );
}
