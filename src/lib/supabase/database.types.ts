/**
 * Database types.
 *
 * Hand-written to match supabase/migrations, so the app typechecks before a
 * Supabase project exists. Once the project is linked, regenerate with
 * `npm run db:types` and this file is replaced by the generated output.
 */

export type ActivityStatus = 'published' | 'cancelled' | 'hidden' | 'deleted'
export type ActivityLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels'
export type JoinRequestStatus = 'pending' | 'approved' | 'declined' | 'withdrawn'
export type ReportTarget = 'activity' | 'comment' | 'user'
export type ReportStatus = 'open' | 'reviewing' | 'actioned' | 'dismissed'

type ActivityRow = {
  id: string
  owner_id: string
  city_id: string
  sport_key: string
  title: string
  description: string | null
  starts_at: string
  /** PostGIS geography; opaque over the wire. Read coordinates via nearby_activities. */
  meeting_point: unknown
  location_label: string
  visibility_radius_m: number
  distance_m: number | null
  pace_seconds_per_km: number | null
  level: ActivityLevel | null
  max_participants: number
  status: ActivityStatus
  created_at: string
  updated_at: string
}

type ProfileRow = {
  id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  city_id: string | null
  strava_athlete_id: number | null
  strava_connected: boolean
  created_at: string
  updated_at: string
}

type CommentRow = {
  id: string
  activity_id: string
  author_id: string
  body: string
  created_at: string
  deleted_at: string | null
  deleted_by: string | null
}

type JoinRequestRow = {
  id: string
  activity_id: string
  user_id: string
  status: JoinRequestStatus
  message: string | null
  created_at: string
  decided_at: string | null
}

type CityRow = {
  id: string
  slug: string
  name: string
  country_code: string
  center: unknown
  default_radius_m: number
  timezone: string
  is_active: boolean
  created_at: string
}

type SportRow = {
  key: string
  label: string
  sort_order: number
  supports_distance: boolean
  supports_pace: boolean
  is_active: boolean
}

type ReportRow = {
  id: string
  reporter_id: string
  target_type: ReportTarget
  target_id: string
  reason: string
  details: string | null
  status: ReportStatus
  created_at: string
}

type BlockRow = {
  blocker_id: string
  blocked_id: string
  created_at: string
}

type ActivityEventRow = {
  id: number
  event_type: string
  activity_id: string | null
  user_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

/** One row of the nearby_activities RPC — the shape the feed renders. */
export type NearbyActivityRow = {
  id: string
  owner_id: string
  sport_key: string
  title: string
  description: string | null
  starts_at: string
  location_label: string
  approx_lat: number
  approx_lng: number
  /** Rounded to 100 m; format with formatDistanceBucket before display. */
  distance_meters: number
  visibility_radius_m: number
  activity_distance_m: number | null
  pace_seconds_per_km: number | null
  level: ActivityLevel | null
  max_participants: number
  status: ActivityStatus
  participant_count: number
  comment_count: number
  owner_display_name: string
  owner_avatar_url: string | null
  owner_strava_connected: boolean
}

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      activities: Table<
        ActivityRow,
        Omit<ActivityRow, 'id' | 'created_at' | 'updated_at'> & { id?: string }
      >
      profiles: Table<ProfileRow>
      comments: Table<
        CommentRow,
        Pick<CommentRow, 'activity_id' | 'author_id' | 'body'> & { id?: string }
      >
      join_requests: Table<
        JoinRequestRow,
        Pick<JoinRequestRow, 'activity_id' | 'user_id'> & {
          id?: string
          status?: JoinRequestStatus
          message?: string | null
        }
      >
      cities: Table<CityRow>
      sports: Table<SportRow>
      reports: Table<
        ReportRow,
        Pick<ReportRow, 'reporter_id' | 'target_type' | 'target_id' | 'reason'> & {
          details?: string | null
        }
      >
      blocks: Table<BlockRow, Pick<BlockRow, 'blocker_id' | 'blocked_id'>>
      activity_events: Table<
        ActivityEventRow,
        Pick<ActivityEventRow, 'event_type'> & {
          activity_id?: string | null
          user_id?: string | null
          metadata?: Record<string, unknown>
        }
      >
    }
    Views: Record<string, never>
    Functions: {
      nearby_activities: {
        Args: {
          p_lat: number
          p_lng: number
          p_radius_m?: number
          p_sports?: string[] | null
          p_from?: string | null
          p_to?: string | null
          p_sort?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: NearbyActivityRow[]
      }
      delete_comment: {
        Args: { p_comment_id: string }
        Returns: undefined
      }
      activity_participant_count: {
        Args: { p_activity_id: string }
        Returns: number
      }
      activity_comment_count: {
        Args: { p_activity_id: string }
        Returns: number
      }
    }
    Enums: {
      activity_status: ActivityStatus
      activity_level: ActivityLevel
      join_request_status: JoinRequestStatus
      report_target: ReportTarget
      report_status: ReportStatus
    }
    CompositeTypes: Record<string, never>
  }
}
