import { UserRole } from "./roles";

export interface SessionUser {
  userId: number;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  crewMemberId: number | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: SessionUser;
}

export interface ApiError {
  error: string;
  message: string;
}

// Helicopter types (HELI-01, HELI-02, HELI-03)
export interface Helicopter {
  id: number;
  registration_number: string;
  type: string;
  description: string | null;
  max_crew_count: number;
  max_crew_payload_kg: number;
  status: 0 | 1;
  inspection_expiry_date: string | null;
  range_km: number;
  created_at: string;
  updated_at: string;
}

export interface CreateHelicopterRequest {
  registration_number: string;
  type: string;
  description?: string;
  max_crew_count: number;
  max_crew_payload_kg: number;
  status: 0 | 1;
  inspection_expiry_date?: string | null;
  range_km: number;
}

export type UpdateHelicopterRequest = Partial<Omit<CreateHelicopterRequest, never>>;

// Crew member types (CREW-01, CREW-02, CREW-03, CREW-04)
export interface CrewMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  weight_kg: number;
  role: string;
  pilot_license_number: string | null;
  license_expiry_date: string | null;
  training_expiry_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCrewMemberRequest {
  first_name: string;
  last_name: string;
  email: string;
  weight_kg: number;
  role: string;
  pilot_license_number?: string | null;
  license_expiry_date?: string | null;
  training_expiry_date: string;
}

// Airfield types (LAND-01, LAND-02, LAND-03)
export interface Airfield {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAirfieldRequest {
  name: string;
  latitude: number;
  longitude: number;
}

// System user types (USR-01, USR-02, USR-03)
export interface SystemUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  crew_member_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSystemUserRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: string;
  crew_member_id?: number | null;
}

// Operation types dictionary entry (DB row)
export interface OperationTypeRow {
  id: number;
  name: string;
}

// Planned operation contact person
export interface OperationContactPerson {
  id: number;
  operation_id: number;
  email: string;
}

// Planned operation comment
export interface OperationComment {
  id: number;
  operation_id: number;
  user_id: number;
  author_email: string;
  author_name: string;
  comment_text: string;
  created_at: string;
}

// Operation history entry
export interface OperationHistory {
  id: number;
  operation_id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

// KML route point
export interface KmlPoint {
  lat: number;
  lng: number;
}

// Planned operation (full row with joined data)
export interface PlannedOperation {
  id: number;
  operation_number: string; // formatted as YYYY-NNNN
  project_reference: string;
  short_description: string;
  kml_file_path: string;
  kml_points_json: KmlPoint[] | null;
  route_distance_km: number | null;
  proposed_earliest_date: string | null;
  proposed_latest_date: string | null;
  planned_earliest_date: string | null;
  planned_latest_date: string | null;
  additional_info: string | null;
  post_completion_notes: string | null;
  status: number;
  created_by_user_id: number;
  created_by_email: string;
  created_at: string;
  updated_at: string;
  // joined arrays
  operation_types: string[];
  contact_persons: string[];
}

export interface CreateOperationRequest {
  project_reference: string;
  short_description: string;
  operation_type_ids: number[];
  proposed_earliest_date?: string | null;
  proposed_latest_date?: string | null;
  additional_info?: string | null;
  contact_emails?: string[];
  // kml file sent as multipart
}

export interface UpdateOperationRequest {
  project_reference?: string;
  short_description?: string;
  operation_type_ids?: number[];
  proposed_earliest_date?: string | null;
  proposed_latest_date?: string | null;
  planned_earliest_date?: string | null;
  planned_latest_date?: string | null;
  additional_info?: string | null;
  post_completion_notes?: string | null;
  contact_emails?: string[];
  // kml file optionally sent as multipart
}

// Flight order types (FLT-01 through FLT-11)
export interface FlightOrder {
  id: number;
  order_number: string; // formatted as YYYY-NNNN
  planned_start_datetime: string;
  planned_end_datetime: string;
  actual_start_datetime: string | null;
  actual_end_datetime: string | null;
  pilot_user_id: number;
  pilot_name: string;
  pilot_email: string;
  helicopter_id: number;
  helicopter_registration: string;
  helicopter_type: string;
  start_airfield_id: number;
  start_airfield_name: string;
  end_airfield_id: number;
  end_airfield_name: string;
  crew_total_weight_kg: number | null;
  estimated_route_length_km: number | null;
  status: number;
  created_at: string;
  updated_at: string;
  // joined arrays
  crew_members: FlightOrderCrewMember[];
  operations: FlightOrderOperation[];
}

export interface FlightOrderCrewMember {
  crew_member_id: number;
  first_name: string;
  last_name: string;
  email: string;
  weight_kg: number;
  role: string;
  training_expiry_date: string;
}

export interface FlightOrderOperation {
  operation_id: number;
  operation_number: string;
  short_description: string;
  route_distance_km: number | null;
  status: number;
}

export interface CreateFlightOrderRequest {
  planned_start_datetime: string;
  planned_end_datetime: string;
  helicopter_id: number;
  start_airfield_id: number;
  end_airfield_id: number;
  crew_member_ids: number[];
  operation_ids: number[];
}

export interface UpdateFlightOrderRequest {
  planned_start_datetime?: string;
  planned_end_datetime?: string;
  helicopter_id?: number;
  start_airfield_id?: number;
  end_airfield_id?: number;
  crew_member_ids?: number[];
  operation_ids?: number[];
  actual_start_datetime?: string | null;
  actual_end_datetime?: string | null;
}

export interface FlightOrderValidationWarning {
  rule: string;
  message: string;
}
