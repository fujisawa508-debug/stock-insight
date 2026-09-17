-- STEP2: review_notes（REVIEW画面の振り返りメモ）
-- 対応: docs/design.md スライド9「保存ルール｜分析時点と現在を混ぜない」の
--       「ユーザーの振り返りメモ」に相当する保存先。
--
-- 設計方針:
--   - 1 analysis_set : 1 review_note（analysis_set_id に UNIQUE 制約）
--   - このSTEPでは表示（SELECT）のみを対象とし、書き込み（INSERT/UPDATE）用の
--     ポリシーはまだ作らない（編集機能を追加するSTEPで別途追加する）
--   - stock_snapshots と同様、anon には SELECT のみを許可する

create table if not exists review_notes (
  id uuid primary key default gen_random_uuid(),
  analysis_set_id text not null unique references analysis_sets (id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table review_notes enable row level security;

create policy "anon can read review_notes" on review_notes for select to anon using (true);
