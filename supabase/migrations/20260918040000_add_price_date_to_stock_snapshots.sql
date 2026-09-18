-- STEP3: stock_snapshots に price_date 列を追加する。
-- 対応: J-Quants Freeプランの遅延データについて、「価格が実際に指している
--       取引日」(price_date) と「Snapshotを取得・保存した日時」(captured_at)
--       を明確に分離する（20260918010000/020000/030000で作成した
--       Snapshotのコメントで「将来price_date列を追加する設計候補」として
--       残していたものを、ここで実装する）。
--
-- 方針:
--   - price / captured_at / per / pbr / roe / profit_yoy 等、既存の
--     確定値は一切変更しない。price_date列の追加とバックフィルのみを行う。
--     Snapshot不変原則は「価格そのものを保存時点の値から書き換えないこと」
--     を意図したものであり、当時まだ列が存在せず記録できなかった
--     メタデータ（価格の対象日）を後から正しく補完することはこの原則に
--     違反しない。
--   - price_date は date型・NULL許容・デフォルトなし。
--   - 実在銘柄（6758 / 9432 / 6701 / 4689）のSnapshotは、migration作成時点
--     で実際にJ-Quantsから取得した価格の対象日 2026-06-19 を設定する。
--   - ダミー銘柄（ai-2026-08 の A001〜D004）のSnapshotは、価格の対象日が
--     記録されていないため、無理に推測せず price_date は NULL のままにする。
--   - 今後の新規Snapshot保存では、INSERT時に price_date も一緒に保存する
--     運用にする（seed.sql側は本migrationに合わせてINSERT文自体に
--     price_date を含める形へ更新済み）。

alter table stock_snapshots add column if not exists price_date date;

update stock_snapshots
set price_date = '2026-06-19'
where analysis_item_id in (
  '22222222-2222-2222-2222-222222222001', -- 6758 (ai-2026-09)
  '33333333-3333-3333-3333-333333333001', -- 9432 (ai-2026-09b)
  '44444444-4444-4444-4444-444444444001', -- 6701 (ai-2026-09c)
  '44444444-4444-4444-4444-444444444002'  -- 4689 (ai-2026-09c)
)
and price_date is null;
