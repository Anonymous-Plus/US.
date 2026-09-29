-- Banco do US. Executar no Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists rooms(
  code text primary key check (length(code)=12),
  state jsonb not null,
  revision bigint not null default 1,
  created_at timestamptz not null default now()
);
create table if not exists room_members(
  room_code text references rooms(code) on delete cascade,
  slot smallint check (slot in (0,1)), name text not null,
  session_token text unique not null, joined_at timestamptz not null default now(),
  primary key(room_code,slot)
);
create table if not exists room_missions(
  id bigint, room_code text references rooms(code) on delete cascade,
  title text not null, xp integer not null check (xp>0), done boolean not null default false,
  created_at timestamptz not null default now(), primary key(room_code,id)
);
create table if not exists xp_events(
  id bigint generated always as identity primary key,
  room_code text references rooms(code) on delete cascade,
  member_slot smallint check (member_slot in (0,1)), amount integer not null check (amount>0),
  reason text not null, kind text not null, created_at timestamptz not null default now()
);

alter table rooms enable row level security;
alter table room_members enable row level security;
alter table room_missions enable row level security;
alter table xp_events enable row level security;
revoke all on all tables in schema public from anon, authenticated;

create or replace function create_space(p_code text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_token text:=encode(gen_random_bytes(24),'hex'); v_name text:=coalesce(p_data->'users'->0->>'name','Pessoa 01');
begin
  insert into rooms(code,state) values(p_code,p_data);
  insert into room_members(room_code,slot,name,session_token) values(p_code,0,v_name,v_token);
  insert into room_missions(id,room_code,title,xp,done)
    select (m->>'id')::bigint,p_code,m->>'title',(m->>'xp')::integer,coalesce((m->>'done')::boolean,false)
    from jsonb_array_elements(coalesce(p_data->'missions','[]'::jsonb)) m;
  return jsonb_build_object('ok',true,'token',v_token,'rev',1);
exception when unique_violation then return jsonb_build_object('ok',false); end $$;

create or replace function find_space(p_code text) returns table(data jsonb,rev bigint)
language sql security definer set search_path=public as $$ select state,revision from rooms where code=p_code $$;

create or replace function join_space(p_code text,p_me smallint) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_token text:=encode(gen_random_bytes(24),'hex'); v_state jsonb; v_rev bigint; v_name text;
begin
  if p_me not in (0,1) then raise exception 'invalid member'; end if;
  select state,revision into v_state,v_rev from rooms where code=p_code for update;
  if not found then raise exception 'room not found'; end if;
  v_name:=coalesce(v_state->'users'->p_me->>'name','Pessoa 02');
  insert into room_members(room_code,slot,name,session_token) values(p_code,p_me,v_name,v_token)
    on conflict(room_code,slot) do update set session_token=excluded.session_token;
  return jsonb_build_object('token',v_token,'rev',v_rev,'data',v_state);
end $$;

create or replace function get_space(p_code text,p_token text,p_rev bigint) returns table(data jsonb,rev bigint)
language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from room_members where room_code=p_code and session_token=p_token) then raise exception 'unauthorized'; end if;
  return query select case when revision=p_rev then null else state end,revision from rooms where code=p_code;
end $$;

create or replace function save_space(p_code text,p_token text,p_rev bigint,p_data jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_new bigint;
begin
  if not exists(select 1 from room_members where room_code=p_code and session_token=p_token) then raise exception 'unauthorized'; end if;
  update rooms set state=p_data,revision=revision+1 where code=p_code and revision=p_rev returning revision into v_new;
  if v_new is null then return jsonb_build_object('conflict',true); end if;
  delete from room_missions where room_code=p_code;
  insert into room_missions(id,room_code,title,xp,done)
    select (m->>'id')::bigint,p_code,m->>'title',(m->>'xp')::integer,coalesce((m->>'done')::boolean,false)
    from jsonb_array_elements(coalesce(p_data->'missions','[]'::jsonb)) m;
  delete from xp_events where room_code=p_code;
  insert into xp_events(room_code,member_slot,amount,reason,kind,created_at)
    select p_code,(h->>'uid')::smallint,(h->>'amt')::integer,coalesce(h->>'reason',''),coalesce(h->>'kind','gift'),to_timestamp((h->>'t')::double precision/1000)
    from jsonb_array_elements(coalesce(p_data->'history','[]'::jsonb)) h
    where (h->>'uid') is not null and (h->>'amt') is not null;
  return jsonb_build_object('rev',v_new);
end $$;

grant execute on function create_space(text,jsonb),find_space(text),join_space(text,smallint),get_space(text,text,bigint),save_space(text,text,bigint,jsonb) to anon;
