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
      employees: {
        Row: {
          available_days: Json | null
          cost_center: string
          created_at: string
          employee_type: Database["public"]["Enums"]["employee_type"]
          first_name: string
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
          available_days?: Json | null
          cost_center?: string
          created_at?: string
          employee_type?: Database["public"]["Enums"]["employee_type"]
          first_name: string
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
          available_days?: Json | null
          cost_center?: string
          created_at?: string
          employee_type?: Database["public"]["Enums"]["employee_type"]
          first_name?: string
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
        Relationships: []
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
      shift_types: {
        Row: {
          color: string
          created_at: string
          end_time: string | null
          id: string
          name: string
          short_code: string
          sort_order: number
          start_time: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          end_time?: string | null
          id?: string
          name: string
          short_code: string
          sort_order?: number
          start_time?: string | null
        }
        Update: {
          color?: string
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
        ]
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
      [_ in never]: never
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
