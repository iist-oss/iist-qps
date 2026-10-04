create or replace function public.admin_apply_edit(
  p_id bigint, p_course_code text, p_course_name text, p_year integer,
  p_exam text, p_semester text, p_note text, p_approve boolean,
  p_file_path text, p_admin uuid, p_replace bigint[] default '{}'
) returns public.papers
language plpgsql security definer set search_path = public as $$
declare r public.papers;
begin
  update public.papers set
    course_code = p_course_code, course_name = p_course_name, year = p_year,
    exam = p_exam, semester = p_semester, note = p_note,
    approve_status = p_approve, file_path = p_file_path,
    approved_by = case when p_approve then p_admin else null end
  where id = p_id and not is_deleted
  returning * into r;

  if not found then
    raise exception 'Paper % not found or deleted', p_id using errcode = 'P0002';
  end if;

  if coalesce(cardinality(p_replace), 0) > 0 then
    update public.papers set approve_status = false, is_deleted = true
    where id = any(p_replace) and id <> p_id;
  end if;
  return r;
end $$;

revoke all on function public.admin_apply_edit(bigint,text,text,integer,text,text,text,boolean,text,uuid,bigint[])
  from public, anon, authenticated;
grant execute on function public.admin_apply_edit(bigint,text,text,integer,text,text,text,boolean,text,uuid,bigint[])
  to service_role;
