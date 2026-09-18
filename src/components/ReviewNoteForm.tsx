"use client";

import { useActionState, useState } from "react";
import { saveReviewNoteAction } from "@/app/review/[id]/actions";

// REVIEW画面「振り返りメモ」の編集フォーム。
// 保存処理そのもの（Supabaseへの書き込み）はServer Action(actions.ts)→
// Repositoryが行い、このComponentは入力・pending/error/成功表示のみを担当する。
export function ReviewNoteForm({
  analysisSetId,
  initialNote,
}: {
  analysisSetId: string;
  initialNote: string;
}) {
  const action = saveReviewNoteAction.bind(null, analysisSetId);
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [note, setNote] = useState(initialNote);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <textarea
        name="note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={5}
        placeholder="振り返りメモを入力してください"
        className="w-full rounded-lg border border-zinc-300 p-3 text-sm text-zinc-900 focus:border-sky-600 focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {isPending ? "保存中..." : "保存する"}
        </button>
        {state && "error" in state && <p className="text-sm text-rose-700">{state.error}</p>}
        {state && "savedNote" in state && <p className="text-sm text-emerald-700">保存しました</p>}
      </div>
    </form>
  );
}
