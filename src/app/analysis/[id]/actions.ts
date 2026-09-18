"use server";

import { redirect } from "next/navigation";
import { createAnalysisSetFromExisting } from "@/lib/repositories/analysis-repository";

// SET画面「保存する」ボタンのServer Action。
// Client Component(SaveAnalysisSetButton)からuseActionState経由で呼ばれる。
// UI(Client Component)からSupabaseを直接叩かず、必ずここ→Repositoryを経由する。

export type SaveAnalysisSetState = { error: string } | undefined;

export async function saveAnalysisSetAction(
  sourceId: string,
  _prevState: SaveAnalysisSetState,
  _formData: FormData
): Promise<SaveAnalysisSetState> {
  const result = await createAnalysisSetFromExisting(sourceId);

  if (!result.ok) {
    return { error: result.error };
  }

  redirect(`/analysis/${result.id}`);
}
