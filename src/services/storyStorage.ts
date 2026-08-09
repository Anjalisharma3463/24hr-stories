import type { StoryRailUser } from '@/types/story'

const STORY_STORAGE_KEY = '24hr-stories:stories'

export type StoredStory = {
  id: string
  imageData: string
  username: string
  createdAt: string
}

const isStoredStory = (value: unknown): value is StoredStory => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.imageData === 'string' &&
    typeof candidate.username === 'string' &&
    typeof candidate.createdAt === 'string'
  )
}

const toAvatarUrl = (username: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(username)}-story-avatar/128/128`

export const createStoredStory = (
  story: Pick<StoryRailUser, 'id' | 'previewUrl' | 'username' | 'createdAt'>,
): StoredStory => ({
  id: story.id,
  imageData: story.previewUrl,
  username: story.username,
  createdAt: story.createdAt,
})

export const fromStoredStory = (story: StoredStory): StoryRailUser => ({
  id: story.id,
  username: story.username,
  avatarUrl: toAvatarUrl(story.username),
  previewUrl: story.imageData,
  createdAt: story.createdAt,
  seen: false,
})

export const loadStoredStories = (): StoredStory[] => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const rawStories = window.localStorage.getItem(STORY_STORAGE_KEY)

    if (!rawStories) {
      return []
    }

    const parsedStories: unknown = JSON.parse(rawStories)

    if (!Array.isArray(parsedStories)) {
      return []
    }

    return parsedStories.filter(isStoredStory)
  } catch {
    return []
  }
}

export const saveStoredStories = (stories: StoredStory[]): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(stories))
  } catch {
    // Ignore storage failures so the feed still works without persistence.
  }
}