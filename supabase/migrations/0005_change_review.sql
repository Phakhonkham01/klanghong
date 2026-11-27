  -- 0005 · Committee can change a reviewed transfer slip's status:
  --   approved → pending | rejected, rejected → pending | approved (plus the usual pending → reviewed).
  -- Cash payments stay approved (payments_cash_approved). Re-opening clears the review fields.

  create or replace function public.payments_before_update()
  returns trigger language plpgsql security definer set search_path = ''
  as $$
  declare
    caller uuid := auth.uid();
  begin
    if caller is null then
      return new; -- service role
    end if;
    if not public.is_committee() then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    if new.status not in ('pending', 'approved', 'rejected') or new.status = old.status then
      raise exception 'invalid_status' using errcode = 'P0001';
    end if;
    if old.source = 'cash' then
      raise exception 'cash_locked' using errcode = 'P0001';
    end if;
    if (new.student_id, new.week_start, new.amount, new.source, new.slip_path, new.slip_sha256,
        new.transfer_ref, new.note, new.created_at)
      is distinct from
      (old.student_id, old.week_start, old.amount, old.source, old.slip_path, old.slip_sha256,
        old.transfer_ref, old.note, old.created_at) then
      raise exception 'immutable_fields' using errcode = '42501';
    end if;

    -- Nobody reviews their own slip, unless they are the only committee member.
    if old.student_id = caller then
      if (select count(*) from public.profiles where role = 'committee' and is_active) > 1 then
        raise exception 'self_review' using errcode = '42501';
      end if;
    end if;

    if new.status = 'pending' then
      new.reject_reason := null;
      new.reviewed_by := null;
      new.reviewed_at := null;
      new.self_reviewed := false;
      return new;
    end if;

    new.reviewed_by := caller;
    new.reviewed_at := now();
    new.self_reviewed := (old.student_id = caller);
    if new.status = 'approved' then
      new.reject_reason := null;
    end if;
    return new;
  end
  $$;

  create or replace function public.audit_payments()
  returns trigger language plpgsql security definer set search_path = ''
  as $$
  begin
    if tg_op = 'INSERT' and new.source = 'cash' then
      insert into public.audit_log (actor_id, action, entity, entity_id, meta)
      values (auth.uid(), 'cash_payment', 'payment', new.id::text,
              jsonb_build_object('student_id', new.student_id, 'week_start', new.week_start, 'amount', new.amount));
    elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
      insert into public.audit_log (actor_id, action, entity, entity_id, meta)
      values (auth.uid(),
              case new.status when 'approved' then 'approve' when 'rejected' then 'reject' else 'reopen' end,
              'payment', new.id::text,
              jsonb_build_object('student_id', new.student_id, 'week_start', new.week_start,
                                'from', old.status, 'reason', new.reject_reason,
                                'self_reviewed', new.self_reviewed));
    end if;
    return null;
  end
  $$;
