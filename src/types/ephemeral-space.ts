export type SpacePrivacy = 'private' | 'public'

export type SpaceMemberRole = 'owner' | 'member'

export type Profile = {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  createdAt: string
}

export type Space = {
  id: string
  name: string
  description: string | null
  ownerId: string
  inviteCode: string
  privacy: SpacePrivacy
  expiresAt: string
  createdAt: string
}

export type SpaceMember = {
  spaceId: string
  userId: string
  role: SpaceMemberRole
  joinedAt: string
}

export type Story = {
  id: string
  spaceId: string
  userId: string
  mediaUrl: string
  thumbnailUrl: string | null
  createdAt: string
  expiresAt: string
  viewed: boolean
}

export type StoryMediaUpload = {
  file: File
  mimeType: string
  width?: number
  height?: number
}

export type AuthenticatedUser = {
  id: string
  email: string | null
}