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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      assistant_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      book_chapters: {
        Row: {
          content: string
          created_at: string
          id: string
          idx: number
          keywords: string[] | null
          post_id: string
          summary: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          idx: number
          keywords?: string[] | null
          post_id: string
          summary?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          idx?: number
          keywords?: string[] | null
          post_id?: string
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_chapters_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      book_flashcards: {
        Row: {
          answer: string
          created_at: string
          id: string
          language: string
          post_id: string
          question: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          language?: string
          post_id: string
          question: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          language?: string
          post_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_flashcards_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      book_highlights: {
        Row: {
          chapter_id: string | null
          color: string
          created_at: string
          id: string
          note: string | null
          post_id: string
          text: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          color?: string
          created_at?: string
          id?: string
          note?: string | null
          post_id: string
          text: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          color?: string
          created_at?: string
          id?: string
          note?: string | null
          post_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_highlights_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "book_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_highlights_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      book_notes: {
        Row: {
          body: string
          chapter_id: string | null
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          chapter_id?: string | null
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          chapter_id?: string | null
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_notes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "book_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_notes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      book_quizzes: {
        Row: {
          correct_index: number
          created_at: string
          explanation: string | null
          id: string
          language: string
          options: Json
          post_id: string
          question: string
        }
        Insert: {
          correct_index: number
          created_at?: string
          explanation?: string | null
          id?: string
          language?: string
          options: Json
          post_id: string
          question: string
        }
        Update: {
          correct_index?: number
          created_at?: string
          explanation?: string | null
          id?: string
          language?: string
          options?: Json
          post_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_quizzes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
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
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content_id: string | null
          created_at: string
          id: string
          message: string | null
          post_id: string | null
          read_status: boolean
          receiver_id: string
          sender_id: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          post_id?: string | null
          read_status?: boolean
          receiver_id: string
          sender_id?: string | null
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          content_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          post_id?: string | null
          read_status?: boolean
          receiver_id?: string
          sender_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_knowledge: {
        Row: {
          created_at: string
          language: string
          payload: Json
          post_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          language: string
          payload: Json
          post_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          language?: string
          payload?: Json
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_knowledge_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_summaries: {
        Row: {
          content: string
          created_at: string
          language: string
          length: string
          post_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          language: string
          length: string
          post_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          language?: string
          length?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_summaries_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_translations: {
        Row: {
          content: string
          created_at: string
          id: string
          language: Database["public"]["Enums"]["language_code"]
          post_id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          language: Database["public"]["Enums"]["language_code"]
          post_id: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          language?: Database["public"]["Enums"]["language_code"]
          post_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_translations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          ai_error: string | null
          ai_metadata: Json | null
          ai_status: string
          author_id: string
          category: string
          content: string
          cover_image_url: string | null
          created_at: string
          difficulty: string | null
          excerpt: string | null
          id: string
          keywords: string[] | null
          original_language: Database["public"]["Enums"]["language_code"]
          pdf_url: string | null
          published: boolean
          reading_minutes: number | null
          title: string
          topics: string[] | null
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
        }
        Insert: {
          ai_error?: string | null
          ai_metadata?: Json | null
          ai_status?: string
          author_id: string
          category: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          difficulty?: string | null
          excerpt?: string | null
          id?: string
          keywords?: string[] | null
          original_language?: Database["public"]["Enums"]["language_code"]
          pdf_url?: string | null
          published?: boolean
          reading_minutes?: number | null
          title: string
          topics?: string[] | null
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string
        }
        Update: {
          ai_error?: string | null
          ai_metadata?: Json | null
          ai_status?: string
          author_id?: string
          category?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          difficulty?: string | null
          excerpt?: string | null
          id?: string
          keywords?: string[] | null
          original_language?: Database["public"]["Enums"]["language_code"]
          pdf_url?: string | null
          published?: boolean
          reading_minutes?: number | null
          title?: string
          topics?: string[] | null
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          interests: string[]
          preferred_languages: Database["public"]["Enums"]["language_code"][]
          updated_at: string
          username: string
          verified: boolean
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          interests?: string[]
          preferred_languages?: Database["public"]["Enums"]["language_code"][]
          updated_at?: string
          username: string
          verified?: boolean
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          interests?: string[]
          preferred_languages?: Database["public"]["Enums"]["language_code"][]
          updated_at?: string
          username?: string
          verified?: boolean
        }
        Relationships: []
      }
      reading_history: {
        Row: {
          last_read_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_history_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_progress: {
        Row: {
          chapter_id: string | null
          chapter_idx: number | null
          id: string
          percent: number | null
          post_id: string
          scroll_ratio: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_id?: string | null
          chapter_idx?: number | null
          id?: string
          percent?: number | null
          post_id: string
          scroll_ratio?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_id?: string | null
          chapter_idx?: number | null
          id?: string
          percent?: number | null
          post_id?: string
          scroll_ratio?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "book_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_progress_post_id_fkey"
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      content_type: "article" | "story" | "book"
      language_code: "en" | "ur" | "ps" | "ar" | "tr"
      notification_type:
        | "like"
        | "comment"
        | "reply"
        | "follow"
        | "verification"
        | "book"
        | "article"
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
      app_role: ["admin", "moderator", "user"],
      content_type: ["article", "story", "book"],
      language_code: ["en", "ur", "ps", "ar", "tr"],
      notification_type: [
        "like",
        "comment",
        "reply",
        "follow",
        "verification",
        "book",
        "article",
      ],
    },
  },
} as const
