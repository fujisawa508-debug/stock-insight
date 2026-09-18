-- STEP2: シードデータ。
-- src/lib/dummy-data.ts と同じ値を投入し、Supabase切り替え後も
-- 画面表示（特に既存URL・リンク）が変わらないようにする。
--
-- 冪等性のため、各INSERTは主キー競合時 DO NOTHING とする
-- （再実行してもエラーにならず、既存行は変更しない）。
--
-- 注意: dummy-data.ts に "sources"（情報源）に相当するデータが無いため、
-- sources テーブルへの初期データ投入は行わない（仕様に無いデータを
-- 勝手に作らないため）。

-- themes ----------------------------------------------------------------
insert into themes (id, name) values
  ('ai', 'AI'),
  ('space', '宇宙'),
  ('semiconductor', '半導体')
on conflict (id) do nothing;

-- stocks ------------------------------------------------------------------
-- industry は dummy-data.ts の stockDetails に値がある銘柄はその値を、
-- 無い銘柄は所属テーマから推定した値を使う（themeStocks の分類に準拠）。
insert into stocks (code, name, industry) values
  ('A001', 'A社', 'AI関連'),
  ('B002', 'B社', '半導体'),
  ('C003', 'C社', '宇宙関連'),
  ('D004', 'D社', 'AI関連'),
  ('E005', 'E社', 'AI関連'),
  ('F006', 'F社', 'AI関連'),
  ('G007', 'G社', 'AI関連'),
  ('H008', 'H社', 'AI関連'),
  ('S001', 'S社', '宇宙関連'),
  ('S002', 'S社2', '宇宙関連'),
  ('M001', 'M社', '半導体')
on conflict (code) do nothing;

-- theme_stocks --------------------------------------------------------------
insert into theme_stocks (theme_id, stock_code, reason) values
  ('ai', 'A001', 'AI需要増'),
  ('ai', 'B002', '利益率改善'),
  ('ai', 'C003', '大型案件'),
  ('ai', 'D004', '新規事業'),
  ('ai', 'E005', '決算期待'),
  ('ai', 'F006', '提携拡大'),
  ('ai', 'G007', 'コスト増懸念'),
  ('ai', 'H008', '海外展開'),
  ('space', 'S001', '大型受注を発表'),
  ('space', 'S002', '打ち上げ成功'),
  ('semiconductor', 'B002', '営業利益率が改善'),
  ('semiconductor', 'M001', '在庫調整中')
on conflict (theme_id, stock_code) do nothing;

-- analysis_sets ---------------------------------------------------------
insert into analysis_sets (id, theme_id, title, analyzed_at) values
  ('ai-2026-08', 'ai', 'AI関連株 2026年8月', '2026-08-27')
on conflict (id) do nothing;

-- analysis_items ----------------------------------------------------------
-- id は stock_snapshots から参照するため固定UUIDを採番する。
insert into analysis_items
  (id, set_id, stock_code, ai_summary, growth, profitability, financial, valuation, risk)
values
  (
    '11111111-1111-1111-1111-111111111001', 'ai-2026-08', 'A001',
    'AI向け需要の拡大に加え、直近決算で営業利益率が改善。一方でPERは過去平均より高め。',
    '◎', '○', '○', '△', 'PER高め'
  ),
  (
    '11111111-1111-1111-1111-111111111002', 'ai-2026-08', 'B002',
    '直近決算で営業利益率が改善。業績は堅調だが市場期待には届いていない。',
    '○', '○', '○', '○', '市場期待とのギャップ'
  ),
  (
    '11111111-1111-1111-1111-111111111003', 'ai-2026-08', 'C003',
    '大型受注を発表。テーマ全体の追い風もあり成長期待は高いが、リスクも大きい。',
    '○', '△', '△', '◎', '高リスク・高ボラティリティ'
  ),
  (
    '11111111-1111-1111-1111-111111111004', 'ai-2026-08', 'D004',
    '割安感はあるものの、直近で利益悪化が見られる新規事業案件。',
    '△', '△', '○', '○', '利益悪化の兆候'
  )
on conflict (id) do nothing;

-- stock_snapshots -----------------------------------------------------------
-- captured_at は analysis_sets.analyzed_at と同日時点の想定固定値。
insert into stock_snapshots
  (analysis_item_id, price, per, pbr, roe, profit_yoy, captured_at)
values
  ('11111111-1111-1111-1111-111111111001', 2000, 22.4, 2.1, 13.8, 18, '2026-08-27T00:00:00Z'),
  ('11111111-1111-1111-1111-111111111002', 1500, 15.2, 1.4, 9.6, 6, '2026-08-27T00:00:00Z'),
  ('11111111-1111-1111-1111-111111111003', 3000, 34.7, 3.2, 8.1, 40, '2026-08-27T00:00:00Z'),
  ('11111111-1111-1111-1111-111111111004', 1200, 11.8, 0.9, 5.4, -12, '2026-08-27T00:00:00Z')
on conflict (analysis_item_id) do nothing;

-- review_notes ----------------------------------------------------------
-- 1 analysis_set : 1 note。dummy-data.ts の reviewNotesBySet と同じ内容。
insert into review_notes (analysis_set_id, note) values
  (
    'ai-2026-08',
    'AI需要→上方修正。注目理由は有効だった。B社は業績堅調だが市場期待には届かず。C社は高リスク判断が妥当でテーマ全体が上昇。D社は割安だけでは不十分で、利益悪化を見落としていた。'
  )
on conflict (analysis_set_id) do nothing;

-- STEP3: 実在銘柄コード追加（第1弾） -------------------------------------
-- 20260918000000_add_real_stock_6758.sql と同じ内容。
-- 既存のダミー銘柄(A001等)・analysis_sets 等は変更しない。
insert into stocks (code, name, industry) values
  ('6758', 'ソニーグループ', 'AI関連')
on conflict (code) do nothing;

insert into theme_stocks (theme_id, stock_code, reason) values
  ('ai', '6758', 'AI活用の広がりに注目')
on conflict (theme_id, stock_code) do nothing;
