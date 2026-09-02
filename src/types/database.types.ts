export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      army_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      base_shapes: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      base_types: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      bases: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      boardgames: {
        Row: {
          amount: string | null
          boxset: string
          game: string
          id: number
          name: string
          status: string | null
          type: string
        }
        Insert: {
          amount?: string | null
          boxset: string
          game: string
          id: number
          name: string
          status?: string | null
          type: string
        }
        Update: {
          amount?: string | null
          boxset?: string
          game?: string
          id?: number
          name?: string
          status?: string | null
          type?: string
        }
        Relationships: []
      }
      collect_apps: {
        Row: {
          app: string
          id: number
          initial_sort_key: string | null
          table_name: string
        }
        Insert: {
          app: string
          id: number
          initial_sort_key?: string | null
          table_name: string
        }
        Update: {
          app?: string
          id?: number
          initial_sort_key?: string | null
          table_name?: string
        }
        Relationships: []
      }
      collect_config: {
        Row: {
          column_name: string
          column_type: string
          display: number | null
          filter: number | null
          id: number
          initial_sort_key: number | null
          sequence: number
          table_name: string
        }
        Insert: {
          column_name: string
          column_type: string
          display?: number | null
          filter?: number | null
          id: number
          initial_sort_key?: number | null
          sequence: number
          table_name: string
        }
        Update: {
          column_name?: string
          column_type?: string
          display?: number | null
          filter?: number | null
          id?: number
          initial_sort_key?: number | null
          sequence?: number
          table_name?: string
        }
        Relationships: []
      }
      collection_miniatures: {
        Row: {
          collection_id: string
          created_at: string | null
          display_order: number | null
          miniature_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string | null
          display_order?: number | null
          miniature_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string | null
          display_order?: number | null
          miniature_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_miniatures_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_miniatures_miniature_id_fkey"
            columns: ["miniature_id"]
            isOneToOne: false
            referencedRelation: "miniatures"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      editions: {
        Row: {
          created_at: string | null
          description: string | null
          game_id: string
          id: string
          name: string
          sequence: number
          updated_at: string | null
          year: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          game_id: string
          id?: string
          name: string
          sequence: number
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          game_id?: string
          id?: string
          name?: string
          sequence?: number
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "editions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      expansions: {
        Row: {
          created_at: string | null
          description: string | null
          edition_id: string
          id: string
          name: string
          sequence: number
          updated_at: string | null
          year: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          edition_id: string
          id?: string
          name: string
          sequence: number
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          edition_id?: string
          id?: string
          name?: string
          sequence?: number
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expansions_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      factions: {
        Row: {
          army_type: string
          army_type_id: string | null
          color_hex: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          army_type: string
          army_type_id?: string | null
          color_hex?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          army_type?: string
          army_type_id?: string | null
          color_hex?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "factions_army_type_id_fkey"
            columns: ["army_type_id"]
            isOneToOne: false
            referencedRelation: "army_types"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          publisher: string | null
          universe_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          publisher?: string | null
          universe_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          publisher?: string | null
          universe_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_universe_id_fkey"
            columns: ["universe_id"]
            isOneToOne: false
            referencedRelation: "universes"
            referencedColumns: ["id"]
          },
        ]
      }
      magazines: {
        Row: {
          built: boolean | null
          complete: boolean | null
          faction: string | null
          id: number
          image: string | null
          issue: number
          magazine: string
          magnetised: boolean | null
          miniature: string | null
          painted: boolean | null
          primed: boolean | null
          received: boolean | null
        }
        Insert: {
          built?: boolean | null
          complete?: boolean | null
          faction?: string | null
          id: number
          image?: string | null
          issue: number
          magazine: string
          magnetised?: boolean | null
          miniature?: string | null
          painted?: boolean | null
          primed?: boolean | null
          received?: boolean | null
        }
        Update: {
          built?: boolean | null
          complete?: boolean | null
          faction?: string | null
          id?: number
          image?: string | null
          issue?: number
          magazine?: string
          magnetised?: boolean | null
          miniature?: string | null
          painted?: boolean | null
          primed?: boolean | null
          received?: boolean | null
        }
        Relationships: []
      }
      miniature_games: {
        Row: {
          created_at: string | null
          edition_id: string | null
          expansion_id: string | null
          game_id: string
          miniature_id: string
        }
        Insert: {
          created_at?: string | null
          edition_id?: string | null
          expansion_id?: string | null
          game_id: string
          miniature_id: string
        }
        Update: {
          created_at?: string | null
          edition_id?: string | null
          expansion_id?: string | null
          game_id?: string
          miniature_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "miniature_games_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "miniature_games_expansion_id_fkey"
            columns: ["expansion_id"]
            isOneToOne: false
            referencedRelation: "expansions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "miniature_games_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "miniature_games_miniature_id_fkey"
            columns: ["miniature_id"]
            isOneToOne: false
            referencedRelation: "miniatures"
            referencedColumns: ["id"]
          },
        ]
      }
      miniature_photos: {
        Row: {
          caption: string | null
          display_order: number | null
          id: string
          image_updated_at: string | null
          miniature_id: string
          photo_type: string | null
          storage_path: string
          uploaded_at: string | null
        }
        Insert: {
          caption?: string | null
          display_order?: number | null
          id?: string
          image_updated_at?: string | null
          miniature_id: string
          photo_type?: string | null
          storage_path: string
          uploaded_at?: string | null
        }
        Update: {
          caption?: string | null
          display_order?: number | null
          id?: string
          image_updated_at?: string | null
          miniature_id?: string
          photo_type?: string | null
          storage_path?: string
          uploaded_at?: string | null
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
          status_id: string | null
          updated_at: string | null
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
          status_id?: string | null
          updated_at?: string | null
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
          status_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "miniature_status_miniature_id_fkey"
            columns: ["miniature_id"]
            isOneToOne: true
            referencedRelation: "miniatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "miniature_status_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "miniature_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      miniature_statuses: {
        Row: {
          created_at: string | null
          display_order: number
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          display_order: number
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      miniature_tags: {
        Row: {
          created_at: string | null
          miniature_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          miniature_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          miniature_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "miniature_tags_miniature_id_fkey"
            columns: ["miniature_id"]
            isOneToOne: false
            referencedRelation: "miniatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "miniature_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      miniatures: {
        Row: {
          base_id: string | null
          base_shape_id: string | null
          base_size: string | null
          base_type_id: string | null
          created_at: string | null
          faction_id: string | null
          id: string
          material: string | null
          name: string
          notes: string | null
          quantity: number | null
          sculptor: string | null
          storage_box_id: string | null
          unit_type: string | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          base_id?: string | null
          base_shape_id?: string | null
          base_size?: string | null
          base_type_id?: string | null
          created_at?: string | null
          faction_id?: string | null
          id?: string
          material?: string | null
          name: string
          notes?: string | null
          quantity?: number | null
          sculptor?: string | null
          storage_box_id?: string | null
          unit_type?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          base_id?: string | null
          base_shape_id?: string | null
          base_size?: string | null
          base_type_id?: string | null
          created_at?: string | null
          faction_id?: string | null
          id?: string
          material?: string | null
          name?: string
          notes?: string | null
          quantity?: number | null
          sculptor?: string | null
          storage_box_id?: string | null
          unit_type?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "miniatures_base_id_fkey"
            columns: ["base_id"]
            isOneToOne: false
            referencedRelation: "bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "miniatures_base_shape_id_fkey"
            columns: ["base_shape_id"]
            isOneToOne: false
            referencedRelation: "base_shapes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "miniatures_base_type_id_fkey"
            columns: ["base_type_id"]
            isOneToOne: false
            referencedRelation: "base_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "miniatures_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "miniatures_storage_box_id_fkey"
            columns: ["storage_box_id"]
            isOneToOne: false
            referencedRelation: "storage_boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      paint_equivalents: {
        Row: {
          created_at: string | null
          equivalent_paint_id: string
          id: string
          paint_id: string
        }
        Insert: {
          created_at?: string | null
          equivalent_paint_id: string
          id?: string
          paint_id: string
        }
        Update: {
          created_at?: string | null
          equivalent_paint_id?: string
          id?: string
          paint_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paint_equivalents_equivalent_paint_id_fkey"
            columns: ["equivalent_paint_id"]
            isOneToOne: false
            referencedRelation: "paints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paint_equivalents_paint_id_fkey"
            columns: ["paint_id"]
            isOneToOne: false
            referencedRelation: "paints"
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
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          faction_id?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          faction_id?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string | null
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
          id?: string
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
      records: {
        Row: {
          artist: string | null
          bandcamp: boolean | null
          cassette: boolean | null
          catalog: string | null
          cd: boolean | null
          cover: string | null
          digital: boolean | null
          discogs: boolean | null
          id: number
          label: string
          sequence: number | null
          title: string
          vinyl: boolean | null
        }
        Insert: {
          artist?: string | null
          bandcamp?: boolean | null
          cassette?: boolean | null
          catalog?: string | null
          cd?: boolean | null
          cover?: string | null
          digital?: boolean | null
          discogs?: boolean | null
          id: number
          label: string
          sequence?: number | null
          title: string
          vinyl?: boolean | null
        }
        Update: {
          artist?: string | null
          bandcamp?: boolean | null
          cassette?: boolean | null
          catalog?: string | null
          cd?: boolean | null
          cover?: string | null
          digital?: boolean | null
          discogs?: boolean | null
          id?: number
          label?: string
          sequence?: number | null
          title?: string
          vinyl?: boolean | null
        }
        Relationships: []
      }
      saved_filters: {
        Row: {
          created_at: string | null
          filters: Json
          id: string
          is_starred: boolean | null
          logo_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          filters: Json
          id?: string
          is_starred?: boolean | null
          logo_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          filters?: Json
          id?: string
          is_starred?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shared_miniatures: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_public: boolean | null
          miniature_id: string
          share_token: string
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_public?: boolean | null
          miniature_id: string
          share_token: string
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_public?: boolean | null
          miniature_id?: string
          share_token?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_miniatures_miniature_id_fkey"
            columns: ["miniature_id"]
            isOneToOne: true
            referencedRelation: "miniatures"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_boxes: {
        Row: {
          completed: boolean | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          name: string
          updated_at: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          author: string
          book: string | null
          complete: boolean | null
          date: string | null
          id: number
          novel: boolean | null
          sequence: number
          series: string | null
          story: string
          wiki: string | null
        }
        Insert: {
          author: string
          book?: string | null
          complete?: boolean | null
          date?: string | null
          id: number
          novel?: boolean | null
          sequence: number
          series?: string | null
          story: string
          wiki?: string | null
        }
        Update: {
          author?: string
          book?: string | null
          complete?: boolean | null
          date?: string | null
          id?: number
          novel?: boolean | null
          sequence?: number
          series?: string | null
          story?: string
          wiki?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      universes: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_paints: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          paint_id: string
          quantity: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          paint_id: string
          quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          paint_id?: string
          quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_paints_paint_id_fkey"
            columns: ["paint_id"]
            isOneToOne: true
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
      generate_share_token: { Args: never; Returns: string }
      get_storage_box_miniature_counts: {
        Args: { p_box_ids: string[] }
        Returns: {
          storage_box_id: string
          total_quantity: number
        }[]
      }
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

