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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      factions: {
        Row: {
          army_type: string
          color_hex: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          army_type: string
          color_hex?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          army_type?: string
          color_hex?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      miniature_photos: {
        Row: {
          caption: string | null
          display_order: number | null
          id: string
          miniature_id: string
          photo_type: string | null
          storage_path: string
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          display_order?: number | null
          id?: string
          miniature_id: string
          photo_type?: string | null
          storage_path: string
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          display_order?: number | null
          id?: string
          miniature_id?: string
          photo_type?: string | null
          storage_path?: string
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "miniature_photos_miniature_id_fkey"
            columns: ["miniature_id"]
            isOneToOne: false
            referencedRelation: "miniatures"
            referencedColumns: ["id"]
          },
        ]
      }
      miniature_recipes: {
        Row: {
          created_at: string | null
          miniature_id: string
          recipe_id: string
        }
        Insert: {
          created_at?: string | null
          miniature_id: string
          recipe_id: string
        }
        Update: {
          created_at?: string | null
          miniature_id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "miniature_recipes_miniature_id_fkey"
            columns: ["miniature_id"]
            isOneToOne: false
            referencedRelation: "miniatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "miniature_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "painting_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      miniature_status: {
        Row: {
          based: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          magnetised: boolean | null
          miniature_id: string
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          based?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          magnetised?: boolean | null
          miniature_id: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          based?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          magnetised?: boolean | null
          miniature_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "miniature_status_miniature_id_fkey"
            columns: ["miniature_id"]
            isOneToOne: true
            referencedRelation: "miniatures"
            referencedColumns: ["id"]
          },
        ]
      }
      miniatures: {
        Row: {
          base_size: string | null
          created_at: string | null
          faction_id: string | null
          id: string
          material: string | null
          name: string
          notes: string | null
          quantity: number | null
          sculptor: string | null
          unit_type: string | null
          updated_at: string | null
          user_id: string
          year: number | null
        }
        Insert: {
          base_size?: string | null
          created_at?: string | null
          faction_id?: string | null
          id?: string
          material?: string | null
          name: string
          notes?: string | null
          quantity?: number | null
          sculptor?: string | null
          unit_type?: string | null
          updated_at?: string | null
          user_id: string
          year?: number | null
        }
        Update: {
          base_size?: string | null
          created_at?: string | null
          faction_id?: string | null
          id?: string
          material?: string | null
          name?: string
          notes?: string | null
          quantity?: number | null
          sculptor?: string | null
          unit_type?: string | null
          updated_at?: string | null
          user_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "miniatures_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
        ]
      }
      painting_recipes: {
        Row: {
          created_at: string | null
          description: string | null
          faction_id: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          faction_id?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          faction_id?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "painting_recipes_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
        ]
      }
      paints: {
        Row: {
          brand: string
          color_hex: string | null
          created_at: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          brand: string
          color_hex?: string | null
          created_at?: string | null
          id?: string
          name: string
          type: string
        }
        Update: {
          brand?: string
          color_hex?: string | null
          created_at?: string | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      recipe_steps: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          paint_id: string | null
          recipe_id: string
          step_order: number
          technique: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          paint_id?: string | null
          recipe_id: string
          step_order: number
          technique: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          paint_id?: string | null
          recipe_id?: string
          step_order?: number
          technique?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_steps_paint_id_fkey"
            columns: ["paint_id"]
            isOneToOne: false
            referencedRelation: "paints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "painting_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_paints: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          paint_id: string
          quantity: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          paint_id: string
          quantity?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          paint_id?: string
          quantity?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_paints_paint_id_fkey"
            columns: ["paint_id"]
            isOneToOne: false
            referencedRelation: "paints"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
