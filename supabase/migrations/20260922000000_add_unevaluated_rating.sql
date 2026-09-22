-- STEP4: analysis_items の growth/profitability/financial/valuation に
-- 「未評価」を表す "—" を追加できるようにする。
-- 対応: AI Provider連携にあたり、根拠不足の評価軸（financial: 財務データ
--       未接続、valuation: 業種ベンチマーク未接続）を無理に◎○△×で
--       断定させず、"—"（未評価）を許容するため。
--
-- 方針:
--   - 既存行のUPDATEは行わない（CHECK制約の変更のみ）。
--   - 制約名は 20260911000000_init_schema.sql でのテーブル定義時に
--     PostgreSQLが自動生成した名前（<table>_<column>_check）を使う。

alter table analysis_items drop constraint if exists analysis_items_growth_check;
alter table analysis_items add constraint analysis_items_growth_check
  check (growth in ('◎', '○', '△', '×', '—'));

alter table analysis_items drop constraint if exists analysis_items_profitability_check;
alter table analysis_items add constraint analysis_items_profitability_check
  check (profitability in ('◎', '○', '△', '×', '—'));

alter table analysis_items drop constraint if exists analysis_items_financial_check;
alter table analysis_items add constraint analysis_items_financial_check
  check (financial in ('◎', '○', '△', '×', '—'));

alter table analysis_items drop constraint if exists analysis_items_valuation_check;
alter table analysis_items add constraint analysis_items_valuation_check
  check (valuation in ('◎', '○', '△', '×', '—'));
