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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agent_versions: {
        Row: {
          agent_id: string
          created_at: string
          created_by: string | null
          id: string
          nodes: Json
          notes: string | null
          version: number
        }
        Insert: {
          agent_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          nodes?: Json
          notes?: string | null
          version: number
        }
        Update: {
          agent_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nodes?: Json
          notes?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_versions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          created_at: string
          description: string | null
          id: string
          industry: string | null
          languages: string[] | null
          name: string
          status: string
          system_instructions: string | null
          tools: string[] | null
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          languages?: string[] | null
          name: string
          status?: string
          system_instructions?: string | null
          tools?: string[] | null
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          languages?: string[] | null
          name?: string
          status?: string
          system_instructions?: string | null
          tools?: string[] | null
          version?: number
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor: string
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          card_type: string
          created_at: string
          customer_id: string
          id: string
          last_four: string
          status: string
        }
        Insert: {
          card_type: string
          created_at?: string
          customer_id: string
          id?: string
          last_four: string
          status?: string
        }
        Update: {
          card_type?: string
          created_at?: string
          customer_id?: string
          id?: string
          last_four?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          account_status: string
          balance: number
          created_at: string
          email: string | null
          id: string
          is_demo: boolean
          masked_account: string
          name: string
          phone: string | null
          preferred_language: string
          verification_status: string
        }
        Insert: {
          account_status?: string
          balance?: number
          created_at?: string
          email?: string | null
          id: string
          is_demo?: boolean
          masked_account: string
          name: string
          phone?: string | null
          preferred_language?: string
          verification_status?: string
        }
        Update: {
          account_status?: string
          balance?: number
          created_at?: string
          email?: string | null
          id?: string
          is_demo?: boolean
          masked_account?: string
          name?: string
          phone?: string | null
          preferred_language?: string
          verification_status?: string
        }
        Relationships: []
      }
      dispute_events: {
        Row: {
          actor: string
          created_at: string
          dispute_id: string
          from_status: string | null
          id: string
          kind: string
          note: string | null
          to_status: string | null
        }
        Insert: {
          actor: string
          created_at?: string
          dispute_id: string
          from_status?: string | null
          id?: string
          kind: string
          note?: string | null
          to_status?: string | null
        }
        Update: {
          actor?: string
          created_at?: string
          dispute_id?: string
          from_status?: string | null
          id?: string
          kind?: string
          note?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_events_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_messages: {
        Row: {
          author: string | null
          body: string
          created_at: string
          dispute_id: string
          id: string
          sender: string
        }
        Insert: {
          author?: string | null
          body: string
          created_at?: string
          dispute_id: string
          id?: string
          sender?: string
        }
        Update: {
          author?: string | null
          body?: string
          created_at?: string
          dispute_id?: string
          id?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          amount: number
          assigned_at: string | null
          assigned_team: string | null
          assigned_to: string | null
          category: string
          closed_at: string | null
          created_at: string
          customer_id: string
          description: string | null
          id: string
          idempotency_key: string | null
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          assigned_at?: string | null
          assigned_team?: string | null
          assigned_to?: string | null
          category: string
          closed_at?: string | null
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          idempotency_key?: string | null
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          assigned_at?: string | null
          assigned_team?: string | null
          assigned_to?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          idempotency_key?: string | null
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          actor: string | null
          amount: number
          balance_after: number
          created_at: string
          customer_id: string
          dispute_id: string | null
          id: string
          kind: string
          note: string | null
        }
        Insert: {
          actor?: string | null
          amount: number
          balance_after: number
          created_at?: string
          customer_id: string
          dispute_id?: string | null
          id?: string
          kind: string
          note?: string | null
        }
        Update: {
          actor?: string | null
          amount?: number
          balance_after?: number
          created_at?: string
          customer_id?: string
          dispute_id?: string | null
          id?: string
          kind?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          event: string
          id: string
          severity: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event: string
          id?: string
          severity: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          event?: string
          id?: string
          severity?: string
        }
        Relationships: []
      }
      tool_executions: {
        Row: {
          arguments: Json | null
          created_at: string
          id: string
          latency_ms: number | null
          result: Json | null
          session_id: string | null
          status: string
          tool_name: string
        }
        Insert: {
          arguments?: Json | null
          created_at?: string
          id?: string
          latency_ms?: number | null
          result?: Json | null
          session_id?: string | null
          status: string
          tool_name: string
        }
        Update: {
          arguments?: Json | null
          created_at?: string
          id?: string
          latency_ms?: number | null
          result?: Json | null
          session_id?: string | null
          status?: string
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_executions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "voice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          description: string
          enabled: boolean
          input_schema: Json
          name: string
          output_schema: Json
          requires_verification: boolean
          retries: number
          risk: string
          timeout_ms: number
        }
        Insert: {
          description: string
          enabled?: boolean
          input_schema?: Json
          name: string
          output_schema?: Json
          requires_verification?: boolean
          retries?: number
          risk?: string
          timeout_ms?: number
        }
        Update: {
          description?: string
          enabled?: boolean
          input_schema?: Json
          name?: string
          output_schema?: Json
          requires_verification?: boolean
          retries?: number
          risk?: string
          timeout_ms?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          customer_id: string
          id: string
          is_demo: boolean
          merchant: string
          occurred_at: string
          payment_method: string
          reversal_status: string
          status: string
          txn_type: string
          upi_reference: string | null
        }
        Insert: {
          amount: number
          customer_id: string
          id: string
          is_demo?: boolean
          merchant: string
          occurred_at?: string
          payment_method?: string
          reversal_status?: string
          status: string
          txn_type?: string
          upi_reference?: string | null
        }
        Update: {
          amount?: number
          customer_id?: string
          id?: string
          is_demo?: boolean
          merchant?: string
          occurred_at?: string
          payment_method?: string
          reversal_status?: string
          status?: string
          txn_type?: string
          upi_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voice_sessions: {
        Row: {
          avg_latency_ms: number | null
          customer_id: string | null
          ended_at: string | null
          id: string
          is_demo: boolean
          language: string | null
          outcome: string | null
          started_at: string
          status: string
          workflow: string | null
        }
        Insert: {
          avg_latency_ms?: number | null
          customer_id?: string | null
          ended_at?: string | null
          id?: string
          is_demo?: boolean
          language?: string | null
          outcome?: string | null
          started_at?: string
          status?: string
          workflow?: string | null
        }
        Update: {
          avg_latency_ms?: number | null
          customer_id?: string | null
          ended_at?: string | null
          id?: string
          is_demo?: boolean
          language?: string | null
          outcome?: string | null
          started_at?: string
          status?: string
          workflow?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
          nodes: Json
          status: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
          nodes?: Json
          status?: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
          nodes?: Json
          status?: string
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_dispute_reversal: {
        Args: { _dispute_id: string; _note: string }
        Returns: number
      }
      can_operate: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_bank_data: {
        Args: { _customers: Json; _transactions: Json }
        Returns: Json
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      list_operators: {
        Args: never
        Returns: {
          display_name: string
          email: string
          id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "operator" | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "operator", "viewer"],
    },
  },
} as const
