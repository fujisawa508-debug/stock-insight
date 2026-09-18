-- STEP3: 実在銘柄9432（日本電信電話/NTT）を追加する。
-- 対応: MarketDataProviderが複数の実在銘柄でも同じ仕組みで動くことを確認する
--       ための2件目。既存の ai-2026-08（ダミー） / ai-2026-09（6758）は
--       Snapshot不変原則のため一切変更せず、新しい analysis_set を作る。
--
-- 方針:
--   - insertのみ。ai-2026-08 / ai-2026-09 関連は一切 update/delete しない。
--   - stocks.code は東証4桁コードをそのまま正規IDとして使う
--     （market-data-provider.ts の isMarketDataCandidate() が「数字4桁」を
--     MarketDataProviderへの問い合わせ候補と判定するため、個別のコード
--     列挙リストは不要。この形式一致は実在・取引可能を保証するものではなく、
--     実際の成否は getLatestDailyQuote() の結果で判断される）。
--   - stock_snapshots.price は、このmigration作成時点でJ-Quants
--     (MarketDataProvider)から実際に取得した確定値を埋め込む
--     （2026-09-18時点でFreeプランが返せる最新値: 2026-06-19終値 144.4円）。
--     以後この値は書き換えない。
--   - captured_at は「価格の対象日」ではなく「Snapshotを取得・保存した日時」
--     なので、このmigrationを実行した日 2026-09-18 のまま保存する。
--     price(2026-06-19時点)とcaptured_at(2026-09-18)の日付が異なるのは
--     J-Quants Freeプランの12週間遅延によるもので、想定通りの状態。
--     「価格の対象日」を正式に持たせる price_date 列は、
--     stock_snapshots にまだ追加していない（将来の設計候補、未実装）。
--   - per/pbr/roe/profit_yoy・growth等はJ-Quants(日足終値のみ対応)や
--     AI Providerが未接続のため暫定プレースホルダ値を使う
--     （6758の時と同じ水準の仮値。実分析ではない）。

insert into stocks (code, name, industry) values
  ('9432', '日本電信電話', 'AI関連')
on conflict (code) do nothing;

insert into theme_stocks (theme_id, stock_code, reason) values
  ('ai', '9432', '自社LLM等AI研究開発への注目')
on conflict (theme_id, stock_code) do nothing;

insert into analysis_sets (id, theme_id, title, analyzed_at) values
  ('ai-2026-09b', 'ai', 'AI関連株 2026年9月(実銘柄拡張)', '2026-09-18')
on conflict (id) do nothing;

insert into analysis_items
  (id, set_id, stock_code, ai_summary, growth, profitability, financial, valuation, risk)
values
  (
    '33333333-3333-3333-3333-333333333001', 'ai-2026-09b', '9432',
    'AI研究開発（自社LLM等）への取り組みが注目される大型株。',
    '○', '○', '○', '○', '詳細分析は未接続のため未評価'
  )
on conflict (id) do nothing;

insert into stock_snapshots
  (analysis_item_id, price, per, pbr, roe, profit_yoy, captured_at)
values
  ('33333333-3333-3333-3333-333333333001', 144.4, 13.0, 1.3, 9.0, 5, '2026-09-18T00:00:00Z')
on conflict (analysis_item_id) do nothing;
