-- STEP3: 実在銘柄6758を含む新しい分析セットを追加する。
-- 対応: 既存の ai-2026-08（完全にダミーの過去データ）は Snapshot不変原則のため
--       一切変更しない。6758をREVIEWで扱うために新しい analysis_set を作る。
--
-- 方針:
--   - insertのみ。ai-2026-08 関連（analysis_sets/analysis_items/
--     stock_snapshots/review_notes）は一切 update/delete しない。
--   - stock_snapshots.price は、このmigration作成時点でJ-Quants
--     (MarketDataProvider)から実際に取得した確定値を埋め込む
--     （2026-09-18時点でFreeプランが返せる最新値: 2026-06-19終値 3140円）。
--     以後この値は書き換えない。
--   - captured_at は「価格の対象日」ではなく「Snapshotを取得・保存した日時」
--     なので、このmigrationを実行した日 2026-09-18 のまま保存する
--     （price と captured_at の日付が異なるのは、J-Quants Freeプランの
--     12週間遅延によるもので、想定通りの状態）。
--     「価格の対象日」を正式に持たせたい場合は、将来的に
--     stock_snapshots へ price_date 列を追加する設計を別途検討する
--     （今回のmigrationでは追加しない）。
--   - REVIEW画面の「現在値(currentPrice)」は review-repository.ts が
--     表示の都度 MarketDataProvider から動的に取得する別経路であり、
--     ここに保存する price とは独立している（たまたま同じ値になっているだけ）。
--   - per/pbr/roe/profit_yoy・growth等はJ-Quants(日足終値のみ対応)や
--     AI Providerが未接続のため、dummy-data.ts の stockDetails["6758"] と
--     同じ暫定プレースホルダ値を使う。

insert into analysis_sets (id, theme_id, title, analyzed_at) values
  ('ai-2026-09', 'ai', 'AI関連株 2026年9月', '2026-09-18')
on conflict (id) do nothing;

insert into analysis_items
  (id, set_id, stock_code, ai_summary, growth, profitability, financial, valuation, risk)
values
  (
    '22222222-2222-2222-2222-222222222001', 'ai-2026-09', '6758',
    'AI活用の広がりに注目が集まる大型株。',
    '○', '○', '○', '○', '詳細分析は未接続のため未評価'
  )
on conflict (id) do nothing;

insert into stock_snapshots
  (analysis_item_id, price, per, pbr, roe, profit_yoy, captured_at)
values
  ('22222222-2222-2222-2222-222222222001', 3140, 20.0, 2.5, 12.0, 10, '2026-09-18T00:00:00Z')
on conflict (analysis_item_id) do nothing;
