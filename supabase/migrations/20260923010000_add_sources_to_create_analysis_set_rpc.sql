-- STEP4: create_analysis_set RPCに、銘柄ごとのニュース(sources)保存を追加する。
-- 対応: News Provider(Google News RSS)で取得した記事を、AI分析に使った
--       材料として再現性確保のため sources テーブルへ保存する。
--
-- 方針:
--   - 既存の analysis_sets/analysis_items/stock_snapshots への書き込みは
--     一切変更しない。sources への insert ループを追加するだけ。
--   - payload.items[].sources（0〜3件程度の配列、無い場合は空配列扱い）
--     を、対応する analysis_item の子として insert する。
--   - 記事全文は保存しない（title/url/published_at/source/snippetのみ）。
--   - security invoker のまま、EXECUTE権限も service_role のみに再度
--     明示する（CREATE OR REPLACEでも既存権限は保持されるが、この
--     migrationファイル単体で完全なセキュリティ設定を確認できるように
--     するため、念のため再度revoke/grantを実行する）。
--   - 1トランザクション・失敗時ロールバックの方針は変更なし。

create or replace function create_analysis_set(payload jsonb)
returns text
language plpgsql
security invoker
as $$
declare
  new_id text;
  item jsonb;
  new_item_id uuid;
  src jsonb;
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

    for src in select * from jsonb_array_elements(coalesce(item->'sources', '[]'::jsonb))
    loop
      insert into sources
        (analysis_item_id, source, url, published_at, title, snippet)
      values (
        new_item_id,
        src->>'source',
        src->>'url',
        nullif(src->>'published_at', '')::timestamptz,
        src->>'title',
        src->>'snippet'
      );
    end loop;
  end loop;

  return new_id;
end;
$$;

revoke execute on function create_analysis_set(jsonb) from public;
revoke execute on function create_analysis_set(jsonb) from anon;
revoke execute on function create_analysis_set(jsonb) from authenticated;
grant execute on function create_analysis_set(jsonb) to service_role;
