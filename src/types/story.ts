export type StoryRailUser = {
  id: string
  username: string
  avatarUrl: string
  previewUrl: string
  createdAt: string
  seen: boolean
}

export type CurrentUserStory = {
  id: string
  username: string
  avatarUrl: string
  hasStory: boolean
  previewUrl?: string
  createdAt?: string
}

export type StoryRailData = {
  currentUser: CurrentUserStory
  stories: StoryRailUser[]
}
