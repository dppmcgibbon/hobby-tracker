/* Generated from schema - regenerate with: npx supabase gen types typescript --local > src/types/database.types.ts */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      factions: {
        Row: {
          id: string;
          name: string;
          army_type: string;
          description: string | null;
          color_hex: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          army_type: string;
          description?: string | null;
          color_hex?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          army_type?: string;
          description?: string | null;
          color_hex?: string | null;
          created_at?: string;
        };
      };
      miniatures: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          faction_id: string | null;
          unit_type: string | null;
          quantity: number;
          material: string | null;
          base_size: string | null;
          sculptor: string | null;
          year: number | null;
          notes: string | null;
          storage_box_id: string | null;
          base_id: string | null;
          base_shape_id: string | null;
          base_type_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          faction_id?: string | null;
          unit_type?: string | null;
          quantity?: number;
          material?: string | null;
          base_size?: string | null;
          sculptor?: string | null;
          year?: number | null;
          notes?: string | null;
          storage_box_id?: string | null;
          base_id?: string | null;
          base_shape_id?: string | null;
          base_type_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          faction_id?: string | null;
          unit_type?: string | null;
          quantity?: number;
          material?: string | null;
          base_size?: string | null;
          sculptor?: string | null;
          year?: number | null;
          notes?: string | null;
          storage_box_id?: string | null;
          base_id?: string | null;
          base_shape_id?: string | null;
          base_type_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      miniature_status: {
        Row: {
          id: string;
          miniature_id: string;
          user_id: string;
          status: string;
          magnetised: boolean;
          based: boolean;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          miniature_id: string;
          user_id: string;
          status?: string;
          magnetised?: boolean;
          based?: boolean;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          miniature_id?: string;
          user_id?: string;
          status?: string;
          magnetised?: boolean;
          based?: boolean;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      paints: {
        Row: {
          id: string;
          brand: string;
          name: string;
          type: string;
          color_hex: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          brand: string;
          name: string;
          type: string;
          color_hex?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          brand?: string;
          name?: string;
          type?: string;
          color_hex?: string | null;
          created_at?: string;
        };
      };
      user_paints: {
        Row: {
          id: string;
          user_id: string;
          paint_id: string;
          quantity: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          paint_id: string;
          quantity?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          paint_id?: string;
          quantity?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      painting_recipes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          faction_id: string | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          faction_id?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          faction_id?: string | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      recipe_steps: {
        Row: {
          id: string;
          recipe_id: string;
          step_order: number;
          paint_id: string | null;
          technique: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          step_order: number;
          paint_id?: string | null;
          technique: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          step_order?: number;
          paint_id?: string | null;
          technique?: string;
          notes?: string | null;
          created_at?: string;
        };
      };
      saved_filters: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          filters: Json;
          logo_url: string | null;
          is_starred: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          filters: Json;
          logo_url?: string | null;
          is_starred?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          filters?: Json;
          logo_url?: string | null;
          is_starred?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      miniature_photos: {
        Row: {
          id: string;
          miniature_id: string;
          user_id: string;
          storage_path: string;
          caption: string | null;
          photo_type: string;
          display_order: number;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          miniature_id: string;
          user_id: string;
          storage_path: string;
          caption?: string | null;
          photo_type?: string;
          display_order?: number;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          miniature_id?: string;
          user_id?: string;
          storage_path?: string;
          caption?: string | null;
          photo_type?: string;
          display_order?: number;
          uploaded_at?: string;
        };
      };
      games: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          publisher: string | null;
          universe_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          publisher?: string | null;
          universe_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          publisher?: string | null;
          universe_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      editions: {
        Row: {
          id: string;
          game_id: string;
          name: string;
          sequence: number;
          year: number | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          name: string;
          sequence: number;
          year?: number | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          name?: string;
          sequence?: number;
          year?: number | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      expansions: {
        Row: {
          id: string;
          edition_id: string;
          name: string;
          sequence: number;
          year: number | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          edition_id: string;
          name: string;
          sequence: number;
          year?: number | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          edition_id?: string;
          name?: string;
          sequence?: number;
          year?: number | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      miniature_games: {
        Row: {
          miniature_id: string;
          game_id: string;
          edition_id: string | null;
          expansion_id: string | null;
          created_at: string;
        };
        Insert: {
          miniature_id: string;
          game_id: string;
          edition_id?: string | null;
          expansion_id?: string | null;
          created_at?: string;
        };
        Update: {
          miniature_id?: string;
          game_id?: string;
          edition_id?: string | null;
          expansion_id?: string | null;
          created_at?: string;
        };
      };
      universes: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      storage_boxes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          location: string | null;
          description: string | null;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          location?: string | null;
          description?: string | null;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          location?: string | null;
          description?: string | null;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string | null;
          created_at?: string;
        };
      };
      collections: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          color: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          color?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          color?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      collection_miniatures: {
        Row: {
          collection_id: string;
          miniature_id: string;
          display_order: number;
          created_at: string;
        };
        Insert: {
          collection_id: string;
          miniature_id: string;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          collection_id?: string;
          miniature_id?: string;
          display_order?: number;
          created_at?: string;
        };
      };
      miniature_tags: {
        Row: {
          miniature_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          miniature_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: {
          miniature_id?: string;
          tag_id?: string;
          created_at?: string;
        };
      };
      miniature_recipes: {
        Row: {
          miniature_id: string;
          recipe_id: string;
          created_at: string;
        };
        Insert: {
          miniature_id: string;
          recipe_id: string;
          created_at?: string;
        };
        Update: {
          miniature_id?: string;
          recipe_id?: string;
          created_at?: string;
        };
      };
      bases: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      base_shapes: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      base_types: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      shared_miniatures: {
        Row: {
          id: string;
          miniature_id: string;
          user_id: string;
          share_token: string;
          is_public: boolean;
          view_count: number;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          miniature_id: string;
          user_id: string;
          share_token: string;
          is_public?: boolean;
          view_count?: number;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          miniature_id?: string;
          user_id?: string;
          share_token?: string;
          is_public?: boolean;
          view_count?: number;
          created_at?: string;
          expires_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
