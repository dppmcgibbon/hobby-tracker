export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      collection_miniatures: {
        Row: {
          collection_id: string;
          created_at: string | null;
          display_order: number | null;
          miniature_id: string;
        };
        Insert: {
          collection_id: string;
          created_at?: string | null;
          display_order?: number | null;
          miniature_id: string;
        };
        Update: {
          collection_id?: string;
          created_at?: string | null;
          display_order?: number | null;
          miniature_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collection_miniatures_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_miniatures_miniature_id_fkey";
            columns: ["miniature_id"];
            isOneToOne: false;
            referencedRelation: "miniatures";
            referencedColumns: ["id"];
          },
        ];
      };
      collections: {
        Row: {
          color: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          is_default: boolean | null;
          name: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_default?: boolean | null;
          name: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_default?: boolean | null;
          name?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      factions: {
        Row: {
          army_type: string;
          color_hex: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
        };
        Insert: {
          army_type: string;
          color_hex?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          army_type?: string;
          color_hex?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      materials: {
        Row: {
          brand: string | null;
          color: string | null;
          color_hex: string | null;
          cost_per_unit: number | null;
          created_at: string | null;
          id: string;
          name: string;
          notes: string | null;
          quantity_grams: number | null;
          quantity_ml: number | null;
          type: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          brand?: string | null;
          color?: string | null;
          color_hex?: string | null;
          cost_per_unit?: number | null;
          created_at?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          quantity_grams?: number | null;
          quantity_ml?: number | null;
          type: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          brand?: string | null;
          color?: string | null;
          color_hex?: string | null;
          cost_per_unit?: number | null;
          created_at?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          quantity_grams?: number | null;
          quantity_ml?: number | null;
          type?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      miniature_photos: {
        Row: {
          caption: string | null;
          display_order: number | null;
          id: string;
          miniature_id: string;
          photo_type: string | null;
          storage_path: string;
          uploaded_at: string | null;
          user_id: string;
        };
        Insert: {
          caption?: string | null;
          display_order?: number | null;
          id?: string;
          miniature_id: string;
          photo_type?: string | null;
          storage_path: string;
          uploaded_at?: string | null;
          user_id: string;
        };
        Update: {
          caption?: string | null;
          display_order?: number | null;
          id?: string;
          miniature_id?: string;
          photo_type?: string | null;
          storage_path?: string;
          uploaded_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "miniature_photos_miniature_id_fkey";
            columns: ["miniature_id"];
            isOneToOne: false;
            referencedRelation: "miniatures";
            referencedColumns: ["id"];
          },
        ];
      };
      miniature_recipes: {
        Row: {
          created_at: string | null;
          miniature_id: string;
          recipe_id: string;
        };
        Insert: {
          created_at?: string | null;
          miniature_id: string;
          recipe_id: string;
        };
        Update: {
          created_at?: string | null;
          miniature_id?: string;
          recipe_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "miniature_recipes_miniature_id_fkey";
            columns: ["miniature_id"];
            isOneToOne: false;
            referencedRelation: "miniatures";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "miniature_recipes_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "painting_recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      miniature_status: {
        Row: {
          based: boolean | null;
          completed_at: string | null;
          created_at: string | null;
          id: string;
          magnetised: boolean | null;
          miniature_id: string;
          started_at: string | null;
          status: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          based?: boolean | null;
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          magnetised?: boolean | null;
          miniature_id: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          based?: boolean | null;
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          magnetised?: boolean | null;
          miniature_id?: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "miniature_status_miniature_id_fkey";
            columns: ["miniature_id"];
            isOneToOne: true;
            referencedRelation: "miniatures";
            referencedColumns: ["id"];
          },
        ];
      };
      miniature_tags: {
        Row: {
          created_at: string | null;
          miniature_id: string;
          tag_id: string;
        };
        Insert: {
          created_at?: string | null;
          miniature_id: string;
          tag_id: string;
        };
        Update: {
          created_at?: string | null;
          miniature_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "miniature_tags_miniature_id_fkey";
            columns: ["miniature_id"];
            isOneToOne: false;
            referencedRelation: "miniatures";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "miniature_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      miniatures: {
        Row: {
          base_size: string | null;
          created_at: string | null;
          faction_id: string | null;
          id: string;
          material: string | null;
          name: string;
          notes: string | null;
          quantity: number | null;
          sculptor: string | null;
          unit_type: string | null;
          updated_at: string | null;
          user_id: string;
          year: number | null;
        };
        Insert: {
          base_size?: string | null;
          created_at?: string | null;
          faction_id?: string | null;
          id?: string;
          material?: string | null;
          name: string;
          notes?: string | null;
          quantity?: number | null;
          sculptor?: string | null;
          unit_type?: string | null;
          updated_at?: string | null;
          user_id: string;
          year?: number | null;
        };
        Update: {
          base_size?: string | null;
          created_at?: string | null;
          faction_id?: string | null;
          id?: string;
          material?: string | null;
          name?: string;
          notes?: string | null;
          quantity?: number | null;
          sculptor?: string | null;
          unit_type?: string | null;
          updated_at?: string | null;
          user_id?: string;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "miniatures_faction_id_fkey";
            columns: ["faction_id"];
            isOneToOne: false;
            referencedRelation: "factions";
            referencedColumns: ["id"];
          },
        ];
      };
      painting_recipes: {
        Row: {
          created_at: string | null;
          description: string | null;
          faction_id: string | null;
          id: string;
          is_public: boolean | null;
          name: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          faction_id?: string | null;
          id?: string;
          is_public?: boolean | null;
          name: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          faction_id?: string | null;
          id?: string;
          is_public?: boolean | null;
          name?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "painting_recipes_faction_id_fkey";
            columns: ["faction_id"];
            isOneToOne: false;
            referencedRelation: "factions";
            referencedColumns: ["id"];
          },
        ];
      };
      paints: {
        Row: {
          brand: string;
          color_hex: string | null;
          created_at: string | null;
          id: string;
          name: string;
          type: string;
        };
        Insert: {
          brand: string;
          color_hex?: string | null;
          created_at?: string | null;
          id?: string;
          name: string;
          type: string;
        };
        Update: {
          brand?: string;
          color_hex?: string | null;
          created_at?: string | null;
          id?: string;
          name?: string;
          type?: string;
        };
        Relationships: [];
      };
      print_profiles: {
        Row: {
          bottom_exposure_time_seconds: number | null;
          bottom_layers: number | null;
          created_at: string | null;
          exposure_time_seconds: number | null;
          id: string;
          layer_height_mm: number | null;
          lift_speed_mm_per_min: number | null;
          material_id: string | null;
          name: string;
          notes: string | null;
          printer_name: string | null;
          retract_speed_mm_per_min: number | null;
          temperature_celsius: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          bottom_exposure_time_seconds?: number | null;
          bottom_layers?: number | null;
          created_at?: string | null;
          exposure_time_seconds?: number | null;
          id?: string;
          layer_height_mm?: number | null;
          lift_speed_mm_per_min?: number | null;
          material_id?: string | null;
          name: string;
          notes?: string | null;
          printer_name?: string | null;
          retract_speed_mm_per_min?: number | null;
          temperature_celsius?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          bottom_exposure_time_seconds?: number | null;
          bottom_layers?: number | null;
          created_at?: string | null;
          exposure_time_seconds?: number | null;
          id?: string;
          layer_height_mm?: number | null;
          lift_speed_mm_per_min?: number | null;
          material_id?: string | null;
          name?: string;
          notes?: string | null;
          printer_name?: string | null;
          retract_speed_mm_per_min?: number | null;
          temperature_celsius?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "print_profiles_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
        ];
      };
      prints: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          failure_reason: string | null;
          id: string;
          material_cost: number | null;
          material_id: string | null;
          material_used_ml: number | null;
          miniature_id: string | null;
          notes: string | null;
          print_profile_id: string | null;
          print_time_minutes: number | null;
          quantity: number | null;
          scale_factor: number | null;
          started_at: string | null;
          status: string;
          stl_file_id: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          failure_reason?: string | null;
          id?: string;
          material_cost?: number | null;
          material_id?: string | null;
          material_used_ml?: number | null;
          miniature_id?: string | null;
          notes?: string | null;
          print_profile_id?: string | null;
          print_time_minutes?: number | null;
          quantity?: number | null;
          scale_factor?: number | null;
          started_at?: string | null;
          status?: string;
          stl_file_id?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          failure_reason?: string | null;
          id?: string;
          material_cost?: number | null;
          material_id?: string | null;
          material_used_ml?: number | null;
          miniature_id?: string | null;
          notes?: string | null;
          print_profile_id?: string | null;
          print_time_minutes?: number | null;
          quantity?: number | null;
          scale_factor?: number | null;
          started_at?: string | null;
          status?: string;
          stl_file_id?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prints_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prints_miniature_id_fkey";
            columns: ["miniature_id"];
            isOneToOne: false;
            referencedRelation: "miniatures";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prints_print_profile_id_fkey";
            columns: ["print_profile_id"];
            isOneToOne: false;
            referencedRelation: "print_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prints_stl_file_id_fkey";
            columns: ["stl_file_id"];
            isOneToOne: false;
            referencedRelation: "stl_files";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          display_name: string | null;
          email: string | null;
          id: string;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          email?: string | null;
          id: string;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      recipe_steps: {
        Row: {
          created_at: string | null;
          id: string;
          notes: string | null;
          paint_id: string | null;
          recipe_id: string;
          step_order: number;
          technique: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          notes?: string | null;
          paint_id?: string | null;
          recipe_id: string;
          step_order: number;
          technique: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          notes?: string | null;
          paint_id?: string | null;
          recipe_id?: string;
          step_order?: number;
          technique?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_steps_paint_id_fkey";
            columns: ["paint_id"];
            isOneToOne: false;
            referencedRelation: "paints";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "painting_recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      shared_miniatures: {
        Row: {
          created_at: string | null;
          expires_at: string | null;
          id: string;
          is_public: boolean | null;
          miniature_id: string;
          share_token: string;
          user_id: string;
          view_count: number | null;
        };
        Insert: {
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          is_public?: boolean | null;
          miniature_id: string;
          share_token: string;
          user_id: string;
          view_count?: number | null;
        };
        Update: {
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          is_public?: boolean | null;
          miniature_id?: string;
          share_token?: string;
          user_id?: string;
          view_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "shared_miniatures_miniature_id_fkey";
            columns: ["miniature_id"];
            isOneToOne: true;
            referencedRelation: "miniatures";
            referencedColumns: ["id"];
          },
        ];
      };
      stl_files: {
        Row: {
          created_at: string | null;
          description: string | null;
          designer: string | null;
          estimated_material_usage_ml: number | null;
          estimated_print_time_minutes: number | null;
          file_size_bytes: number | null;
          id: string;
          is_supported: boolean | null;
          license: string | null;
          name: string;
          scale_factor: number | null;
          source: string | null;
          source_url: string | null;
          storage_path: string;
          thumbnail_path: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          designer?: string | null;
          estimated_material_usage_ml?: number | null;
          estimated_print_time_minutes?: number | null;
          file_size_bytes?: number | null;
          id?: string;
          is_supported?: boolean | null;
          license?: string | null;
          name: string;
          scale_factor?: number | null;
          source?: string | null;
          source_url?: string | null;
          storage_path: string;
          thumbnail_path?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          designer?: string | null;
          estimated_material_usage_ml?: number | null;
          estimated_print_time_minutes?: number | null;
          file_size_bytes?: number | null;
          id?: string;
          is_supported?: boolean | null;
          license?: string | null;
          name?: string;
          scale_factor?: number | null;
          source?: string | null;
          source_url?: string | null;
          storage_path?: string;
          thumbnail_path?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      stl_tags: {
        Row: {
          created_at: string | null;
          stl_file_id: string;
          tag_id: string;
        };
        Insert: {
          created_at?: string | null;
          stl_file_id: string;
          tag_id: string;
        };
        Update: {
          created_at?: string | null;
          stl_file_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stl_tags_stl_file_id_fkey";
            columns: ["stl_file_id"];
            isOneToOne: false;
            referencedRelation: "stl_files";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stl_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: {
          color: string | null;
          created_at: string | null;
          id: string;
          name: string;
          user_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string | null;
          id?: string;
          name: string;
          user_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string | null;
          id?: string;
          name?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_paints: {
        Row: {
          created_at: string | null;
          id: string;
          notes: string | null;
          paint_id: string;
          quantity: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          notes?: string | null;
          paint_id: string;
          quantity?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          notes?: string | null;
          paint_id?: string;
          quantity?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_paints_paint_id_fkey";
            columns: ["paint_id"];
            isOneToOne: false;
            referencedRelation: "paints";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      generate_share_token: { Args: never; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
