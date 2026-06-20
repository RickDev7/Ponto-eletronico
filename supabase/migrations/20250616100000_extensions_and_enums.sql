-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Enums
CREATE TYPE public.member_role AS ENUM ('admin', 'supervisor', 'employee');
CREATE TYPE public.member_status AS ENUM ('active', 'invited', 'suspended');
CREATE TYPE public.service_type AS ENUM (
  'treppenhausreinigung',
  'gartenpflege',
  'winterdienst',
  'glasreinigung'
);
CREATE TYPE public.task_status AS ENUM (
  'draft',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
);
CREATE TYPE public.task_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE public.photo_type AS ENUM ('before', 'after');
CREATE TYPE public.activity_action AS ENUM (
  'created',
  'updated',
  'deleted',
  'assigned',
  'check_in',
  'check_out',
  'photo_uploaded',
  'status_changed',
  'report_generated'
);
CREATE TYPE public.report_type AS ENUM (
  'daily',
  'weekly',
  'monthly',
  'client',
  'employee',
  'custom'
);
CREATE TYPE public.client_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE public.employee_status AS ENUM ('active', 'inactive', 'terminated');
