-- STEP3: 実在銘柄6701（日本電気/NEC）・4689（LINEヤフー）をまとめて追加する。
-- 対応: 9432で汎用化した MarketDataProvider / isMarketDataCandidate の仕組みが
--       コード変更なしで複数銘柄に横展開できることを確認する（3件目・4件目）。
--       既存の ai-2026-08（ダミー） / ai-2026-09（6758） / ai-2026-09b（9432）は
--       Snapshot不変原則のため一切変更せず、新しい analysis_set を作る。
--
-- 方針:
--   - insertのみ。ai-2026-08 / ai-2026-09 / ai-2026-09b 関連は
--     一切 update/delete しない。
--   - market-data-provider.ts / jquants-market-data-provider.ts /
--     review-repository.ts はコード変更不要（stocks.code が数字4桁である
--     ことだけで isMarketDataCandidate() が問い合わせ候補と判定するため）。
--   - stock_snapshots.price は、このmigration作成時点でJ-Quants
--     (MarketDataProvider)から実際に取得した確定値を埋め込む
--     （2026-09-18時点でFreeプランが返せる最新値:
--      6701 = 2026-06-19終値 3756円 / 4689 = 2026-06-19終値 409.5円）。
--     以後この値は書き換えない。
--   - captured_at は「価格の対象日」ではなく「Snapshotを取得・保存した日時」
--     なので、このmigrationを実行した日 2026-09-18 のまま保存する。
--     price(2026-06-19時点)とcaptured_at(2026-09-18)の日付が異なるのは
--     J-Quants Freeプランの12週間遅延によるもので、想定通りの状態。
--     「価格の対象日」を正式に持たせる price_date 列は、
--     stock_snapshots にまだ追加していない（将来の設計候補、未実装）。
--   - per/pbr/roe/profit_yoy・growth等はJ-Quants(日足終値のみ対応)や
--     AI Providerが未接続のため、dummy-data.ts の stockDetails["6701"] /
--     stockDetails["4689"] と同じ暫定プレースホルダ値を使う（実分析ではない）。

insert into stocks (code, name, industry) values
  ('6701', '日本電気', 'AI関連'),
  ('4689', 'LINEヤフー', 'AI関連')
on conflict (code) do nothing;

insert into theme_stocks (theme_id, stock_code, reason) values
  ('ai', '6701', 'AI事業を主力訴求'),
  ('ai', '4689', 'AI検索・広告事業への注目')
on conflict (theme_id, stock_code) do nothing;

insert into analysis_sets (id, theme_id, title, analyzed_at) values
  ('ai-2026-09c', 'ai', 'AI関連株 2026年9月(実銘柄拡張2)', '2026-09-18')
on conflict (id) do nothing;

insert into analysis_items
  (id, set_id, stock_code, ai_summary, growth, profitability, financial, valuation, risk)
values
  (
    '44444444-4444-4444-4444-444444444001', 'ai-2026-09c', '6701',
    'AI事業を経営の主力として訴求している大型株。',
    '○', '○', '○', '○', '詳細分析は未接続のため未評価'
  ),
  (
    '44444444-4444-4444-4444-444444444002', 'ai-2026-09c', '4689',
    'AI検索・広告事業で知名度の高い大型株。',
    '○', '○', '○', '○', '詳細分析は未接続のため未評価'
  )
on conflict (id) do nothing;

insert into stock_snapshots
  (analysis_item_id, price, per, pbr, roe, profit_yoy, captured_at)
values
  ('44444444-4444-4444-4444-444444444001', 3756, 18.0, 2.0, 8.0, 7, '2026-09-18T00:00:00Z'),
  ('44444444-4444-4444-4444-444444444002', 409.5, 25.0, 3.0, 6.0, 3, '2026-09-18T00:00:00Z')
on conflict (analysis_item_id) do nothing;
