"use server";

import { revalidatePath } from "next/cache";
import { saveReviewNote } from "@/lib/repositories/review-repository";

// REVIEW画面「振り返りメモ」保存のServer Action。
// Client Component(ReviewNoteForm)からuseActionState経由で呼ばれる。
// UI(Client Component)からSupabaseを直接叩かず、必ずここ→Repositoryを経由する。

export type SaveReviewNoteState = { error: string } | { savedNote: string } | undefined;

export async function saveReviewNoteAction(
  analysisSetId: string,
  _prevState: SaveReviewNoteState,
  formData: FormData
): Promise<SaveReviewNoteState> {
  const note = (formData.get("note") ?? "").toString();
  const result = await saveReviewNote(analysisSetId, note);

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath(`/review/${analysisSetId}`);
  return { savedNote: note };
}
