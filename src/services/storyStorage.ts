import type { StoryRailUser } from '@/types/story'

const STORY_STORAGE_KEY = '24hr-stories:stories'
const STORY_TTL_MS = 24 * 60 * 60 * 1000

export type StoredStory = {
  id: string
  imageData: string
  username: string
  createdAt: string
  expiresAt: string
  viewed: boolean
}

const isValidTimestamp = (value: string) => !Number.isNaN(new Date(value).getTime())

const addStoryTtl = (createdAt: string) =>
  new Date(new Date(createdAt).getTime() + STORY_TTL_MS).toISOString()

const normalizeExpiry = (createdAt: string, expiresAt?: string) =>
  expiresAt && isValidTimestamp(expiresAt) ? expiresAt : addStoryTtl(createdAt)

const normalizeViewed = (candidate: Record<string, unknown>) =>
  typeof candidate.viewed === 'boolean'
    ? candidate.viewed
    : typeof candidate.seen === 'boolean'
      ? candidate.seen
      : false

const normalizeStoredStory = (value: unknown): StoredStory | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Record<string, unknown>

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.imageData !== 'string' ||
    typeof candidate.username !== 'string' ||
    typeof candidate.createdAt !== 'string' ||
    !isValidTimestamp(candidate.createdAt)
  ) {
    return null
  }

  return {
    id: candidate.id,
    imageData: candidate.imageData,
    username: candidate.username,
    createdAt: candidate.createdAt,
    expiresAt: normalizeExpiry(
      candidate.createdAt,
      typeof candidate.expiresAt === 'string' ? candidate.expiresAt : undefined,
    ),
    viewed: normalizeViewed(candidate),
  }
}

const toAvatarUrl = (username: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(username)}-story-avatar/128/128`

export const createStoredStory = (
  story: Pick<StoryRailUser, 'id' | 'previewUrl' | 'username' | 'createdAt' | 'viewed'> & {
    expiresAt?: string
  },
): StoredStory => ({
  id: story.id,
  imageData: story.previewUrl,
  username: story.username,
  createdAt: story.createdAt,
  expiresAt: normalizeExpiry(story.createdAt, story.expiresAt),
  viewed: story.viewed,
})

export const fromStoredStory = (story: StoredStory): StoryRailUser => ({
  id: story.id,
  username: story.username,
  avatarUrl: toAvatarUrl(story.username),
  previewUrl: story.imageData,
  createdAt: story.createdAt,
  expiresAt: story.expiresAt,
  viewed: story.viewed,
  seen: story.viewed,
})

export const isStoryExpired = (story: Pick<StoredStory, 'expiresAt'>, now = Date.now()) =>
  (() => {
    const expiresAtTime = new Date(story.expiresAt).getTime()

    return Number.isNaN(expiresAtTime) || expiresAtTime <= now
  })()

export const filterActiveStoredStories = (stories: StoredStory[], now = Date.now()) =>
  stories.filter((story) => !isStoryExpired(story, now))

export const getNextStoredStoryExpirationDelay = (
  stories: StoredStory[],
  now = Date.now(),
) => {
  const nextExpiration = stories.reduce<number | null>((soonest, story) => {
    const expiresAt = new Date(story.expiresAt).getTime()

    if (Number.isNaN(expiresAt) || expiresAt <= now) {
      return soonest
    }

    if (soonest === null || expiresAt < soonest) {
      return expiresAt
    }

    return soonest
  }, null)

  if (nextExpiration === null) {
    return null
  }

  return Math.max(nextExpiration - now, 0)
}

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

    return parsedStories.map(normalizeStoredStory).filter(
      (story): story is StoredStory => story !== null,
    )
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