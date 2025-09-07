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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          color_class: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color_class?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color_class?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          dislike_count: number | null
          edited_at: string | null
          id: string
          is_edited: boolean | null
          like_count: number | null
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          dislike_count?: number | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          like_count?: number | null
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          dislike_count?: number | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          like_count?: number | null
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_media: {
        Row: {
          created_at: string
          draft_id: string | null
          file_id: string
          file_size: number | null
          id: string
          mime_type: string | null
          order_index: number | null
          status: Database["public"]["Enums"]["media_status"]
          thumbnail_url: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          draft_id?: string | null
          file_id: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          order_index?: number | null
          status?: Database["public"]["Enums"]["media_status"]
          thumbnail_url?: string | null
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          draft_id?: string | null
          file_id?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          order_index?: number | null
          status?: Database["public"]["Enums"]["media_status"]
          thumbnail_url?: string | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_media_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "post_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string
          status: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          category_id: string
          created_at: string
          creator_id: string
          description: string | null
          id: string
          is_approved: boolean
          is_public: boolean
          member_count: number | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          is_approved?: boolean
          is_public?: boolean
          member_count?: number | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          is_approved?: boolean
          is_public?: boolean
          member_count?: number | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          author: string | null
          category_id: string
          content: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          like_count: number | null
          published_at: string
          source_id: string
          tags: string[] | null
          title: string
          updated_at: string
          url: string
          view_count: number | null
        }
        Insert: {
          author?: string | null
          category_id: string
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          like_count?: number | null
          published_at: string
          source_id: string
          tags?: string[] | null
          title: string
          updated_at?: string
          url: string
          view_count?: number | null
        }
        Update: {
          author?: string | null
          category_id?: string
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          like_count?: number | null
          published_at?: string
          source_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          url?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "news_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "news_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_articles_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "news_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      news_categories: {
        Row: {
          color_class: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color_class?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color_class?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      news_sources: {
        Row: {
          created_at: string
          description: string | null
          domain: string
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          domain: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          domain?: string
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_drafts: {
        Row: {
          content: string | null
          created_at: string
          group_id: string | null
          id: string
          metadata: Json | null
          status: Database["public"]["Enums"]["draft_status"]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["draft_status"]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["draft_status"]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_drafts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string
          file_id: string
          file_size: number | null
          id: string
          mime_type: string | null
          post_id: string
          status: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          file_id: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          post_id: string
          status?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          file_id?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          post_id?: string
          status?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          comment_count: number | null
          content: string | null
          created_at: string
          dislike_count: number | null
          edited_at: string | null
          group_id: string
          id: string
          is_edited: boolean | null
          is_pinned: boolean | null
          like_count: number | null
          media_thumbnail: string | null
          media_type: string | null
          media_url: string | null
          poll_options: Json | null
          poll_question: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_count?: number | null
          content?: string | null
          created_at?: string
          dislike_count?: number | null
          edited_at?: string | null
          group_id: string
          id?: string
          is_edited?: boolean | null
          is_pinned?: boolean | null
          like_count?: number | null
          media_thumbnail?: string | null
          media_type?: string | null
          media_url?: string | null
          poll_options?: Json | null
          poll_question?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_count?: number | null
          content?: string | null
          created_at?: string
          dislike_count?: number | null
          edited_at?: string | null
          group_id?: string
          id?: string
          is_edited?: boolean | null
          is_pinned?: boolean | null
          like_count?: number | null
          media_thumbnail?: string | null
          media_type?: string | null
          media_url?: string | null
          poll_options?: Json | null
          poll_question?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          reaction_type: string
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      draft_status: "editing" | "scheduled" | "published" | "discarded"
      media_status: "pending" | "uploaded" | "attached" | "expired" | "failed"
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
      app_role: ["admin", "moderator", "user"],
      draft_status: ["editing", "scheduled", "published", "discarded"],
      media_status: ["pending", "uploaded", "attached", "expired", "failed"],
    },
  },
} as const
