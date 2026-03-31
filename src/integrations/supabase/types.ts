export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      business_settings: {
        Row: {
          address: string | null
          auto_sync_schedule: boolean | null
          closed_days: Json | null
          contact_person: string | null
          created_at: string
          id: string
          name: string
          opening_days: string | null
          opening_hours: string | null
          phone: string | null
          push_reminders_enabled: boolean | null
          reminder_minutes_before: number | null
          shifts_per_day: Json | null
          social_charges_percent: number | null
          updated_at: string
          url: string | null
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          auto_sync_schedule?: boolean | null
          closed_days?: Json | null
          contact_person?: string | null
          created_at?: string
          id?: string
          name?: string
          opening_days?: string | null
          opening_hours?: string | null
          phone?: string | null
          push_reminders_enabled?: boolean | null
          reminder_minutes_before?: number | null
          shifts_per_day?: Json | null
          social_charges_percent?: number | null
          updated_at?: string
          url?: string | null
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          auto_sync_schedule?: boolean | null
          closed_days?: Json | null
          contact_person?: string | null
          created_at?: string
          id?: string
          name?: string
          opening_days?: string | null
          opening_hours?: string | null
          phone?: string | null
          push_reminders_enabled?: boolean | null
          reminder_minutes_before?: number | null
          shifts_per_day?: Json | null
          social_charges_percent?: number | null
          updated_at?: string
          url?: string | null
          vat_number?: string | null
        }
        Relationships: []
      }
      daily_revenues: {
        Row: {
          created_at: string
          date: string
          id: string
          revenue_gross: number
          updated_at: string
          vat_rate: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          revenue_gross?: number
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          revenue_gross?: number
          updated_at?: string
          vat_rate?: number
        }
        Relationships: []
      }
      employee_groups: {
        Row: {
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          allowed_shift_types: Json | null
          available_days: Json | null
          cost_center: string
          created_at: string
          employee_type: Database["public"]["Enums"]["employee_type"]
          first_name: string
          group_id: string | null
          holiday_surcharge_percent: number | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          last_name: string
          monthly_salary: number | null
          overtime_balance_hours: number | null
          pensum_percent: number | null
          position: string
          updated_at: string
          user_id: string | null
          vacation_days_per_year: number | null
          vacation_surcharge_percent: number | null
          weekly_hours: number | null
        }
        Insert: {
          allowed_shift_types?: Json | null
          available_days?: Json | null
          cost_center?: string
          created_at?: string
          employee_type?: Database["public"]["Enums"]["employee_type"]
          first_name: string
          group_id?: string | null
          holiday_surcharge_percent?: number | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          last_name: string
          monthly_salary?: number | null
          overtime_balance_hours?: number | null
          pensum_percent?: number | null
          position?: string
          updated_at?: string
          user_id?: string | null
          vacation_days_per_year?: number | null
          vacation_surcharge_percent?: number | null
          weekly_hours?: number | null
        }
        Update: {
          allowed_shift_types?: Json | null
          available_days?: Json | null
          cost_center?: string
          created_at?: string
          employee_type?: Database["public"]["Enums"]["employee_type"]
          first_name?: string
          group_id?: string | null
          holiday_surcharge_percent?: number | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          last_name?: string
          monthly_salary?: number | null
          overtime_balance_hours?: number | null
          pensum_percent?: number | null
          position?: string
          updated_at?: string
          user_id?: string | null
          vacation_days_per_year?: number | null
          vacation_surcharge_percent?: number | null
          weekly_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "employee_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          created_at: string
          description: string | null
          employee_type: Database["public"]["Enums"]["employee_type"]
          file_path: string
          id: string
          name: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          employee_type?: Database["public"]["Enums"]["employee_type"]
          file_path: string
          id?: string
          name: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          employee_type?: Database["public"]["Enums"]["employee_type"]
          file_path?: string
          id?: string
          name?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      gav_rules: {
        Row: {
          created_at: string
          group_id: string
          holidays_per_year: number
          id: string
          max_daily_hours: number
          max_weekly_hours: number
          night_surcharge_pct: number
          notes: string | null
          overtime_threshold: number | null
          sunday_surcharge_pct: number
          updated_at: string
          vacation_weeks: number
          weekly_hours: number
        }
        Insert: {
          created_at?: string
          group_id: string
          holidays_per_year?: number
          id?: string
          max_daily_hours?: number
          max_weekly_hours?: number
          night_surcharge_pct?: number
          notes?: string | null
          overtime_threshold?: number | null
          sunday_surcharge_pct?: number
          updated_at?: string
          vacation_weeks?: number
          weekly_hours?: number
        }
        Update: {
          created_at?: string
          group_id?: string
          holidays_per_year?: number
          id?: string
          max_daily_hours?: number
          max_weekly_hours?: number
          night_surcharge_pct?: number
          notes?: string | null
          overtime_threshold?: number | null
          sunday_surcharge_pct?: number
          updated_at?: string
          vacation_weeks?: number
          weekly_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "gav_rules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "employee_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          days_count: number
          employee_id: string
          end_date: string
          id: string
          request_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          days_count?: number
          employee_id: string
          end_date: string
          id?: string
          request_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          days_count?: number
          employee_id?: string
          end_date?: string
          id?: string
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_budgets: {
        Row: {
          created_at: string
          day_weights: Json | null
          distribution_mode: string
          id: string
          month: number
          total_revenue: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          day_weights?: Json | null
          distribution_mode?: string
          id?: string
          month: number
          total_revenue?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          day_weights?: Json | null
          distribution_mode?: string
          id?: string
          month?: number
          total_revenue?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      monthly_summaries: {
        Row: {
          accident_days: number | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          employee_id: string
          id: string
          is_approved: boolean | null
          month: number
          overtime_balance: number | null
          overtime_hours: number | null
          sick_days: number | null
          target_hours: number | null
          total_worked_hours: number | null
          updated_at: string
          vacation_days_used: number | null
          year: number
        }
        Insert: {
          accident_days?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id: string
          id?: string
          is_approved?: boolean | null
          month: number
          overtime_balance?: number | null
          overtime_hours?: number | null
          sick_days?: number | null
          target_hours?: number | null
          total_worked_hours?: number | null
          updated_at?: string
          vacation_days_used?: number | null
          year: number
        }
        Update: {
          accident_days?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          is_approved?: boolean | null
          month?: number
          overtime_balance?: number | null
          overtime_hours?: number | null
          sick_days?: number | null
          target_hours?: number | null
          total_worked_hours?: number | null
          updated_at?: string
          vacation_days_used?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_summaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_summaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_log: {
        Row: {
          body: string | null
          employee_id: string
          id: string
          notification_type: string
          sent_at: string
          status: string
          title: string
        }
        Insert: {
          body?: string | null
          employee_id: string
          id?: string
          notification_type: string
          sent_at?: string
          status?: string
          title: string
        }
        Update: {
          body?: string | null
          employee_id?: string
          id?: string
          notification_type?: string
          sent_at?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_verifications: {
        Row: {
          actual_clock_out: string
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          overtime_minutes: number
          reviewed_at: string | null
          reviewed_by: string | null
          scheduled_end_time: string
          status: string
          time_entry_id: string
        }
        Insert: {
          actual_clock_out: string
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          overtime_minutes?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_end_time: string
          status?: string
          time_entry_id: string
        }
        Update: {
          actual_clock_out?: string
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          overtime_minutes?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_end_time?: string
          status?: string
          time_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_verifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_verifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_verifications_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          subscription: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          subscription: Json
          user_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          subscription?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_archives: {
        Row: {
          assignments: Json
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          name: string
          start_date: string
        }
        Insert: {
          assignments?: Json
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          name: string
          start_date: string
        }
        Update: {
          assignments?: Json
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      schedule_assignments: {
        Row: {
          created_at: string
          date: string
          employee_id: string
          id: string
          shift_type_id: string
        }
        Insert: {
          created_at?: string
          date: string
          employee_id: string
          id?: string
          shift_type_id: string
        }
        Update: {
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          shift_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_assignments_shift_type_id_fkey"
            columns: ["shift_type_id"]
            isOneToOne: false
            referencedRelation: "shift_types"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_events: {
        Row: {
          created_at: string
          date: string
          id: string
          label: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          label?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      shift_plan_config: {
        Row: {
          day_of_week: number
          id: string
          required_count: number
          shift_type_id: string
        }
        Insert: {
          day_of_week: number
          id?: string
          required_count?: number
          shift_type_id: string
        }
        Update: {
          day_of_week?: number
          id?: string
          required_count?: number
          shift_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_plan_config_shift_type_id_fkey"
            columns: ["shift_type_id"]
            isOneToOne: false
            referencedRelation: "shift_types"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_types: {
        Row: {
          break_minutes: number | null
          color: string
          cost_center: string
          created_at: string
          end_time: string | null
          id: string
          name: string
          short_code: string
          sort_order: number
          start_time: string | null
        }
        Insert: {
          break_minutes?: number | null
          color?: string
          cost_center?: string
          created_at?: string
          end_time?: string | null
          id?: string
          name: string
          short_code: string
          sort_order?: number
          start_time?: string | null
        }
        Update: {
          break_minutes?: number | null
          color?: string
          cost_center?: string
          created_at?: string
          end_time?: string | null
          id?: string
          name?: string
          short_code?: string
          sort_order?: number
          start_time?: string | null
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          absence_hours: number | null
          absence_type: Database["public"]["Enums"]["absence_type"] | null
          adjusted_clock_in: string | null
          adjusted_clock_out: string | null
          break_minutes: number | null
          clock_in: string | null
          clock_out: string | null
          created_at: string
          date: string
          effective_hours: number | null
          employee_id: string
          id: string
          notes: string | null
          requires_overtime_approval: boolean | null
          status: Database["public"]["Enums"]["entry_status"] | null
          updated_at: string
        }
        Insert: {
          absence_hours?: number | null
          absence_type?: Database["public"]["Enums"]["absence_type"] | null
          adjusted_clock_in?: string | null
          adjusted_clock_out?: string | null
          break_minutes?: number | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date: string
          effective_hours?: number | null
          employee_id: string
          id?: string
          notes?: string | null
          requires_overtime_approval?: boolean | null
          status?: Database["public"]["Enums"]["entry_status"] | null
          updated_at?: string
        }
        Update: {
          absence_hours?: number | null
          absence_type?: Database["public"]["Enums"]["absence_type"] | null
          adjusted_clock_in?: string | null
          adjusted_clock_out?: string | null
          break_minutes?: number | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          effective_hours?: number | null
          employee_id?: string
          id?: string
          notes?: string | null
          requires_overtime_approval?: boolean | null
          status?: Database["public"]["Enums"]["entry_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entry_audit_log: {
        Row: {
          change_type: string
          changed_by: string
          created_at: string
          employee_id: string
          id: string
          new_values: Json | null
          old_values: Json | null
          reason: string | null
          time_entry_id: string
        }
        Insert: {
          change_type: string
          changed_by: string
          created_at?: string
          employee_id: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          time_entry_id: string
        }
        Update: {
          change_type?: string
          changed_by?: string
          created_at?: string
          employee_id?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          time_entry_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      employees_directory: {
        Row: {
          allowed_shift_types: Json | null
          available_days: Json | null
          cost_center: string | null
          first_name: string | null
          group_id: string | null
          id: string | null
          is_active: boolean | null
          last_name: string | null
          position: string | null
          user_id: string | null
        }
        Insert: {
          allowed_shift_types?: Json | null
          available_days?: Json | null
          cost_center?: string | null
          first_name?: string | null
          group_id?: string | null
          id?: string | null
          is_active?: boolean | null
          last_name?: string | null
          position?: string | null
          user_id?: string | null
        }
        Update: {
          allowed_shift_types?: Json | null
          available_days?: Json | null
          cost_center?: string | null
          first_name?: string | null
          group_id?: string | null
          id?: string | null
          is_active?: boolean | null
          last_name?: string | null
          position?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "employee_groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      absence_type:
        | "vacation"
        | "sick"
        | "accident"
        | "holiday"
        | "military"
        | "other"
      app_role: "admin" | "employee"
      employee_type: "fixed" | "hourly"
      entry_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      absence_type: [
        "vacation",
        "sick",
        "accident",
        "holiday",
        "military",
        "other",
      ],
      app_role: ["admin", "employee"],
      employee_type: ["fixed", "hourly"],
      entry_status: ["pending", "approved", "rejected"],
    },
  },
} as const
