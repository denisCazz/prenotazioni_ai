export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          name: string;
          type: string;
          phone_number: string | null;
          vapi_assistant_id: string | null;
          address: string | null;
          settings: Json | null;
          system_prompt: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          phone_number?: string | null;
          vapi_assistant_id?: string | null;
          address?: string | null;
          settings?: Json | null;
          system_prompt?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          phone_number?: string | null;
          vapi_assistant_id?: string | null;
          address?: string | null;
          settings?: Json | null;
          system_prompt?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          duration_minutes: number;
          description: string | null;
          max_concurrent: number;
          active: boolean;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          duration_minutes: number;
          description?: string | null;
          max_concurrent?: number;
          active?: boolean;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          duration_minutes?: number;
          description?: string | null;
          max_concurrent?: number;
          active?: boolean;
        };
        Relationships: [];
      };
      availability_slots: {
        Row: {
          id: string;
          business_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          business_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          business_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      availability_exceptions: {
        Row: {
          id: string;
          business_id: string;
          date: string;
          is_closed: boolean;
          start_time: string | null;
          end_time: string | null;
          reason: string | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          date: string;
          is_closed?: boolean;
          start_time?: string | null;
          end_time?: string | null;
          reason?: string | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          date?: string;
          is_closed?: boolean;
          start_time?: string | null;
          end_time?: string | null;
          reason?: string | null;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          business_id: string;
          service_id: string | null;
          customer_name: string;
          customer_phone: string;
          date: string;
          start_time: string;
          end_time: string;
          status: string;
          notes: string | null;
          source: string;
          call_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          service_id?: string | null;
          customer_name: string;
          customer_phone: string;
          date: string;
          start_time: string;
          end_time: string;
          status?: string;
          notes?: string | null;
          source?: string;
          call_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          service_id?: string | null;
          customer_name?: string;
          customer_phone?: string;
          date?: string;
          start_time?: string;
          end_time?: string;
          status?: string;
          notes?: string | null;
          source?: string;
          call_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      call_logs: {
        Row: {
          id: string;
          business_id: string;
          vapi_call_id: string;
          caller_phone: string | null;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number | null;
          transcript: string | null;
          summary: string | null;
          outcome: string | null;
          recording_url: string | null;
          cost: number | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          vapi_call_id: string;
          caller_phone?: string | null;
          started_at: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          transcript?: string | null;
          summary?: string | null;
          outcome?: string | null;
          recording_url?: string | null;
          cost?: number | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          vapi_call_id?: string;
          caller_phone?: string | null;
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number | null;
          transcript?: string | null;
          summary?: string | null;
          outcome?: string | null;
          recording_url?: string | null;
          cost?: number | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          business_id: string;
          full_name: string;
          role: string;
        };
        Insert: {
          id: string;
          business_id: string;
          full_name: string;
          role?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          full_name?: string;
          role?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
