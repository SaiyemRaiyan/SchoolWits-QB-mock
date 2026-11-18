-- Modules: topic packs sold (or given away) as a bundle of questions.
-- The old IndexedDB record stored `questionUids: string[]` (composite
-- "paperKey::id" strings) directly on the module. That becomes a real
-- join table here with proper foreign keys instead of a loosely-typed
-- array of string references.
create table public.modules (
  id           bigint generated always as identity primary key,
  title        text not null,
  topic        text not null default '',        -- free text, or literal "Mixed topics" — matches today's app logic
  description  text not null default '',
  premium      boolean not null default false,   -- doubles as "is not free" — there is no separate free flag, matching the app today
  price        numeric(10,2) not null default 0,
  currency     text not null default '৳',        -- hardcoded literal in the app today; kept as a column (not baked into app code)
                                                   -- so supporting a second currency later is a data change, not a migration
  created_at   timestamptz not null default now(),

  constraint modules_price_nonnegative check (price >= 0),
  constraint modules_price_zero_if_free check (premium or price = 0)
);

-- Replaces modules.questionUids. sort_order preserves the pick order from
-- the module-builder UI (today's array order).
create table public.module_questions (
  module_id    bigint not null references public.modules(id)   on delete cascade,
  question_id  bigint not null references public.questions(id) on delete cascade,
  sort_order   integer not null default 0,
  primary key (module_id, question_id)
);

create index module_questions_question_id_idx on public.module_questions (question_id);

comment on table public.modules is
  'Topic packs. premium=false doubles as the "free" flag and forces price=0, mirroring the current app exactly. No purchases/pricing enforcement yet — checkout stays a localStorage mock (see backend/CLAUDE.md).';
comment on table public.module_questions is
  'Join table replacing the old modules.questionUids array; sort_order preserves original pick order.';
