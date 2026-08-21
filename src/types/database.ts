/**
 * Hand-written mirror of the Postgres schema in database/migrations/.
 *
 * In a real Supabase project this file would be regenerated with:
 *   supabase gen types typescript --project-id <id> > src/types/database.ts
 * It's hand-written here because Phase 1 has no live Supabase project to
 * generate against yet. Once a project exists, replace this file with the
 * generated output (see docs/database.md) and keep the two in sync.
 *
 * The shape (Tables/Views/Functions, Relationships: [] on every table) is
 * exactly what `supabase gen types` produces - @supabase/postgrest-js's
 * `GenericSchema` constraint requires all of it, and silently degrades
 * every query on the client to `never` if any piece is missing.
 */

export type AppRole =
  | "administrator"
  | "project_owner"
  | "developer"
  | "reviewer"
  | "lecturer";

export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "archived";

export type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "code_review"
  | "testing"
  | "blocked"
  | "done";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type IssueStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed"
  | "wont_fix";

export type IssuePriority = "low" | "medium" | "high" | "critical";

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export type CommentableType = "task" | "issue";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          is_platform_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["organizations"]["Row"]> & {
          name: string;
          slug: string;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Row"]>;
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: AppRole;
          invited_by: string | null;
          joined_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["organization_members"]["Row"]
        > & {
          organization_id: string;
          user_id: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["organization_members"]["Row"]
        >;
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          description: string | null;
          repository_url: string | null;
          tech_stack: string[];
          status: ProjectStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["projects"]["Row"]> & {
          organization_id: string;
          name: string;
          slug: string;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: AppRole;
          invited_by: string | null;
          joined_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["project_members"]["Row"]
        > & {
          project_id: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_members"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_invitations: {
        Row: {
          id: string;
          project_id: string;
          email: string;
          role: AppRole;
          invited_by: string;
          status: InvitationStatus;
          token: string;
          expires_at: string;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["project_invitations"]["Row"]
        > & {
          project_id: string;
          email: string;
          invited_by: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["project_invitations"]["Row"]
        >;
        Relationships: [
          {
            foreignKeyName: "project_invitations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          status: TaskStatus;
          priority: TaskPriority;
          labels: string[];
          assignee_id: string | null;
          reporter_id: string;
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tasks"]["Row"]> & {
          project_id: string;
          title: string;
          reporter_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      issues: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          status: IssueStatus;
          priority: IssuePriority;
          reporter_id: string;
          assignee_id: string | null;
          linked_task_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["issues"]["Row"]> & {
          project_id: string;
          title: string;
          reporter_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["issues"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "issues_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issues_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issues_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          id: string;
          project_id: string;
          commentable_type: CommentableType;
          commentable_id: string;
          author_id: string;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["comments"]["Row"]> & {
          project_id: string;
          commentable_type: CommentableType;
          commentable_id: string;
          author_id: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["comments"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "comments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_events: {
        Row: {
          id: string;
          project_id: string | null;
          organization_id: string | null;
          actor_id: string | null;
          event_type: string;
          object_type: string;
          object_id: string | null;
          description: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["activity_events"]["Row"]
        > & {
          event_type: string;
          object_type: string;
          description: string;
        };
        Update: Partial<Database["public"]["Tables"]["activity_events"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "activity_events_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_attachments: {
        Row: {
          id: string;
          task_id: string;
          project_id: string;
          file_name: string;
          storage_path: string;
          content_type: string | null;
          size_bytes: number | null;
          uploaded_by: string;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["task_attachments"]["Row"]
        > & {
          task_id: string;
          project_id: string;
          file_name: string;
          storage_path: string;
          uploaded_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["task_attachments"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_attachments_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          id: string;
          actor_id: string | null;
          organization_id: string | null;
          project_id: string | null;
          action: string;
          target_type: string;
          target_id: string | null;
          description: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_log"]["Row"]> & {
          action: string;
          target_type: string;
          description: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_log_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_log_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: AppRole;
      project_status: ProjectStatus;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      issue_status: IssueStatus;
      issue_priority: IssuePriority;
      invitation_status: InvitationStatus;
      commentable_type: CommentableType;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
