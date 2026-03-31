-- AERO Database Schema
-- Complete schema for all 4 phases (D-13)
-- Created: Phase 01-02

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum type for user roles (must match shared/src/roles.ts UserRole exactly)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('superadmin', 'administrator', 'planner', 'supervisor', 'pilot');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add superadmin to existing enum if it doesn't exist
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin' BEFORE 'administrator';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- role_permissions (dynamic permission matrix)
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role user_role NOT NULL,
  section VARCHAR(50) NOT NULL,
  level VARCHAR(20) NOT NULL DEFAULT 'NONE',
  UNIQUE(role, section)
);

-- Sequences for auto-numbering
CREATE SEQUENCE IF NOT EXISTS operation_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- crew_members (no FK deps)
CREATE TABLE IF NOT EXISTS crew_members (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  weight_kg INTEGER NOT NULL CHECK (weight_kg BETWEEN 30 AND 200),
  role VARCHAR(50) NOT NULL,
  pilot_license_number VARCHAR(30),
  license_expiry_date DATE,
  training_expiry_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- users (FK to crew_members)
-- crew_member_id is nullable FK; when role = 'pilot', must be non-null (app-layer enforcement per D-15/AUTH-04)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  crew_member_id INTEGER REFERENCES crew_members(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- session table for connect-pg-simple
CREATE TABLE IF NOT EXISTS "session" (
  "sid" VARCHAR NOT NULL COLLATE "default",
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- helicopters
-- status: 1 = active, 0 = inactive; inspection_expiry_date required when status = 1 (app-layer)
CREATE TABLE IF NOT EXISTS helicopters (
  id SERIAL PRIMARY KEY,
  registration_number VARCHAR(30) NOT NULL UNIQUE,
  type VARCHAR(100) NOT NULL,
  description VARCHAR(100),
  max_crew_count INTEGER NOT NULL CHECK (max_crew_count BETWEEN 1 AND 10),
  max_crew_payload_kg INTEGER NOT NULL CHECK (max_crew_payload_kg BETWEEN 1 AND 1000),
  status SMALLINT NOT NULL DEFAULT 1,
  inspection_expiry_date DATE,
  range_km INTEGER NOT NULL CHECK (range_km BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- airfields
CREATE TABLE IF NOT EXISTS airfields (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- operation_types dictionary
CREATE TABLE IF NOT EXISTS operation_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

-- planned_operations
-- status is smallint matching OperationStatus enum (1-7) per shared/src/statuses.ts
CREATE TABLE IF NOT EXISTS planned_operations (
  id SERIAL PRIMARY KEY,
  operation_number INTEGER NOT NULL DEFAULT nextval('operation_number_seq'),
  project_reference VARCHAR(30) NOT NULL,
  short_description VARCHAR(100) NOT NULL,
  kml_file_path VARCHAR(500) NOT NULL,
  kml_points_json JSONB,
  route_distance_km DOUBLE PRECISION,
  proposed_earliest_date DATE,
  proposed_latest_date DATE,
  planned_earliest_date DATE,
  planned_latest_date DATE,
  additional_info VARCHAR(500),
  post_completion_notes VARCHAR(500),
  status SMALLINT NOT NULL DEFAULT 1,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- planned_operation_types (many-to-many join)
CREATE TABLE IF NOT EXISTS planned_operation_types (
  operation_id INTEGER NOT NULL REFERENCES planned_operations(id) ON DELETE CASCADE,
  operation_type_id INTEGER NOT NULL REFERENCES operation_types(id),
  PRIMARY KEY (operation_id, operation_type_id)
);

-- operation_contact_persons
CREATE TABLE IF NOT EXISTS operation_contact_persons (
  id SERIAL PRIMARY KEY,
  operation_id INTEGER NOT NULL REFERENCES planned_operations(id) ON DELETE CASCADE,
  email VARCHAR(100) NOT NULL
);

-- operation_comments
CREATE TABLE IF NOT EXISTS operation_comments (
  id SERIAL PRIMARY KEY,
  operation_id INTEGER NOT NULL REFERENCES planned_operations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  comment_text VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- operation_history
CREATE TABLE IF NOT EXISTS operation_history (
  id SERIAL PRIMARY KEY,
  operation_id INTEGER NOT NULL REFERENCES planned_operations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- flight_orders
-- status is smallint matching FlightOrderStatus enum (1-7) per shared/src/statuses.ts
CREATE TABLE IF NOT EXISTS flight_orders (
  id SERIAL PRIMARY KEY,
  order_number INTEGER NOT NULL DEFAULT nextval('order_number_seq'),
  planned_start_datetime TIMESTAMPTZ NOT NULL,
  planned_end_datetime TIMESTAMPTZ NOT NULL,
  actual_start_datetime TIMESTAMPTZ,
  actual_end_datetime TIMESTAMPTZ,
  pilot_user_id INTEGER NOT NULL REFERENCES users(id),
  helicopter_id INTEGER NOT NULL REFERENCES helicopters(id),
  start_airfield_id INTEGER NOT NULL REFERENCES airfields(id),
  end_airfield_id INTEGER NOT NULL REFERENCES airfields(id),
  crew_total_weight_kg INTEGER,
  estimated_route_length_km DOUBLE PRECISION,
  status SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- flight_order_crew_members (many-to-many join)
CREATE TABLE IF NOT EXISTS flight_order_crew_members (
  flight_order_id INTEGER NOT NULL REFERENCES flight_orders(id) ON DELETE CASCADE,
  crew_member_id INTEGER NOT NULL REFERENCES crew_members(id),
  PRIMARY KEY (flight_order_id, crew_member_id)
);

-- flight_order_operations (many-to-many join)
CREATE TABLE IF NOT EXISTS flight_order_operations (
  flight_order_id INTEGER NOT NULL REFERENCES flight_orders(id) ON DELETE CASCADE,
  operation_id INTEGER NOT NULL REFERENCES planned_operations(id),
  PRIMARY KEY (flight_order_id, operation_id)
);

-- crew_roles dictionary (for crew member roles like Pilot, Obserwator, etc.)
CREATE TABLE IF NOT EXISTS crew_roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);
