export type ExecutionStep = "checkin" | "checklist" | "photos" | "sign" | "checkout";

export interface ScheduleTaskRow {
  id: string;
  title: string;
  status: string;
  service_type: string;
  scheduled_date: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  description: string | null;
  address: {
    street: string;
    house_number: string | null;
    postal_code: string | null;
    city: string;
    latitude: number | null;
    longitude: number | null;
    access_notes: string | null;
    client: { name: string } | Array<{ name: string }> | null;
  } | Array<{
    street: string;
    house_number: string | null;
    postal_code: string | null;
    city: string;
    latitude: number | null;
    longitude: number | null;
    access_notes: string | null;
    client: { name: string } | Array<{ name: string }> | null;
  }> | null;
}

export interface ChecklistItemRow {
  id: string;
  text: string;
  is_checked: boolean;
  sort_order: number;
}

export interface TaskPhotoRow {
  id: string;
  photo_type: string;
  storage_path: string;
  file_name: string | null;
  signedUrl?: string | null;
}

export interface ServiceReportRow {
  id: string;
  status: string;
  client_name: string | null;
  signed_at: string | null;
  generated_at: string | null;
  storage_path: string | null;
  signedReportUrl?: string | null;
}

export interface ExecutionContext {
  task: ScheduleTaskRow;
  checklist: ChecklistItemRow[];
  photos: TaskPhotoRow[];
  openCheckIn: {
    id: string;
    check_in_at: string;
    check_in_notes: string | null;
  } | null;
  serviceReport: ServiceReportRow | null;
  isAssigned: boolean;
}
