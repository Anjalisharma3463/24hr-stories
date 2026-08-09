import type { SpaceMemberRole, SpacePrivacy } from './ephemeral-space'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      spaces: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          invite_code: string
          privacy: SpacePrivacy
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          invite_code: string
          privacy: SpacePrivacy
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string
          invite_code?: string
          privacy?: SpacePrivacy
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
      space_members: {
        Row: {
          space_id: string
          user_id: string
          role: SpaceMemberRole
          joined_at: string
        }
        Insert: {
          space_id: string
          user_id: string
          role?: SpaceMemberRole
          joined_at?: string
        }
        Update: {
          space_id?: string
          user_id?: string
          role?: SpaceMemberRole
          joined_at?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          id: string
          space_id: string
          user_id: string
          media_url: string
          thumbnail_url: string | null
          created_at: string
          expires_at: string
          viewed: boolean
        }
        Insert: {
          id?: string
          space_id: string
          user_id: string
          media_url: string
          thumbnail_url?: string | null
          created_at?: string
          expires_at: string
          viewed?: boolean
        }
        Update: {
          id?: string
          space_id?: string
          user_id?: string
          media_url?: string
          thumbnail_url?: string | null
          created_at?: string
          expires_at?: string
          viewed?: boolean
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      join_space_with_invite_code: {
        Args: {
          p_invite_code: string
        }
        Returns: {
          id: string
          name: string
          description: string | null
          owner_id: string
          invite_code: string
          privacy: SpacePrivacy
          expires_at: string
          created_at: string
        }
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}