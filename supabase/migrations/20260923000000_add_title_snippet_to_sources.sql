-- STEP4: News Provider連携のため、sources に title / snippet 列を追加する。
-- 対応: 既存の sources(source, url, published_at, fetched_at) だけでは
--       ニュース記事のタイトル・要約を保存できないため。
--
-- 方針:
--   - sources は現状シードデータが無く空テーブルのため、
--     既存行への影響はない。
--   - 記事全文は保存しない（title/snippetのみ、AIへの入力材料の再現性
--     確保が目的であり、著作権的な観点からも全文保持はしない）。

alter table sources add column if not exists title text not null default '';
alter table sources add column if not exists snippet text not null default '';
