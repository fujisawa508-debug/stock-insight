-- STEP3: ダミー銘柄コードから実在銘柄コードへの移行（第1弾・最小実装単位）
-- 対応: AIテーマに実在銘柄「6758 ソニーグループ」を追加する。
--
-- 方針:
--   - 既存のダミー銘柄(A001等)・analysis_sets・analysis_items・stock_snapshots・
--     review_notes は一切変更しない（このSTEPのスコープ外）。
--   - stocks / theme_stocks への追加のみを行う（既存行の更新・削除はしない）。
--   - J-Quants API V2 は東証4桁コードをそのまま受け付けるため、
--     stocks.code は "6758" をそのまま正規IDとして使う（コード変換は不要）。

insert into stocks (code, name, industry) values
  ('6758', 'ソニーグループ', 'AI関連')
on conflict (code) do nothing;

insert into theme_stocks (theme_id, stock_code, reason) values
  ('ai', '6758', 'AI活用の広がりに注目')
on conflict (theme_id, stock_code) do nothing;
