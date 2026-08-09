import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { supabaseClient } from './supabaseClient'
import type {
  AuthenticatedUser,
  Profile,
  Space,
  SpacePrivacy,
  Story,
} from '@/types/ephemeral-space'
import type { Database } from '@/types/supabase'

const STORY_TTL_MS = 24 * 60 * 60 * 1000

const toIsoString = (value: number | Date) =>
  (value instanceof Date ? value : new Date(value)).toISOString()

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `space-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const generateInviteCode = () => createId().replace(/-/g, '').slice(0, 8).toUpperCase()

const mapProfileRow = (row: Database['public']['Tables']['profiles']['Row']): Profile => ({
  id: row.id,
  username: row.username,
  displayName: row.display_name,
  avatarUrl: row.avatar_url,
  createdAt: row.created_at,
})

const mapSpaceRow = (row: Database['public']['Tables']['spaces']['Row']): Space => ({
  id: row.id,
  name: row.name,
  description: row.description,
  ownerId: row.owner_id,
  inviteCode: row.invite_code,
  privacy: row.privacy,
  expiresAt: row.expires_at,
  createdAt: row.created_at,
})

const mapStoryRow = (row: Database['public']['Tables']['stories']['Row']): Story => ({
  id: row.id,
  spaceId: row.space_id,
  userId: row.user_id,
  mediaUrl: row.media_url,
  thumbnailUrl: row.thumbnail_url,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
  viewed: row.viewed,
})

const requireAuthenticatedUser = async (
  client: SupabaseClient<Database>,
): Promise<AuthenticatedUser> => {
  const { data, error } = await client.auth.getUser()

  if (error) {
    throw error
  }

  if (!data.user) {
    throw new Error('You must be signed in to use Ephemeral Spaces.')
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  }
}

export type SessionInfo = {
  session: Session | null
  user: AuthenticatedUser | null
}

export type CreateSpaceInput = {
  name: string
  description?: string | null
  privacy: SpacePrivacy
  expiresAt: string
}

export type CreateProfileInput = {
  username: string
  displayName?: string | null
  avatarUrl?: string | null
}

export type CreateStoryInput = {
  spaceId: string
  mediaUrl: string
  thumbnailUrl?: string | null
  expiresAt?: string
}

export const createEphemeralSpacesRepository = (
  client: SupabaseClient<Database> = supabaseClient,
) => {
  const profiles = {
    async getCurrentProfile() {
      const user = await requireAuthenticatedUser(client)
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        throw error
      }

      return data ? mapProfileRow(data) : null
    },
    async upsertProfile(userId: string, input: CreateProfileInput) {
      const { data, error } = await client
        .from('profiles')
        .upsert({
          id: userId,
          username: input.username,
          display_name: input.displayName ?? null,
          avatar_url: input.avatarUrl ?? null,
        })
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return mapProfileRow(data)
    },
  }

  const auth = {
    async getSession(): Promise<SessionInfo> {
      const { data, error } = await client.auth.getSession()

      if (error) {
        throw error
      }

      return {
        session: data.session,
        user: data.session?.user
          ? { id: data.session.user.id, email: data.session.user.email ?? null }
          : null,
      }
    },
    signUp: async (email: string, password: string, username: string) => {
      const { data, error } = await client.auth.signUp({
        email,
        password,
      })

      if (error) {
        throw error
      }

      if (data.user) {
        await profiles.upsertProfile(data.user.id, { username })
      }

      return data
    },
    signIn: async (email: string, password: string) => {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      return data
    },
    signOut: async () => {
      const { error } = await client.auth.signOut()

      if (error) {
        throw error
      }
    },
    onAuthStateChange: client.auth.onAuthStateChange.bind(client.auth),
  }

  const spaces = {
    async listMySpaces() {
      const user = await requireAuthenticatedUser(client)
      const { data: memberships, error: membershipError } = await client
        .from('space_members')
        .select('*')
        .eq('user_id', user.id)

      if (membershipError) {
        throw membershipError
      }

      if (!memberships?.length) {
        return []
      }

      const spaceIds = memberships.map((membership) => membership.space_id)
      const { data: spacesData, error: spacesError } = await client
        .from('spaces')
        .select('*')
        .in('id', spaceIds)

      if (spacesError) {
        throw spacesError
      }

      return (spacesData ?? []).map(mapSpaceRow)
    },
    async createSpace(input: CreateSpaceInput) {
      const user = await requireAuthenticatedUser(client)
      const inviteCode = generateInviteCode()

      const { data: space, error: spaceError } = await client
        .from('spaces')
        .insert({
          id: createId(),
          name: input.name,
          description: input.description ?? null,
          owner_id: user.id,
          invite_code: inviteCode,
          privacy: input.privacy,
          expires_at: input.expiresAt,
        })
        .select('*')
        .single()

      if (spaceError) {
        throw spaceError
      }

      const { error: membershipError } = await client.from('space_members').insert({
        space_id: space.id,
        user_id: user.id,
        role: 'owner',
      })

      if (membershipError) {
        throw membershipError
      }

      return mapSpaceRow(space)
    },
    async joinSpaceByInviteCode(inviteCode: string) {
      const normalizedInviteCode = inviteCode.trim().toUpperCase()

      const { data: space, error: joinError } = await client.rpc('join_space_with_invite_code', {
        p_invite_code: normalizedInviteCode,
      })

      if (joinError) {
        throw joinError
      }

      if (!space) {
        throw new Error('Invalid invite code.')
      }

      return mapSpaceRow(space)
    },
    async leaveSpace(spaceId: string) {
      const user = await requireAuthenticatedUser(client)
      const { error } = await client
        .from('space_members')
        .delete()
        .eq('space_id', spaceId)
        .eq('user_id', user.id)

      if (error) {
        throw error
      }
    },
  }

  const stories = {
    async listStories(spaceId: string) {
      const { data, error } = await client
        .from('stories')
        .select('*')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return (data ?? []).map(mapStoryRow)
    },
    async createStory(input: CreateStoryInput) {
      const user = await requireAuthenticatedUser(client)
      const expiresAt = input.expiresAt ?? toIsoString(Date.now() + STORY_TTL_MS)

      const { data, error } = await client
        .from('stories')
        .insert({
          id: createId(),
          space_id: input.spaceId,
          user_id: user.id,
          media_url: input.mediaUrl,
          thumbnail_url: input.thumbnailUrl ?? null,
          expires_at: expiresAt,
          viewed: false,
        })
        .select('*')
        .single()

      if (error) {
        throw error
      }

      return mapStoryRow(data)
    },
    async markStoryViewed(storyId: string) {
      const { error } = await client
        .from('stories')
        .update({ viewed: true })
        .eq('id', storyId)

      if (error) {
        throw error
      }
    },
    async deleteStory(storyId: string) {
      const { error } = await client.from('stories').delete().eq('id', storyId)

      if (error) {
        throw error
      }
    },
  }

  return {
    auth,
    profiles,
    spaces,
    stories,
    client,
  }
}