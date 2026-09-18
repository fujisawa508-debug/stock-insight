-- STEP3: SET画面「保存する」機能のための analysis_set 作成RPCを追加する。
-- 対応: analysis_sets / analysis_items / stock_snapshots への書き込みを
--       1トランザクションで行う専用関数を作り、anon への INSERT policy は
--       追加しない方針に変更する（Vercelで公開済みのため、anonにINSERTを
--       許可すると第三者が書き込める状態になってしまうことを避ける）。
--
-- 方針:
--   - この関数は insert のみを行う。既存行の update/delete は一切行わない。
--   - PostgreSQL関数は既定で1トランザクションとして実行されるため、
--     途中で例外が発生すれば関数全体が自動的にロールバックされる
--     （明示的な BEGIN/COMMIT/ROLLBACK や EXCEPTION ハンドラは書かない。
--     EXCEPTION で捕捉すると其処までの変更がサブトランザクション単位で
--     確定してしまいうるため、意図的に何も捕捉せず素通しする）。
--   - security invoker（既定）のままにする。関数の中身は呼び出し元の
--     ロールの権限で実行されるため、service_role から呼べばRLSを
--     バイパスして書き込め、万一anon/authenticatedから呼ばれても
--     RLS側で拒否される（＝EXECUTE権限を絞り忘れても二重に守られる）。
--   - そのうえで、この関数の EXECUTE 権限を service_role のみに絞る。
--     PostgreSQLは関数作成時に既定で PUBLIC へ EXECUTE を付与するため、
--     明示的に revoke しない限り anon/authenticated からも呼び出せて
--     しまう。
--   - 引数はJSONB1個にまとめ、テーブル行を都度生成する
--     （analysis_items.id / stock_snapshots.analysis_item_id は
--     関数内で gen_random_uuid() により生成する）。

create or replace function create_analysis_set(payload jsonb)
returns text
language plpgsql
security invoker
as $$
declare
  new_id text;
  item jsonb;
  new_item_id uuid;
begin
  new_id := payload->>'id';

  insert into analysis_sets (id, theme_id, title, analyzed_at)
  values (
    new_id,
    payload->>'theme_id',
    payload->>'title',
    (payload->>'analyzed_at')::date
  );

  for item in select * from jsonb_array_elements(payload->'items')
  loop
    new_item_id := gen_random_uuid();

    insert into analysis_items
      (id, set_id, stock_code, ai_summary, growth, profitability, financial, valuation, risk)
    values (
      new_item_id,
      new_id,
      item->>'stock_code',
      item->>'ai_summary',
      item->>'growth',
      item->>'profitability',
      item->>'financial',
      item->>'valuation',
      item->>'risk'
    );

    insert into stock_snapshots
      (analysis_item_id, price, per, pbr, roe, profit_yoy, captured_at, price_date)
    values (
      new_item_id,
      (item->>'price')::numeric,
      (item->>'per')::numeric,
      (item->>'pbr')::numeric,
      (item->>'roe')::numeric,
      (item->>'profit_yoy')::numeric,
      (item->>'captured_at')::timestamptz,
      nullif(item->>'price_date', '')::date
    );
  end loop;

  return new_id;
end;
$$;

revoke execute on function create_analysis_set(jsonb) from public;
revoke execute on function create_analysis_set(jsonb) from anon;
revoke execute on function create_analysis_set(jsonb) from authenticated;
grant execute on function create_analysis_set(jsonb) to service_role;
