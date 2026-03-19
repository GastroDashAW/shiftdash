// ─── Shared domain types used across ShiftDash ───

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  employee_type: 'fixed' | 'hourly';
  weekly_hours: number | null;
  monthly_salary: number | null;
  hourly_rate: number | null;
  vacation_days_per_year: number | null;
  vacation_surcharge_percent: number | null;
  holiday_surcharge_percent: number | null;
  cost_center: string;
  position: string;
  pensum_percent: number | null;
  available_days: string[] | null;
  allowed_shift_types: string[] | null;
  group_id: string | null;
  user_id: string | null;
  is_active: boolean | null;
  overtime_balance_hours: number | null;
}

export interface ShiftType {
  id: string;
  name: string;
  short_code: string;
  color: string;
  start_time: string | null;
  end_time: string | null;
  cost_center: string;
  sort_order: number;
  break_minutes: number | null;
}

export interface Assignment {
  id: string;
  employee_id: string;
  date: string;
  shift_type_id: string;
}

export interface ScheduleEvent {
  id: string;
  date: string;
  label: string;
}

export interface TimeEntry {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  adjusted_clock_in: string | null;
  adjusted_clock_out: string | null;
  break_minutes: number | null;
  effective_hours: number | null;
  absence_type: string | null;
  absence_hours: number | null;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  requires_overtime_approval: boolean | null;
}

export interface BusinessSettings {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  contact_person: string | null;
  closed_days: number[] | null;
  auto_sync_schedule: boolean | null;
  social_charges_percent: number | null;
  opening_days: string | null;
  opening_hours: string | null;
  shifts_per_day: Record<string, number> | null;
  url: string | null;
  vat_number: string | null;
}

export interface MonthlySummary {
  id: string;
  employee_id: string;
  year: number;
  month: number;
  total_worked_hours: number | null;
  target_hours: number | null;
  overtime_hours: number | null;
  overtime_balance: number | null;
  vacation_days_used: number | null;
  sick_days: number | null;
  accident_days: number | null;
  is_approved: boolean | null;
  approved_at: string | null;
  approved_by: string | null;
}

export interface MonthlyBudget {
  id: string;
  year: number;
  month: number;
  total_revenue: number;
  distribution_mode: string;
  day_weights: Record<string, number> | null;
}

export interface DailyRevenue {
  id: string;
  date: string;
  revenue_gross: number;
  vat_rate: number;
}
