-- Must run in its own migration (enum value cannot be used until committed)
ALTER TYPE public.member_role ADD VALUE IF NOT EXISTS 'manager';
