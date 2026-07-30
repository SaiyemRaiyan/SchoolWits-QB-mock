// Auto-generated from the live Supabase schema — do not hand-edit.
// Regenerate with `npm run gen:types` (backend/package.json) whenever a
// migration under backend/supabase/migrations/ changes the schema.

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      module_questions: {
        Row: {
          module_id: number
          question_id: number
          sort_order: number
        }
        Insert: {
          module_id: number
          question_id: number
          sort_order?: number
        }
        Update: {
          module_id?: number
          question_id?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "module_questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string
          currency: string
          description: string
          id: number
          premium: boolean
          price: number
          title: string
          topic: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string
          id?: never
          premium?: boolean
          price?: number
          title: string
          topic?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string
          id?: never
          premium?: boolean
          price?: number
          title?: string
          topic?: string
        }
        Relationships: []
      }
      papers: {
        Row: {
          created_at: string
          id: number
          label: string
          paper: string
          paper_key: string
          session: string
          subject: string
          subject_code: string
          variant: string
          year: string
        }
        Insert: {
          created_at?: string
          id?: never
          label: string
          paper: string
          paper_key?: string
          session: string
          subject: string
          subject_code?: string
          variant: string
          year: string
        }
        Update: {
          created_at?: string
          id?: never
          label?: string
          paper?: string
          paper_key?: string
          session?: string
          subject?: string
          subject_code?: string
          variant?: string
          year?: string
        }
        Relationships: []
      }
      question_images: {
        Row: {
          caption: string
          created_at: string
          filename: string
          id: number
          question_id: number
          sort_order: number
          storage_path: string
        }
        Insert: {
          caption?: string
          created_at?: string
          filename: string
          id?: never
          question_id: number
          sort_order?: number
          storage_path: string
        }
        Update: {
          caption?: string
          created_at?: string
          filename?: string
          id?: never
          question_id?: number
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_images_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string
          exemplar_html: string
          id: number
          mark_scheme: Json
          marks: string
          paper_id: number
          q_html: string
          q_text: string
          question_number: number
          ref: string
          search_vector: unknown
          topic: string
          video_id: string
        }
        Insert: {
          created_at?: string
          exemplar_html?: string
          id?: never
          mark_scheme?: Json
          marks?: string
          paper_id: number
          q_html?: string
          q_text?: string
          question_number: number
          ref?: string
          search_vector?: unknown
          topic?: string
          video_id?: string
        }
        Update: {
          created_at?: string
          exemplar_html?: string
          id?: never
          mark_scheme?: Json
          marks?: string
          paper_id?: number
          q_html?: string
          q_text?: string
          question_number?: number
          ref?: string
          search_vector?: unknown
          topic?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
