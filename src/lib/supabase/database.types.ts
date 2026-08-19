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
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json
          id: number
          target_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json
          id?: never
          target_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json
          id?: never
          target_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_verses: {
        Row: {
          arabic_text: string
          ayah_number: number
          created_at: string
          id: number
          surah_name_ar: string
          surah_name_en: string
          surah_number: number
          theme: string | null
        }
        Insert: {
          arabic_text: string
          ayah_number: number
          created_at?: string
          id?: number
          surah_name_ar: string
          surah_name_en: string
          surah_number: number
          theme?: string | null
        }
        Update: {
          arabic_text?: string
          ayah_number?: number
          created_at?: string
          id?: number
          surah_name_ar?: string
          surah_name_en?: string
          surah_number?: number
          theme?: string | null
        }
        Relationships: []
      }
      director_notes: {
        Row: {
          author_id: string | null
          created_at: string
          director_last_seen_at: string | null
          id: string
          member_id: string
          member_last_seen_at: string | null
          member_read_at: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          text: string
          title: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          director_last_seen_at?: string | null
          id?: string
          member_id: string
          member_last_seen_at?: string | null
          member_read_at?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          text: string
          title: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          director_last_seen_at?: string | null
          id?: string
          member_id?: string
          member_last_seen_at?: string | null
          member_read_at?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          text?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "director_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "director_notes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_change_requests: {
        Row: {
          id: string
          new_email: string
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["email_change_status"]
          user_id: string
        }
        Insert: {
          id?: string
          new_email: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["email_change_status"]
          user_id: string
        }
        Update: {
          id?: string
          new_email?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["email_change_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_change_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      file_types: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          key: string
        }
        Insert: {
          color: string
          created_at?: string
          created_by?: string | null
          key: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          key?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string
          created_by: string | null
          drive_url: string
          file_type: string | null
          id: string
          item_id: string
          name_ar: string
          name_en: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          drive_url: string
          file_type?: string | null
          id?: string
          item_id: string
          name_ar: string
          name_en: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          drive_url?: string
          file_type?: string | null
          id?: string
          item_id?: string
          name_ar?: string
          name_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_file_type_fkey"
            columns: ["file_type"]
            isOneToOne: false
            referencedRelation: "file_types"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "files_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          created_at: string
          created_by: string | null
          description_ar: string | null
          description_en: string | null
          drive_url: string | null
          id: string
          name_ar: string
          name_en: string
          section_id: string
          tag: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          drive_url?: string | null
          id?: string
          name_ar: string
          name_en: string
          section_id: string
          tag?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          drive_url?: string | null
          id?: string
          name_ar?: string
          name_en?: string
          section_id?: string
          tag?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_tag_fkey"
            columns: ["tag"]
            isOneToOne: false
            referencedRelation: "file_types"
            referencedColumns: ["key"]
          },
        ]
      }
      member_notes: {
        Row: {
          color: string
          content: string
          created_at: string
          id: string
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          color?: string
          content?: string
          created_at?: string
          id?: string
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_notes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          expires_at: string | null
          id: number
          image_aspect: string
          image_position_x: number
          image_position_y: number
          image_url: string | null
          notified_at: string | null
          publish_at: string | null
          title_ar: string
          title_en: string
          type: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          expires_at?: string | null
          id?: never
          image_aspect?: string
          image_position_x?: number
          image_position_y?: number
          image_url?: string | null
          notified_at?: string | null
          publish_at?: string | null
          title_ar: string
          title_en: string
          type: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          expires_at?: string | null
          id?: never
          image_aspect?: string
          image_position_x?: number
          image_position_y?: number
          image_url?: string | null
          notified_at?: string | null
          publish_at?: string | null
          title_ar?: string
          title_en?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      note_replies: {
        Row: {
          author_id: string | null
          author_role: Database["public"]["Enums"]["note_author_role"]
          created_at: string
          id: string
          note_id: string
          text: string
        }
        Insert: {
          author_id?: string | null
          author_role?: Database["public"]["Enums"]["note_author_role"]
          created_at?: string
          id?: string
          note_id: string
          text: string
        }
        Update: {
          author_id?: string | null
          author_role?: Database["public"]["Enums"]["note_author_role"]
          created_at?: string
          id?: string
          note_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_replies_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "director_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          href: string
          id: string
          is_read: boolean
          read_at: string | null
          recipient_id: string
          resolution_key: string | null
          resolved_at: string | null
          subject: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          href: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          recipient_id: string
          resolution_key?: string | null
          resolved_at?: string | null
          subject?: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          href?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          recipient_id?: string
          resolution_key?: string | null
          resolved_at?: string | null
          subject?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          key: string
          label_ar: string
          label_en: string
          sort_order: number
        }
        Insert: {
          category: string
          key: string
          label_ar: string
          label_en: string
          sort_order?: number
        }
        Update: {
          category?: string
          key?: string
          label_ar?: string
          label_en?: string
          sort_order?: number
        }
        Relationships: []
      }
      platform_team_categories: {
        Row: {
          created_at: string
          id: string
          label_ar: string
          label_en: string
          platform_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          label_ar: string
          label_en: string
          platform_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          label_ar?: string
          label_en?: string
          platform_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_team_categories_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_team_members: {
        Row: {
          category_id: string
          created_at: string
          id: string
          member_id: string
          platform_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          member_id: string
          platform_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          member_id?: string
          platform_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_team_members_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "platform_team_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_team_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_team_members_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      platforms: {
        Row: {
          color: string
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          name_ar: string
          name_en: string
          slug: string
          thumbnail_url: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          name_ar: string
          name_en: string
          slug: string
          thumbnail_url?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          name_ar?: string
          name_en?: string
          slug?: string
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "news_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          access_role: Database["public"]["Enums"]["access_role"]
          approved_at: string | null
          approved_by: string | null
          archive_view_mode: string
          avatar_url: string | null
          color: string
          created_at: string
          deleted_at: string | null
          first_name: string
          id: string
          is_chief: boolean
          is_developer: boolean
          is_suspended: boolean
          job_title_ar: string | null
          job_title_en: string | null
          last_name: string
          last_password_change_at: string | null
          last_password_reset_request_at: string | null
          last_verification_resend_at: string | null
          lock_avatar: boolean
          lock_name: boolean
          rejected_at: string | null
          rejected_by: string | null
          status: Database["public"]["Enums"]["account_status"]
          suspended_by: string | null
          suspended_until: string | null
          updated_at: string
        }
        Insert: {
          access_role?: Database["public"]["Enums"]["access_role"]
          approved_at?: string | null
          approved_by?: string | null
          archive_view_mode?: string
          avatar_url?: string | null
          color?: string
          created_at?: string
          deleted_at?: string | null
          first_name: string
          id: string
          is_chief?: boolean
          is_developer?: boolean
          is_suspended?: boolean
          job_title_ar?: string | null
          job_title_en?: string | null
          last_name: string
          last_password_change_at?: string | null
          last_password_reset_request_at?: string | null
          last_verification_resend_at?: string | null
          lock_avatar?: boolean
          lock_name?: boolean
          rejected_at?: string | null
          rejected_by?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          suspended_by?: string | null
          suspended_until?: string | null
          updated_at?: string
        }
        Update: {
          access_role?: Database["public"]["Enums"]["access_role"]
          approved_at?: string | null
          approved_by?: string | null
          archive_view_mode?: string
          avatar_url?: string | null
          color?: string
          created_at?: string
          deleted_at?: string | null
          first_name?: string
          id?: string
          is_chief?: boolean
          is_developer?: boolean
          is_suspended?: boolean
          job_title_ar?: string | null
          job_title_en?: string | null
          last_name?: string
          last_password_change_at?: string | null
          last_password_reset_request_at?: string | null
          last_verification_resend_at?: string | null
          lock_avatar?: boolean
          lock_name?: boolean
          rejected_at?: string | null
          rejected_by?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          suspended_by?: string | null
          suspended_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          created_at: string
          created_by: string | null
          description_ar: string | null
          description_en: string | null
          icon: string
          id: string
          name_ar: string
          name_en: string
          updated_at: string
          work_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          icon?: string
          id?: string
          name_ar: string
          name_en: string
          updated_at?: string
          work_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          icon?: string
          id?: string
          name_ar?: string
          name_en?: string
          updated_at?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_attempts: {
        Row: {
          email: string
          id: string
          ip_address: unknown
          rejected_at: string
        }
        Insert: {
          email: string
          id?: string
          ip_address?: unknown
          rejected_at?: string
        }
        Update: {
          email?: string
          id?: string
          ip_address?: unknown
          rejected_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          last_rejection_note: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          rejection_seen_at: string | null
          reviewed_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["task_status"]
          submitted_at: string | null
          submitted_note: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          last_rejection_note?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          rejection_seen_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["task_status"]
          submitted_at?: string | null
          submitted_note?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          last_rejection_note?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          rejection_seen_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["task_status"]
          submitted_at?: string | null
          submitted_note?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          permission_key: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          permission_key: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          permission_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      works: {
        Row: {
          created_at: string
          created_by: string | null
          description_ar: string | null
          description_en: string | null
          id: string
          image_url: string | null
          name_ar: string
          name_en: string
          platform_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          image_url?: string | null
          name_ar: string
          name_en: string
          platform_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          image_url?: string | null
          name_ar?: string
          name_en?: string
          platform_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "works_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "works_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_file_type: {
        Args: { p_color: string; p_key: string }
        Returns: {
          color: string
          created_at: string
          created_by: string | null
          key: string
        }
        SetofOptions: {
          from: "*"
          to: "file_types"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_copy_move_archive: {
        Args: { p_platform_id: string; p_user_id: string }
        Returns: boolean
      }
      can_delete_archive: { Args: { p_user_id: string }; Returns: boolean }
      can_edit_identity: {
        Args: { actor: string; target: string }
        Returns: boolean
      }
      can_manage_archive: {
        Args: { p_platform_id: string; p_user_id: string }
        Returns: boolean
      }
      can_manage_member: {
        Args: { actor: string; target: string }
        Returns: boolean
      }
      can_open_member: {
        Args: { actor: string; target: string }
        Returns: boolean
      }
      can_upload_avatar: {
        Args: { actor: string; target: string }
        Returns: boolean
      }
      cleanup_old_notifications: { Args: never; Returns: undefined }
      complete_email_change: { Args: { p_user_id: string }; Returns: boolean }
      copy_files: {
        Args: { p_file_ids: string[]; p_to_item_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          drive_url: string
          file_type: string | null
          id: string
          item_id: string
          name_ar: string
          name_en: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "files"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      copy_items: {
        Args: { p_item_ids: string[]; p_to_section_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          description_ar: string | null
          description_en: string | null
          drive_url: string | null
          id: string
          name_ar: string
          name_en: string
          section_id: string
          tag: string | null
          thumbnail_url: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "items"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      copy_section: {
        Args: { p_section_id: string; p_to_work_id: string }
        Returns: undefined
      }
      delete_file: { Args: { p_file_id: string }; Returns: undefined }
      delete_item: { Args: { p_item_id: string }; Returns: undefined }
      delete_platform: { Args: { p_platform_id: string }; Returns: undefined }
      delete_section: { Args: { p_section_id: string }; Returns: undefined }
      delete_work: { Args: { p_work_id: string }; Returns: undefined }
      get_admin_member_badges: {
        Args: never
        Returns: {
          badge_count: number
          member_id: string
        }[]
      }
      get_all_platform_stats: {
        Args: never
        Returns: {
          files_count: number
          folders_count: number
          platform_id: string
        }[]
      }
      get_all_work_stats: {
        Args: { p_platform_id: string }
        Returns: {
          files_count: number
          sections_count: number
          work_id: string
        }[]
      }
      get_calendar_tasks: {
        Args: { p_end: string; p_member_ids: string[]; p_start: string }
        Returns: {
          end_date: string
          id: string
          member_id: string
          start_date: string
          status: string
          title: string
        }[]
      }
      get_daily_verse: {
        Args: never
        Returns: {
          arabic_text: string
          ayah_number: number
          id: number
          surah_name_ar: string
          surah_name_en: string
          surah_number: number
        }[]
      }
      get_leaderboard: {
        Args: { p_period?: string }
        Returns: {
          avatar_url: string
          color: string
          id: string
          initials: string
          name: string
          rank: number
          score: number
          tasks_completed: number
        }[]
      }
      get_leaderboard_history: {
        Args: { p_period?: string }
        Returns: {
          avatar_url: string
          color: string
          current_streak: number
          initials: string
          member_id: string
          name: string
          times_first: number
          times_second: number
          times_third: number
        }[]
      }
      get_my_deadlines: {
        Args: never
        Returns: {
          deadline_at: string
          id: string
          priority: string
          start_at: string
          title: string
          window_seconds: number
        }[]
      }
      get_news_feed: {
        Args: never
        Returns: {
          author_avatar_url: string
          author_color: string
          author_id: string
          author_initials: string
          author_name: string
          body: string
          created_at: string
          expires_at: string
          id: number
          image_aspect: string
          image_position_x: number
          image_position_y: number
          image_url: string
          is_upcoming: boolean
          liked_by_me: boolean
          likes_count: number
          publish_at: string
          title_ar: string
          title_en: string
          type: string
        }[]
      }
      get_platform_stats: {
        Args: { p_platform_id: string }
        Returns: {
          files_count: number
          folders_count: number
        }[]
      }
      get_studio_pulse_stats: {
        Args: never
        Returns: {
          completion_rate_month_pct: number
          completion_rate_overall_pct: number
          most_active_member_avatar_url: string
          most_active_member_color: string
          most_active_member_id: string
          most_active_member_initials: string
          most_active_member_name: string
          most_active_member_tasks_completed: number
          tasks_completed_this_month: number
        }[]
      }
      get_team_progress: {
        Args: never
        Returns: {
          active_tasks: number
          avatar_url: string
          color: string
          id: string
          initials: string
          job_title_ar: string
          job_title_en: string
          name: string
          progress: number
        }[]
      }
      get_work_stats: {
        Args: { p_work_id: string }
        Returns: {
          files_count: number
          sections_count: number
        }[]
      }
      has_admin_capability: { Args: { p_key: string }; Returns: boolean }
      has_permission: {
        Args: { perm_key: string; uid: string }
        Returns: boolean
      }
      is_active_member: { Args: never; Returns: boolean }
      is_active_user: { Args: { uid: string }; Returns: boolean }
      is_admin: { Args: { uid: string }; Returns: boolean }
      is_chief: { Args: { uid: string }; Returns: boolean }
      is_developer: { Args: { uid?: string }; Returns: boolean }
      is_effectively_suspended: { Args: { uid: string }; Returns: boolean }
      is_platform_member: {
        Args: { p_platform_id: string; p_user_id: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: { p_action: string; p_details?: Json; p_target_id: string }
        Returns: undefined
      }
      mark_note_seen: { Args: { p_note_id: string }; Returns: undefined }
      move_files: {
        Args: { p_file_ids: string[]; p_to_item_id: string }
        Returns: undefined
      }
      move_items: {
        Args: { p_item_ids: string[]; p_to_section_id: string }
        Returns: undefined
      }
      move_section: {
        Args: { p_section_id: string; p_to_work_id: string }
        Returns: undefined
      }
      notify_all_active: {
        Args: {
          p_actor: string
          p_entity_id: string
          p_entity_type: string
          p_exclude?: string
          p_href: string
          p_subject: string
          p_type: Database["public"]["Enums"]["notification_type"]
        }
        Returns: undefined
      }
      notify_due_news_posts: { Args: never; Returns: number }
      notify_permitted: {
        Args: {
          p_actor: string
          p_entity_id: string
          p_entity_type: string
          p_exclude?: string
          p_href: string
          p_permission: string
          p_resolution_key?: string
          p_subject: string
          p_type: Database["public"]["Enums"]["notification_type"]
        }
        Returns: undefined
      }
      notify_user: {
        Args: {
          p_actor: string
          p_entity_id: string
          p_entity_type: string
          p_href: string
          p_recipient: string
          p_resolution_key?: string
          p_subject: string
          p_type: Database["public"]["Enums"]["notification_type"]
        }
        Returns: undefined
      }
      purge_deleted_profiles: { Args: never; Returns: number }
      purge_old_notifications: { Args: never; Returns: number }
      request_password_reset: { Args: { p_email: string }; Returns: boolean }
      resolve_notification_group: {
        Args: { p_key: string; p_resolver: string }
        Returns: number
      }
      set_archive_view_mode: { Args: { p_mode: string }; Returns: undefined }
      shares_platform_with: {
        Args: { p_actor_id: string; p_target_id: string }
        Returns: boolean
      }
      stamp_password_change: { Args: { p_user_id: string }; Returns: undefined }
      toggle_post_like: {
        Args: { p_post_id: number }
        Returns: {
          liked: boolean
          likes_count: number
        }[]
      }
    }
    Enums: {
      access_role: "member" | "admin"
      account_status: "pending_approval" | "active" | "rejected"
      email_change_status:
        | "pending_admin"
        | "pending_email_verification"
        | "completed"
      note_author_role: "director" | "member"
      notification_type:
        | "task_assigned"
        | "note_received"
        | "note_reply"
        | "signup_pending"
        | "signup_resolved"
        | "account_approved"
        | "account_rejected"
        | "email_change_pending"
        | "email_change_approved"
        | "email_change_rejected"
        | "news_published"
        | "task_submitted"
        | "task_approved"
        | "task_rejected"
      task_priority: "low" | "medium" | "high"
      task_status: "open" | "done" | "pending_review"
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
      access_role: ["member", "admin"],
      account_status: ["pending_approval", "active", "rejected"],
      email_change_status: [
        "pending_admin",
        "pending_email_verification",
        "completed",
      ],
      note_author_role: ["director", "member"],
      notification_type: [
        "task_assigned",
        "note_received",
        "note_reply",
        "signup_pending",
        "signup_resolved",
        "account_approved",
        "account_rejected",
        "email_change_pending",
        "email_change_approved",
        "email_change_rejected",
        "news_published",
        "task_submitted",
        "task_approved",
        "task_rejected",
      ],
      task_priority: ["low", "medium", "high"],
      task_status: ["open", "done", "pending_review"],
    },
  },
} as const
