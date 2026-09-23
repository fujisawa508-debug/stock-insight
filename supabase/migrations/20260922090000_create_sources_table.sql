-- STEP4: sources テーブル作成の補完migration。
--
-- 経緯: 20260911000000_init_schema.sql には sources の
--       create table 文が含まれているが、このSupabaseプロジェクトでは
--       同ファイル内の他テーブル（themes/stocks/analysis_items等）は
--       全て作成されている一方、sources だけが実際には作成されて
--       いなかったことが判明した（原因不明。手動SQL適用時の欠落等と
--       推測されるが、既存DBを推測で変更しないため、原因究明はせず
--       現状に合わせて補完する）。
--
-- 方針:
--   - 20260911000000_init_schema.sql の sources 定義を
--     そのまま（title/snippet列を含めない元の形で）再現する。
--     title/snippet列は 20260923000000_add_title_snippet_to_sources.sql
--     が追加する想定のため、ここでは含めない
--     （こちらのmigrationを先に適用し、その後20260923000000を適用する
--     という順序を成立させるため）。
--   - RLSはSELECTのみ許可し、INSERT/UPDATEのpolicyは追加しない
--     （書き込みは create_analysis_set RPC 経由・service_role のみで
--     行う既存方針を踏襲する）。
--   - create table if not exists / create policyはdrop→createで
--     再実行しても安全な形にする。

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  analysis_item_id uuid not null references analysis_items (id) on delete cascade,
  source text not null,
  url text,
  published_at timestamptz,
  fetched_at timestamptz not null default now()
);

alter table sources enable row level security;

drop policy if exists "anon can read sources" on sources;
create policy "anon can read sources" on sources for select to anon using (true);
