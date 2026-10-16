export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
      access_audit_logs: {
        Row: {
          actor_id: string;
          after_state: NonNullable<Json>;
          before_state: NonNullable<Json>;
          created_at: string;
          id: string;
          reason: string;
          subject_id: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id: string;
          after_state: NonNullable<Json>;
          before_state: NonNullable<Json>;
          created_at?: string;
          id?: string;
          reason: string;
          subject_id: string;
        };
        Update: {
          actor_id?: string;
          after_state?: NonNullable<Json>;
          before_state?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          reason?: string;
          subject_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "access_audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_audit_logs_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      assignments: {
        Row: {
          assigned_at: string;
          assigned_by: string;
          ended_at: string | null;
          id: string;
          incident_id: string;
          owner_id: string;
          reason: string;
          team_id: string;
        };
        ComputedFields: never;
        Insert: {
          assigned_at?: string;
          assigned_by: string;
          ended_at?: string | null;
          id?: string;
          incident_id: string;
          owner_id: string;
          reason: string;
          team_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string;
          ended_at?: string | null;
          id?: string;
          incident_id?: string;
          owner_id?: string;
          reason?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_incident_id_fkey";
            columns: ["incident_id"];
            isOneToOne: false;
            referencedRelation: "incidents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      districts: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          boundary_version: string;
          code: string;
          created_at: string;
          data_mode: Database["public"]["Enums"]["data_mode"];
          geometry: unknown;
          id: string;
          license: string;
          name: string;
          province_code: string;
          source: string;
          source_url: string | null;
        };
        ComputedFields: never;
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          boundary_version: string;
          code: string;
          created_at?: string;
          data_mode: Database["public"]["Enums"]["data_mode"];
          geometry: unknown;
          id?: string;
          license: string;
          name: string;
          province_code: string;
          source: string;
          source_url?: string | null;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          boundary_version?: string;
          code?: string;
          created_at?: string;
          data_mode?: Database["public"]["Enums"]["data_mode"];
          geometry?: unknown;
          id?: string;
          license?: string;
          name?: string;
          province_code?: string;
          source?: string;
          source_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "districts_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      evidence_files: {
        Row: {
          captured_at: string;
          created_at: string;
          description: string;
          id: string;
          incident_id: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          uploaded_by: string;
        };
        ComputedFields: never;
        Insert: {
          captured_at: string;
          created_at?: string;
          description: string;
          id?: string;
          incident_id: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          uploaded_by: string;
        };
        Update: {
          captured_at?: string;
          created_at?: string;
          description?: string;
          id?: string;
          incident_id?: string;
          mime_type?: string;
          size_bytes?: number;
          storage_path?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evidence_files_incident_id_fkey";
            columns: ["incident_id"];
            isOneToOne: false;
            referencedRelation: "incidents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evidence_files_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      hotspot_observations: {
        Row: {
          brightness: number | null;
          confidence_kind: string | null;
          confidence_raw: string | null;
          created_at: string;
          data_mode: Database["public"]["Enums"]["data_mode"];
          detected_at: string;
          district_id: string | null;
          frp: number | null;
          geom: unknown;
          id: string;
          ingest_run_id: string | null;
          instrument: string;
          last_seen_at: string;
          latitude: number;
          longitude: number;
          observation_key: string;
          raw_payload: NonNullable<Json>;
          received_at: string;
          satellite: string;
          source: string;
        };
        ComputedFields: never;
        Insert: {
          brightness?: number | null;
          confidence_kind?: string | null;
          confidence_raw?: string | null;
          created_at?: string;
          data_mode: Database["public"]["Enums"]["data_mode"];
          detected_at: string;
          district_id?: string | null;
          frp?: number | null;
          geom?: never;
          id?: string;
          ingest_run_id?: string | null;
          instrument: string;
          last_seen_at?: string;
          latitude: number;
          longitude: number;
          observation_key: string;
          raw_payload: NonNullable<Json>;
          received_at?: string;
          satellite: string;
          source: string;
        };
        Update: {
          brightness?: number | null;
          confidence_kind?: string | null;
          confidence_raw?: string | null;
          created_at?: string;
          data_mode?: Database["public"]["Enums"]["data_mode"];
          detected_at?: string;
          district_id?: string | null;
          frp?: number | null;
          geom?: never;
          id?: string;
          ingest_run_id?: string | null;
          instrument?: string;
          last_seen_at?: string;
          latitude?: number;
          longitude?: number;
          observation_key?: string;
          raw_payload?: NonNullable<Json>;
          received_at?: string;
          satellite?: string;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hotspot_observations_district_id_data_mode_fkey";
            columns: ["district_id", "data_mode"];
            isOneToOne: false;
            referencedRelation: "districts";
            referencedColumns: ["id", "data_mode"];
          },
          {
            foreignKeyName: "hotspot_observations_ingest_run_id_data_mode_source_fkey";
            columns: ["ingest_run_id", "data_mode", "source"];
            isOneToOne: false;
            referencedRelation: "ingest_runs";
            referencedColumns: ["id", "data_mode", "source"];
          },
        ];
      };
      incident_events: {
        Row: {
          actor_id: string;
          created_at: string;
          event_type: string;
          id: string;
          incident_id: string;
          new_value: NonNullable<Json>;
          note: string;
          previous_value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          actor_id: string;
          created_at?: string;
          event_type: string;
          id?: string;
          incident_id: string;
          new_value?: NonNullable<Json>;
          note: string;
          previous_value?: NonNullable<Json>;
        };
        Update: {
          actor_id?: string;
          created_at?: string;
          event_type?: string;
          id?: string;
          incident_id?: string;
          new_value?: NonNullable<Json>;
          note?: string;
          previous_value?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "incident_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incident_events_incident_id_fkey";
            columns: ["incident_id"];
            isOneToOne: false;
            referencedRelation: "incidents";
            referencedColumns: ["id"];
          },
        ];
      };
      incident_observations: {
        Row: {
          data_mode: Database["public"]["Enums"]["data_mode"];
          incident_id: string;
          linked_at: string;
          linked_by: string;
          observation_id: string;
        };
        ComputedFields: never;
        Insert: {
          data_mode: Database["public"]["Enums"]["data_mode"];
          incident_id: string;
          linked_at?: string;
          linked_by: string;
          observation_id: string;
        };
        Update: {
          data_mode?: Database["public"]["Enums"]["data_mode"];
          incident_id?: string;
          linked_at?: string;
          linked_by?: string;
          observation_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "incident_observations_incident_id_data_mode_fkey";
            columns: ["incident_id", "data_mode"];
            isOneToOne: false;
            referencedRelation: "incidents";
            referencedColumns: ["id", "data_mode"];
          },
          {
            foreignKeyName: "incident_observations_linked_by_fkey";
            columns: ["linked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incident_observations_observation_id_data_mode_fkey";
            columns: ["observation_id", "data_mode"];
            isOneToOne: false;
            referencedRelation: "hotspot_observations";
            referencedColumns: ["id", "data_mode"];
          },
        ];
      };
      incidents: {
        Row: {
          created_at: string;
          created_by: string;
          current_status: Database["public"]["Enums"]["incident_status"];
          data_mode: Database["public"]["Enums"]["data_mode"];
          description: string;
          district_id: string;
          final_priority: Database["public"]["Enums"]["priority_level"];
          id: string;
          latitude: number;
          longitude: number;
          priority_reason: string | null;
          priority_ruleset_version: string | null;
          recommended_priority: Database["public"]["Enums"]["priority_level"];
          reference: string;
          representative_location: unknown;
          row_version: number;
          title: string;
          updated_at: string;
          verification_status: Database["public"]["Enums"]["verification_status"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by: string;
          current_status?: Database["public"]["Enums"]["incident_status"];
          data_mode: Database["public"]["Enums"]["data_mode"];
          description?: string;
          district_id: string;
          final_priority?: Database["public"]["Enums"]["priority_level"];
          id?: string;
          latitude: number;
          longitude: number;
          priority_reason?: string | null;
          priority_ruleset_version?: string | null;
          recommended_priority?: Database["public"]["Enums"]["priority_level"];
          reference: string;
          representative_location?: never;
          row_version?: number;
          title: string;
          updated_at?: string;
          verification_status?: Database["public"]["Enums"]["verification_status"];
        };
        Update: {
          created_at?: string;
          created_by?: string;
          current_status?: Database["public"]["Enums"]["incident_status"];
          data_mode?: Database["public"]["Enums"]["data_mode"];
          description?: string;
          district_id?: string;
          final_priority?: Database["public"]["Enums"]["priority_level"];
          id?: string;
          latitude?: number;
          longitude?: number;
          priority_reason?: string | null;
          priority_ruleset_version?: string | null;
          recommended_priority?: Database["public"]["Enums"]["priority_level"];
          reference?: string;
          representative_location?: never;
          row_version?: number;
          title?: string;
          updated_at?: string;
          verification_status?: Database["public"]["Enums"]["verification_status"];
        };
        Relationships: [
          {
            foreignKeyName: "incidents_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_district_id_data_mode_fkey";
            columns: ["district_id", "data_mode"];
            isOneToOne: false;
            referencedRelation: "districts";
            referencedColumns: ["id", "data_mode"];
          },
        ];
      };
      ingest_runs: {
        Row: {
          data_mode: Database["public"]["Enums"]["data_mode"];
          error_summary: string | null;
          finished_at: string | null;
          id: string;
          rows_inserted: number;
          rows_seen: number;
          rows_updated: number;
          source: string;
          source_window_end: string;
          source_window_start: string;
          started_at: string;
          status: Database["public"]["Enums"]["feed_status"];
        };
        ComputedFields: never;
        Insert: {
          data_mode: Database["public"]["Enums"]["data_mode"];
          error_summary?: string | null;
          finished_at?: string | null;
          id?: string;
          rows_inserted?: number;
          rows_seen?: number;
          rows_updated?: number;
          source: string;
          source_window_end: string;
          source_window_start: string;
          started_at?: string;
          status?: Database["public"]["Enums"]["feed_status"];
        };
        Update: {
          data_mode?: Database["public"]["Enums"]["data_mode"];
          error_summary?: string | null;
          finished_at?: string | null;
          id?: string;
          rows_inserted?: number;
          rows_seen?: number;
          rows_updated?: number;
          source?: string;
          source_window_end?: string;
          source_window_start?: string;
          started_at?: string;
          status?: Database["public"]["Enums"]["feed_status"];
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          created_at: string;
          data_mode: Database["public"]["Enums"]["data_mode"];
          event_id: string;
          id: string;
          incident_id: string;
          read_at: string | null;
          recipient_id: string;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          data_mode: Database["public"]["Enums"]["data_mode"];
          event_id: string;
          id?: string;
          incident_id: string;
          read_at?: string | null;
          recipient_id: string;
          title: string;
        };
        Update: {
          created_at?: string;
          data_mode?: Database["public"]["Enums"]["data_mode"];
          event_id?: string;
          id?: string;
          incident_id?: string;
          read_at?: string | null;
          recipient_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "incident_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_incident_id_fkey";
            columns: ["incident_id"];
            isOneToOne: false;
            referencedRelation: "incidents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      priority_assessments: {
        Row: {
          actor_id: string;
          assessed_at: string;
          data_freshness: string;
          evidence_strength: string;
          final_priority: Database["public"]["Enums"]["priority_level"];
          id: string;
          incident_id: string;
          override_reason: string;
          recommendation: Database["public"]["Enums"]["priority_level"];
          ruleset_version: string;
          severity: string;
          urgency: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id: string;
          assessed_at?: string;
          data_freshness?: string;
          evidence_strength?: string;
          final_priority: Database["public"]["Enums"]["priority_level"];
          id?: string;
          incident_id: string;
          override_reason: string;
          recommendation?: Database["public"]["Enums"]["priority_level"];
          ruleset_version?: string;
          severity?: string;
          urgency?: string;
        };
        Update: {
          actor_id?: string;
          assessed_at?: string;
          data_freshness?: string;
          evidence_strength?: string;
          final_priority?: Database["public"]["Enums"]["priority_level"];
          id?: string;
          incident_id?: string;
          override_reason?: string;
          recommendation?: Database["public"]["Enums"]["priority_level"];
          ruleset_version?: string;
          severity?: string;
          urgency?: string;
        };
        Relationships: [
          {
            foreignKeyName: "priority_assessments_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "priority_assessments_incident_id_fkey";
            columns: ["incident_id"];
            isOneToOne: false;
            referencedRelation: "incidents";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_district_grants: {
        Row: {
          district_code: string;
          granted_at: string;
          granted_by: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          district_code: string;
          granted_at?: string;
          granted_by: string;
          user_id: string;
        };
        Update: {
          district_code?: string;
          granted_at?: string;
          granted_by?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_district_grants_district_fkey";
            columns: ["district_code"];
            isOneToOne: false;
            referencedRelation: "districts";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "profile_district_grants_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_district_grants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          status: Database["public"]["Enums"]["account_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name?: string;
          id: string;
          role?: Database["public"]["Enums"]["user_role"];
          status?: Database["public"]["Enums"]["account_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          status?: Database["public"]["Enums"]["account_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          author_id: string;
          body: string;
          id: string;
          incident_id: string;
          observed_at: string;
          source_label: string;
          submitted_at: string;
        };
        ComputedFields: never;
        Insert: {
          author_id: string;
          body: string;
          id?: string;
          incident_id: string;
          observed_at: string;
          source_label?: string;
          submitted_at?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          id?: string;
          incident_id?: string;
          observed_at?: string;
          source_label?: string;
          submitted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_incident_id_fkey";
            columns: ["incident_id"];
            isOneToOne: false;
            referencedRelation: "incidents";
            referencedColumns: ["id"];
          },
        ];
      };
      team_members: {
        Row: {
          availability: string;
          team_id: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          availability?: string;
          team_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          availability?: string;
          team_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          active: boolean;
          authority_type: string;
          base_latitude: number | null;
          base_location: unknown;
          base_longitude: number | null;
          base_recorded_at: string | null;
          base_source: string | null;
          created_at: string;
          district_id: string;
          id: string;
          name: string;
          row_version: number;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          authority_type: string;
          base_latitude?: number | null;
          base_location?: never;
          base_longitude?: number | null;
          base_recorded_at?: string | null;
          base_source?: string | null;
          created_at?: string;
          district_id: string;
          id?: string;
          name: string;
          row_version?: number;
        };
        Update: {
          active?: boolean;
          authority_type?: string;
          base_latitude?: number | null;
          base_location?: never;
          base_longitude?: number | null;
          base_recorded_at?: string | null;
          base_source?: string | null;
          created_at?: string;
          district_id?: string;
          id?: string;
          name?: string;
          row_version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "teams_district_id_fkey";
            columns: ["district_id"];
            isOneToOne: false;
            referencedRelation: "districts";
            referencedColumns: ["id"];
          },
        ];
      };
      verification_decisions: {
        Row: {
          actor_id: string;
          decided_at: string;
          decision: Database["public"]["Enums"]["verification_status"];
          id: string;
          incident_id: string;
          incident_version: number;
          reason: string;
          supersedes_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          actor_id: string;
          decided_at?: string;
          decision: Database["public"]["Enums"]["verification_status"];
          id?: string;
          incident_id: string;
          incident_version: number;
          reason: string;
          supersedes_id?: string | null;
        };
        Update: {
          actor_id?: string;
          decided_at?: string;
          decision?: Database["public"]["Enums"]["verification_status"];
          id?: string;
          incident_id?: string;
          incident_version?: number;
          reason?: string;
          supersedes_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "verification_decisions_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_decisions_incident_id_fkey";
            columns: ["incident_id"];
            isOneToOne: false;
            referencedRelation: "incidents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_decisions_supersedes_id_fkey";
            columns: ["supersedes_id"];
            isOneToOne: false;
            referencedRelation: "verification_decisions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      begin_ingestion: {
        Args: { feed_source: string; window_end: string; window_start: string };
        Returns: string;
      };
      can_access_district: {
        Args: { requested_code: string };
        Returns: boolean;
      };
      create_incident: {
        Args: { incident_title: string; observation: string; reason: string };
        Returns: string;
      };
      create_report_incident: { Args: { payload: Json }; Returns: string };
      district_features: {
        Args: { requested_mode: Database["public"]["Enums"]["data_mode"] };
        Returns: Json;
      };
      districts_for_point: {
        Args: {
          latitude: number;
          longitude: number;
          requested_mode: Database["public"]["Enums"]["data_mode"];
        };
        Returns: {
          district_code: string;
          district_id: string;
        }[];
      };
      eligible_assignees: {
        Args: { target: string };
        Returns: {
          authority_type: string;
          availability: string;
          availability_at: string;
          base_recorded_at: string;
          base_source: string;
          display_name: string;
          distance_to_team_km: number;
          owner_id: string;
          team_id: string;
          team_name: string;
        }[];
      };
      feed_health: {
        Args: { requested_mode: Database["public"]["Enums"]["data_mode"] };
        Returns: {
          finished_at: string;
          last_successful_sync_at: string;
          source: string;
          started_at: string;
          status: Database["public"]["Enums"]["feed_status"];
        }[];
      };
      finish_ingestion: {
        Args: { failure?: string; observations: Json; run_id: string };
        Returns: undefined;
      };
      ingestion_status: {
        Args: { requested_mode: Database["public"]["Enums"]["data_mode"] };
        Returns: {
          finished_at: string;
          id: string;
          rows_inserted: number;
          rows_seen: number;
          rows_updated: number;
          source: string;
          started_at: string;
          status: Database["public"]["Enums"]["feed_status"];
          unmatched_observations: number;
        }[];
      };
      manage_team: {
        Args: {
          authority: string;
          availability_value: string;
          district: string;
          member: string;
          target_team?: string;
          team_name: string;
        };
        Returns: string;
      };
      mutate_incident: {
        Args: {
          expected_version: number;
          operation: string;
          payload: Json;
          target: string;
        };
        Returns: string;
      };
      operations_summary: {
        Args: {
          district_code?: string;
          feed_source?: string;
          requested_mode: Database["public"]["Enums"]["data_mode"];
          since_at?: string;
        };
        Returns: {
          active_assignments: number;
          confirmed_incidents: number;
          high_priority_active: number;
          information_needed: number;
          last_observation_at: string;
          not_confirmed_incidents: number;
          open_incidents: number;
          unassigned_active: number;
        }[];
      };
      set_account_access: {
        Args: {
          district_codes: string[];
          new_role: Database["public"]["Enums"]["user_role"];
          new_status: Database["public"]["Enums"]["account_status"];
          reason: string;
          target_user_id: string;
        };
        Returns: undefined;
      };
      staff_roster: {
        Args: Record<PropertyKey, never>;
        Returns: {
          display_name: string;
          district_code: string;
          role: Database["public"]["Enums"]["user_role"];
          user_id: string;
        }[];
      };
      update_team_details: {
        Args: { expected_version: number; payload: Json; target: string };
        Returns: undefined;
      };
    };
    Enums: {
      account_status: "pending" | "active" | "suspended";
      data_mode: "demo" | "live";
      feed_status: "running" | "success" | "partial" | "failed";
      incident_status:
        | "new"
        | "triaging"
        | "assigned"
        | "in_progress"
        | "monitoring"
        | "resolved"
        | "cancelled";
      priority_level: "critical" | "high" | "medium" | "low" | "unassessed";
      user_role:
        | "pending"
        | "viewer"
        | "field_officer"
        | "coordinator"
        | "admin";
      verification_status:
        | "confirmed"
        | "not_confirmed"
        | "needs_more_information";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    Enums: {
      account_status: ["pending", "active", "suspended"],
      data_mode: ["demo", "live"],
      feed_status: ["running", "success", "partial", "failed"],
      incident_status: [
        "new",
        "triaging",
        "assigned",
        "in_progress",
        "monitoring",
        "resolved",
        "cancelled",
      ],
      priority_level: ["critical", "high", "medium", "low", "unassessed"],
      user_role: ["pending", "viewer", "field_officer", "coordinator", "admin"],
      verification_status: [
        "confirmed",
        "not_confirmed",
        "needs_more_information",
      ],
    },
  },
} as const;
