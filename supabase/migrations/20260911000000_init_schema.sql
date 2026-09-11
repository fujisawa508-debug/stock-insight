-- STEP2: DB層の土台（テーブル定義 + RLS）
-- 対応: docs/design.md スライド7-9のDB設計 / docs/requirements.md Step8データ要件
--
-- 設計方針（STEP2確定事項）:
--   - analysis_items : stock_snapshots は 1:1（stock_snapshots.analysis_item_id に UNIQUE 制約）
--   - analysis_items : sources は 1:N
--   - stock_snapshots は INSERT のみを想定し、UPDATE/DELETE用のポリシーは意図的に作らない
--   - themes.id / analysis_sets.id / stocks.code は URL・ダミーデータと一致させるための自然キー（text）
--   - RLS は全テーブルで有効化し、anon ロールには SELECT のみを許可する

create extension if not exists pgcrypto;

-- テーマ（AI / 宇宙 / 半導体 など）。id は "/themes/[id]" にそのまま使うスラッグ。
create table if not exists themes (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

-- 銘柄マスタ。code は "/stocks/[code]" にそのまま使う。
create table if not exists stocks (
  code text primary key,
  name text not null,
  industry text not null
);

-- テーマと銘柄の関連（多対多の中間テーブル）。
create table if not exists theme_stocks (
  theme_id text not null references themes (id) on delete cascade,
  stock_code text not null references stocks (code) on delete cascade,
  reason text not null,
  primary key (theme_id, stock_code)
);

-- 分析セット。id は "/analysis/[id]" "/review/[id]" にそのまま使う。
create table if not exists analysis_sets (
  id text primary key,
  theme_id text not null references themes (id) on delete restrict,
  title text not null,
  analyzed_at date not null
);

-- 分析セットに含まれる銘柄ごとの分析結果。
create table if not exists analysis_items (
  id uuid primary key default gen_random_uuid(),
  set_id text not null references analysis_sets (id) on delete cascade,
  stock_code text not null references stocks (code) on delete restrict,
  ai_summary text not null,
  growth text not null check (growth in ('◎', '○', '△', '×')),
  profitability text not null check (profitability in ('◎', '○', '△', '×')),
  financial text not null check (financial in ('◎', '○', '△', '×')),
  valuation text not null check (valuation in ('◎', '○', '△', '×')),
  risk text not null,
  created_at timestamptz not null default now()
);

-- 分析時点のスナップショット（固定保存）。
-- analysis_item_id に UNIQUE を付けて 1analysis_item : 1snapshot を強制する。
-- 再分析する場合は新しい analysis_set / analysis_item / stock_snapshot を作成し、
-- 既存行は更新しない（UPDATE用ポリシーを作らないことでアプリ側からも上書きできない状態にする）。
create table if not exists stock_snapshots (
  id uuid primary key default gen_random_uuid(),
  analysis_item_id uuid not null unique references analysis_items (id) on delete cascade,
  price numeric not null,
  per numeric not null,
  pbr numeric not null,
  roe numeric not null,
  profit_yoy numeric not null,
  captured_at timestamptz not null default now()
);

-- 分析の根拠となった情報源（1 analysis_item に対して複数可）。
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  analysis_item_id uuid not null references analysis_items (id) on delete cascade,
  source text not null,
  url text,
  published_at timestamptz,
  fetched_at timestamptz not null default now()
);

-- RLS: 全テーブルで有効化し、anon には SELECT のみ許可する。
-- INSERT/UPDATE/DELETE のポリシーは書き込みが必要になるまで作らない。
alter table themes enable row level security;
alter table stocks enable row level security;
alter table theme_stocks enable row level security;
alter table analysis_sets enable row level security;
alter table analysis_items enable row level security;
alter table stock_snapshots enable row level security;
alter table sources enable row level security;

create policy "anon can read themes" on themes for select to anon using (true);
create policy "anon can read stocks" on stocks for select to anon using (true);
create policy "anon can read theme_stocks" on theme_stocks for select to anon using (true);
create policy "anon can read analysis_sets" on analysis_sets for select to anon using (true);
create policy "anon can read analysis_items" on analysis_items for select to anon using (true);
create policy "anon can read stock_snapshots" on stock_snapshots for select to anon using (true);
create policy "anon can read sources" on sources for select to anon using (true);
