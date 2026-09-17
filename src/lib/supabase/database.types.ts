export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

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
      activities: {
        Row: {
          city_id: string
          created_at: string
          description: string | null
          distance_m: number | null
          id: string
          level: Database['public']['Enums']['activity_level'] | null
          location_label: string
          max_participants: number | null
          meeting_point: unknown
          owner_id: string | null
          pace_seconds_per_km: number | null
          sport_key: string
          starts_at: string
          status: Database['public']['Enums']['activity_status']
          title: string
          updated_at: string
          visibility_radius_m: number
        }
        Insert: {
          city_id: string
          created_at?: string
          description?: string | null
          distance_m?: number | null
          id?: string
          level?: Database['public']['Enums']['activity_level'] | null
          location_label: string
          max_participants?: number | null
          meeting_point: unknown
          owner_id?: string | null
          pace_seconds_per_km?: number | null
          sport_key: string
          starts_at: string
          status?: Database['public']['Enums']['activity_status']
          title: string
          updated_at?: string
          visibility_radius_m?: number
        }
        Update: {
          city_id?: string
          created_at?: string
          description?: string | null
          distance_m?: number | null
          id?: string
          level?: Database['public']['Enums']['activity_level'] | null
          location_label?: string
          max_participants?: number | null
          meeting_point?: unknown
          owner_id?: string | null
          pace_seconds_per_km?: number | null
          sport_key?: string
          starts_at?: string
          status?: Database['public']['Enums']['activity_status']
          title?: string
          updated_at?: string
          visibility_radius_m?: number
        }
        Relationships: [
          {
            foreignKeyName: 'activities_city_id_fkey'
            columns: ['city_id']
            isOneToOne: false
            referencedRelation: 'cities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activities_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activities_sport_key_fkey'
            columns: ['sport_key']
            isOneToOne: false
            referencedRelation: 'sports'
            referencedColumns: ['key']
          },
        ]
      }
      activity_events: {
        Row: {
          activity_id: string | null
          created_at: string
          event_type: string
          id: number
          metadata: Json
          user_id: string | null
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          event_type: string
          id?: never
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          event_type?: string
          id?: never
          metadata?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'activity_events_activity_id_fkey'
            columns: ['activity_id']
            isOneToOne: false
            referencedRelation: 'activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_events_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'blocks_blocked_id_fkey'
            columns: ['blocked_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'blocks_blocker_id_fkey'
            columns: ['blocker_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      cities: {
        Row: {
          center: unknown
          country_code: string
          created_at: string
          default_radius_m: number
          id: string
          is_active: boolean
          name: string
          slug: string
          timezone: string
        }
        Insert: {
          center: unknown
          country_code: string
          created_at?: string
          default_radius_m?: number
          id?: string
          is_active?: boolean
          name: string
          slug: string
          timezone?: string
        }
        Update: {
          center?: unknown
          country_code?: string
          created_at?: string
          default_radius_m?: number
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          timezone?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          activity_id: string
          author_id: string | null
          body: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
        }
        Insert: {
          activity_id: string
          author_id?: string | null
          body: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
        }
        Update: {
          activity_id?: string
          author_id?: string | null
          body?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comments_activity_id_fkey'
            columns: ['activity_id']
            isOneToOne: false
            referencedRelation: 'activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_deleted_by_fkey'
            columns: ['deleted_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      join_requests: {
        Row: {
          activity_id: string
          created_at: string
          decided_at: string | null
          id: string
          message: string | null
          status: Database['public']['Enums']['join_request_status']
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          decided_at?: string | null
          id?: string
          message?: string | null
          status?: Database['public']['Enums']['join_request_status']
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          decided_at?: string | null
          id?: string
          message?: string | null
          status?: Database['public']['Enums']['join_request_status']
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'join_requests_activity_id_fkey'
            columns: ['activity_id']
            isOneToOne: false
            referencedRelation: 'activities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'join_requests_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city_id: string | null
          created_at: string
          display_name: string
          id: string
          is_admin: boolean
          strava_athlete_id: number | null
          strava_connected: boolean
          strava_profile_consent_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city_id?: string | null
          created_at?: string
          display_name: string
          id: string
          is_admin?: boolean
          strava_athlete_id?: number | null
          strava_connected?: boolean
          strava_profile_consent_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_admin?: boolean
          strava_athlete_id?: number | null
          strava_connected?: boolean
          strava_profile_consent_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_city_id_fkey'
            columns: ['city_id']
            isOneToOne: false
            referencedRelation: 'cities'
            referencedColumns: ['id']
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket: string
          hits: number
          subject: string
          window_start: string
        }
        Insert: {
          bucket: string
          hits?: number
          subject: string
          window_start: string
        }
        Update: {
          bucket?: string
          hits?: number
          subject?: string
          window_start?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string | null
          status: Database['public']['Enums']['report_status']
          target_id: string
          target_type: Database['public']['Enums']['report_target']
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          status?: Database['public']['Enums']['report_status']
          target_id: string
          target_type: Database['public']['Enums']['report_target']
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          status?: Database['public']['Enums']['report_status']
          target_id?: string
          target_type?: Database['public']['Enums']['report_target']
        }
        Relationships: [
          {
            foreignKeyName: 'reports_reporter_id_fkey'
            columns: ['reporter_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      sports: {
        Row: {
          is_active: boolean
          key: string
          label: string
          sort_order: number
          supports_distance: boolean
          supports_pace: boolean
        }
        Insert: {
          is_active?: boolean
          key: string
          label: string
          sort_order: number
          supports_distance?: boolean
          supports_pace?: boolean
        }
        Update: {
          is_active?: boolean
          key?: string
          label?: string
          sort_order?: number
          supports_distance?: boolean
          supports_pace?: boolean
        }
        Relationships: []
      }
      strava_profile_staging: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          fetched_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          fetched_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          fetched_at?: string
          user_id?: string
        }
        Relationships: []
      }
      strava_tokens: {
        Row: {
          access_token: string
          expires_at: string
          refresh_token: string
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          expires_at: string
          refresh_token: string
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          expires_at?: string
          refresh_token?: string
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      account_deletion_summary: {
        Args: never
        Returns: {
          affected_participants: number
          comments_written: number
          upcoming_activities: number
        }[]
      }
      activity_comment_count: {
        Args: { p_activity_id: string }
        Returns: number
      }
      activity_coordinates: {
        Args: { p_activity_id: string }
        Returns: {
          lat: number
          lng: number
        }[]
      }
      activity_participant_count: {
        Args: { p_activity_id: string }
        Returns: number
      }
      activity_roster: {
        Args: { p_activity_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          message: string
          request_id: string
          status: Database['public']['Enums']['join_request_status']
          strava_connected: boolean
          user_id: string
        }[]
      }
      block_user: { Args: { p_blocked_id: string }; Returns: undefined }
      blocked_accounts: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          user_id: string
        }[]
      }
      consume_rate_limit: {
        Args: { p_bucket: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      decide_join_request: {
        Args: { p_approve: boolean; p_request_id: string }
        Returns: Database['public']['Enums']['join_request_status']
      }
      delete_comment: { Args: { p_comment_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_blocked_between: {
        Args: { p_a: string; p_b: string }
        Returns: boolean
      }
      metrics_by_sport: {
        Args: never
        Returns: {
          activities_created: number
          sport_key: string
        }[]
      }
      metrics_daily: {
        Args: { p_days?: number }
        Returns: {
          activities_created: number
          day: string
        }[]
      }
      metrics_summary: {
        Args: never
        Returns: {
          activities_created_30d: number
          activities_created_7d: number
          activities_created_total: number
          activities_live: number
          activities_upcoming: number
          comments_total: number
          creators_7d: number
          creators_total: number
          join_requests_approved: number
          join_requests_total: number
          reports_open: number
        }[]
      }
      nearby_activities: {
        Args: {
          p_from?: string
          p_lat: number
          p_limit?: number
          p_lng: number
          p_offset?: number
          p_radius_m?: number
          p_sort?: string
          p_sports?: string[]
          p_to?: string
        }
        Returns: {
          activity_distance_m: number
          approx_lat: number
          approx_lng: number
          comment_count: number
          description: string
          distance_meters: number
          id: string
          level: Database['public']['Enums']['activity_level']
          location_label: string
          max_participants: number
          owner_avatar_url: string
          owner_display_name: string
          owner_id: string
          owner_strava_connected: boolean
          pace_seconds_per_km: number
          participant_count: number
          sport_key: string
          starts_at: string
          status: Database['public']['Enums']['activity_status']
          title: string
          visibility_radius_m: number
        }[]
      }
      prepare_account_deletion: { Args: never; Returns: string[] }
      request_to_join: {
        Args: { p_activity_id: string; p_message?: string }
        Returns: Database['public']['Enums']['join_request_status']
      }
      snap_point_to_grid: {
        Args: { p_grid_m?: number; p_point: unknown }
        Returns: unknown
      }
      submit_report: {
        Args: {
          p_details?: string
          p_reason: string
          p_target_id: string
          p_target_type: Database['public']['Enums']['report_target']
        }
        Returns: undefined
      }
      unblock_user: { Args: { p_blocked_id: string }; Returns: undefined }
      withdraw_join_request: {
        Args: { p_activity_id: string }
        Returns: undefined
      }
    }
    Enums: {
      activity_level: 'beginner' | 'intermediate' | 'advanced' | 'all_levels'
      activity_status: 'published' | 'cancelled' | 'hidden' | 'deleted'
      join_request_status: 'pending' | 'approved' | 'declined' | 'withdrawn'
      report_status: 'open' | 'reviewing' | 'actioned' | 'dismissed'
      report_target: 'activity' | 'comment' | 'user'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_level: ['beginner', 'intermediate', 'advanced', 'all_levels'],
      activity_status: ['published', 'cancelled', 'hidden', 'deleted'],
      join_request_status: ['pending', 'approved', 'declined', 'withdrawn'],
      report_status: ['open', 'reviewing', 'actioned', 'dismissed'],
      report_target: ['activity', 'comment', 'user'],
    },
  },
} as const
