-- Phase 13: rate-limit + plausibility guard untuk grant_rewards
-- Mencegah spam grant (anti-cheat): max 20 transaksi/menit per user

create or replace function public.grant_rewards(
  p_xp bigint default 0,
  p_credits bigint default 0,
  p_reason text default 'quest_reward',
  p_ref_type text default null,
  p_ref_id uuid default null,
  p_idem text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_wallet record;
  v_level int;
  v_recent int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_xp < 0 or p_xp > 500 or p_credits < -10000 or p_credits > 10000 then
    raise exception 'nilai tidak wajar';
  end if;

  -- rate-limit: 20 grant/menit
  select count(*) into v_recent from public.wallet_transactions
  where user_id = v_uid and created_at > now() - interval '1 minute';
  if v_recent >= 20 then
    raise exception 'terlalu banyak permintaan, coba lagi sebentar';
  end if;

  select * into v_wallet from public.wallets where user_id = v_uid for update;

  if p_credits <> 0 then
    update public.wallets
       set credits = credits + p_credits,
           version = version + 1,
           updated_at = now()
     where user_id = v_uid
     returning credits into v_wallet.credits;
    insert into public.wallet_transactions
      (user_id, currency, amount, balance_after, reason, ref_type, ref_id, idempotency_key)
    values
      (v_uid, 'credits', p_credits, v_wallet.credits, p_reason, p_ref_type, p_ref_id, p_idem)
    on conflict (idempotency_key) do nothing;
  end if;

  if p_xp > 0 then
    update public.character_state
       set xp = xp + p_xp,
           level = coalesce((
             select max(level) from public.levels l
              where l.xp_required <= (character_state.xp + p_xp)
           ), 1),
           updated_at = now()
     where user_id = v_uid
     returning level into v_level;
  else
    select level into v_level from public.character_state where user_id = v_uid;
  end if;

  return jsonb_build_object('credits', v_wallet.credits, 'xp_granted', p_xp, 'level', v_level);
end $$;
