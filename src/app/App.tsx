import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StoryRail, StoryViewer } from '@/components/stories'
import { mockStoryRailData } from '@/constants/mockStories'
import { cn } from '@/utils/cn'
import { formatRelativeTime } from '@/utils/formatRelativeTime'
import {
  createStoredStory,
  filterActiveStoredStories,
  fromStoredStory,
  loadStoredStories,
  getNextStoredStoryExpirationDelay,
  removeStoredStory,
  saveStoredStories,
} from '@/services'
import type { StoryRailData, StoryRailUser } from '@/types/story'

const sortStoriesByNewest = (stories: StoryRailUser[]) =>
  [...stories].sort(
    (leftStory, rightStory) =>
      new Date(rightStory.createdAt).getTime() -
      new Date(leftStory.createdAt).getTime(),
  )

const getStoredStories = (stories: StoryRailUser[]) =>
  stories.filter((story): story is StoryRailUser & { expiresAt: string } =>
    typeof story.expiresAt === 'string',
  )

const loadInitialStories = () => {
  const storedStories = filterActiveStoredStories(loadStoredStories())

  return sortStoriesByNewest([
    ...mockStoryRailData.stories,
    ...storedStories.map(fromStoredStory),
  ])
}

const createRandomId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `story-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const MAX_UPLOAD_DIMENSION = 1440
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024

const isValidImageFile = (file: File) =>
  file.type.startsWith('image/') && file.size > 0 && file.size <= MAX_UPLOAD_BYTES

const readFileAsDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.addEventListener('load', () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to read image data.'))
        return
      }

      resolve(reader.result)
    })

    reader.addEventListener('error', () => {
      reject(new Error('Failed to read image data.'))
    })

    reader.readAsDataURL(file)
  })

const resizeImageDataUrl = async (file: File) => {
  const imageData = await readFileAsDataUrl(file)

  if (typeof window === 'undefined') {
    return imageData
  }

  const image = new Image()
  image.decoding = 'async'

  const loadedImage = new Promise<HTMLImageElement>((resolve, reject) => {
    image.addEventListener('load', () => resolve(image), { once: true })
    image.addEventListener('error', () => reject(new Error('Failed to load image.')), { once: true })
  })

  image.src = imageData

  const decodedImage =
    typeof image.decode === 'function'
      ? image.decode().catch(() => loadedImage)
      : loadedImage

  await decodedImage

  const { naturalWidth, naturalHeight } = image

  if (!naturalWidth || !naturalHeight) {
    return imageData
  }

  const scale = Math.min(
    1,
    MAX_UPLOAD_DIMENSION / Math.max(naturalWidth, naturalHeight),
  )

  if (scale === 1) {
    return imageData
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(naturalHeight * scale))

  const context = canvas.getContext('2d')

  if (!context) {
    return imageData
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  return canvas.toDataURL('image/jpeg', 0.88)
}

export function App() {
  const [stories, setStories] = useState<StoryRailUser[]>(loadInitialStories)
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [dashboardNow, setDashboardNow] = useState<number | null>(null)
  const lastPersistedStoriesRef = useRef<string>('')

  const selectedStory = useMemo(
    () => stories.find((story) => story.id === selectedStoryId) ?? null,
    [selectedStoryId, stories],
  )

  const storyRailData: StoryRailData = useMemo(
    () => ({
      currentUser: mockStoryRailData.currentUser,
      stories,
    }),
    [stories],
  )

  const dashboardStats = useMemo(() => {
    const viewedStories = stories.filter((story) => story.viewed)
    const unviewedStories = stories.filter((story) => !story.viewed)
    const nextExpiration = stories
      .map((story) => new Date(story.expiresAt ?? story.createdAt).getTime())
      .filter((expiration) => !Number.isNaN(expiration))
      .sort((left, right) => left - right)[0]

    return {
      viewedCount: viewedStories.length,
      totalCount: stories.length,
      unviewedCount: unviewedStories.length,
      timeRemainingLabel: nextExpiration
        ? dashboardNow !== null
          ? formatDurationLabel(nextExpiration - dashboardNow)
          : 'Tracking…'
        : 'No active stories',
    }
  }, [dashboardNow, stories])

  const featuredStory = stories[0] ?? null

  const recentActivity = useMemo(() => {
    const activeStories = [...stories].sort(
      (leftStory, rightStory) =>
        new Date(rightStory.createdAt).getTime() -
        new Date(leftStory.createdAt).getTime(),
    )

    return activeStories.slice(0, 4).map((story) => ({
      id: story.id,
      label: story.username,
      tone: story.viewed ? 'Viewed' : 'New',
      detail: story.expiresAt
        ? `Expires ${formatRelativeTime(story.expiresAt)}`
        : formatRelativeTime(story.createdAt),
    }))
  }, [stories])

  const timelineSegments = useMemo(() => {
    return stories
      .slice(0, 8)
      .map((story) => ({
        id: story.id,
        viewed: story.viewed,
        active:
          !story.expiresAt ||
          dashboardNow === null ||
          new Date(story.expiresAt).getTime() > dashboardNow,
      }))
  }, [dashboardNow, stories])

  const handleStoryViewed = useCallback((storyId: string) => {
    setStories((currentStories) => {
      let hasChanges = false

      const nextStories = currentStories.map((story) => {
        if (story.id !== storyId || story.viewed) {
          return story
        }

        hasChanges = true

        return {
          ...story,
          viewed: true,
          seen: true,
        }
      })

      return hasChanges ? nextStories : currentStories
    })
  }, [])

  const handleStoryDeleted = useCallback((storyId: string) => {
    removeStoredStory(storyId)

    setStories((currentStories) => currentStories.filter((story) => story.id !== storyId))

    setSelectedStoryId((currentSelectedStoryId) =>
      currentSelectedStoryId === storyId ? null : currentSelectedStoryId,
    )
  }, [])

  const persistableStories = useMemo(
    () => filterActiveStoredStories(getStoredStories(stories).map(createStoredStory)),
    [stories],
  )

  useEffect(() => {
    const nextPersistedStories = JSON.stringify(persistableStories)

    if (lastPersistedStoriesRef.current === nextPersistedStories) {
      return
    }

    lastPersistedStoriesRef.current = nextPersistedStories
    saveStoredStories(persistableStories)
  }, [persistableStories])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setDashboardNow(Date.now())
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [persistableStories])

  useEffect(() => {
    const delay = getNextStoredStoryExpirationDelay(persistableStories)

    if (delay === null) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setStories((currentStories) => {
        const nextStories = currentStories.filter((story) => {
          if (story.expiresAt) {
            return new Date(story.expiresAt).getTime() > Date.now()
          }

          return true
        })

        const nextStoredStories = filterActiveStoredStories(
          getStoredStories(nextStories).map(createStoredStory),
        )

        lastPersistedStoriesRef.current = JSON.stringify(nextStoredStories)
        saveStoredStories(nextStoredStories)

        return nextStories
      })
    }, delay)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [persistableStories])

  const handleAddStory = useCallback(async () => {
    const input = document.createElement('input')

    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = false
    input.capture = 'environment'

    const fileSelection = new Promise<File | null>((resolve) => {
      input.addEventListener('change', () => {
        resolve(input.files?.[0] ?? null)
      })
    })

    input.click()

    const file = await fileSelection

    if (!file || !isValidImageFile(file)) {
      return
    }

    let imageData: string

    try {
      imageData = await resizeImageDataUrl(file)
    } catch {
      return
    }

    const newStory: StoryRailUser = {
      id: createRandomId(),
      username: mockStoryRailData.currentUser.username,
      avatarUrl: mockStoryRailData.currentUser.avatarUrl,
      previewUrl: imageData,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      viewed: false,
      seen: false,
    }

    setStories((currentStories) => {
      const nextStories = sortStoriesByNewest([newStory, ...currentStories])
      const nextPersistedStories = filterActiveStoredStories(
        getStoredStories(nextStories).map(createStoredStory),
      )

      lastPersistedStoriesRef.current = JSON.stringify(nextPersistedStories)
      saveStoredStories(nextPersistedStories)

      return nextStories
    })
  }, [])

  const handleOpenUpload = useCallback(() => {
    setIsUploadModalOpen(true)
  }, [])

  const handleChooseUpload = useCallback(() => {
    setIsUploadModalOpen(false)
    void handleAddStory()
  }, [handleAddStory])

  const handleCloseUpload = useCallback(() => {
    setIsUploadModalOpen(false)
  }, [])

  const handleCloseViewer = useCallback(() => {
    setSelectedStoryId(null)
  }, [])

  const handleSelectStory = useCallback((story: StoryRailUser) => {
    setSelectedStoryId(story.id)
  }, [])

  function formatDurationLabel(milliseconds: number) {
    const safeMilliseconds = Math.max(milliseconds, 0)
    const totalMinutes = Math.floor(safeMilliseconds / 60000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}m left`
    }

    if (totalMinutes > 0) {
      return `${totalMinutes}m left`
    }

    return 'Less than 1m left'
  }

  return (
    <div className="app-shell min-h-dvh bg-background text-foreground">
      <div aria-hidden="true" className="app-ambient app-ambient--one" />
      <div aria-hidden="true" className="app-ambient app-ambient--two" />
      <div aria-hidden="true" className="app-ambient app-ambient--three" />

      <header className="studio-nav sticky top-0 z-30 px-safe pt-safe">
        <div className="container-app">
          <div className="glass-surface studio-nav__bar flex items-center justify-between gap-3 rounded-full border border-white/12 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="studio-logo flex size-10 items-center justify-center rounded-full border border-white/12 bg-white/8 text-sm font-semibold tracking-[0.25em] text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)]">
                24HR
              </div>
              <div className="min-w-0">
                <p className="text-[0.6875rem] font-medium tracking-[0.24em] text-accent uppercase">
                  Stories Studio
                </p>
                <p className="truncate text-sm text-muted">
                  Portfolio dashboard for 24-hour stories
                </p>
              </div>
            </div>

            <nav className="hidden items-center gap-2 md:flex">
              <a className="studio-nav__link" href="#hero">Overview</a>
              <a className="studio-nav__link" href="#stories">Stories</a>
              <a className="studio-nav__link" href="#activity">Activity</a>
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-foreground">You</p>
                <p className="text-[0.6875rem] text-muted">Creative lead</p>
              </div>
              <button
                className="studio-avatar ring-1 ring-white/12"
                type="button"
                onClick={handleOpenUpload}
              >
                <img
                  alt="Your profile"
                  className="h-full w-full rounded-full object-cover"
                  decoding="async"
                  height={40}
                  src={mockStoryRailData.currentUser.avatarUrl}
                  width={40}
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative flex min-h-dvh flex-col pb-14 pt-4 sm:pt-6">
        <section id="hero" className="container-app studio-reveal">
          <div className="studio-hero grid gap-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(18rem,0.82fr)] lg:items-stretch">
            <div className="glass-surface studio-hero__panel relative overflow-hidden rounded-[2rem] border border-white/12 p-6 sm:p-8 lg:p-10">
              <div className="studio-hero__glow" aria-hidden="true" />
              <div className="relative z-10 max-w-2xl space-y-6">
                <div className="space-y-3">
                  <p className="text-[0.6875rem] font-medium tracking-[0.24em] text-accent uppercase">
                    24-hour stories
                  </p>
                  <h1 className="max-w-xl text-balance text-[clamp(2.5rem,5vw,5.25rem)] font-semibold leading-[0.96] tracking-[-0.05em]">
                    A cinematic studio for time-limited storytelling.
                  </h1>
                  <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
                    Curate, view, and ship stories that live for just one day. This portfolio-style dashboard wraps the existing Stories engine in a premium studio experience.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    className="studio-button studio-button--primary"
                    type="button"
                    onClick={handleOpenUpload}
                  >
                    Create Story
                  </button>
                  <a className="studio-button studio-button--secondary" href="#stories">
                    Explore stories
                  </a>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="studio-metric-card">
                    <span className="studio-metric-card__label">Total stories</span>
                    <span className="studio-metric-card__value">{dashboardStats.totalCount}</span>
                  </div>
                  <div className="studio-metric-card">
                    <span className="studio-metric-card__label">Viewed stories</span>
                    <span className="studio-metric-card__value">{dashboardStats.viewedCount}</span>
                  </div>
                  <div className="studio-metric-card">
                    <span className="studio-metric-card__label">Active stories</span>
                    <span className="studio-metric-card__value">{dashboardStats.totalCount}</span>
                  </div>
                  <div className="studio-metric-card">
                    <span className="studio-metric-card__label">Time remaining</span>
                    <span className="studio-metric-card__value text-[1.6rem] tracking-tight">
                      {dashboardStats.timeRemainingLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              className="studio-feature-card group relative overflow-hidden rounded-[2rem] border border-white/12 text-left"
              type="button"
              onClick={() => {
                if (featuredStory) {
                  handleSelectStory(featuredStory)
                }
              }}
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.06),rgba(0,0,0,0.6))]"
              />
              {featuredStory ? (
                <>
                  <img
                    alt="Featured story preview"
                    className="studio-feature-card__image"
                    decoding="async"
                    fetchPriority="high"
                    height={1440}
                    loading="eager"
                    src={featuredStory.previewUrl}
                    width={1080}
                  />
                  <div className="studio-feature-card__content relative z-10 flex h-full flex-col justify-end p-6 sm:p-8">
                    <span className="studio-chip">Featured story</span>
                    <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                      {featuredStory.username}
                    </h2>
                    <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/72">
                      Tap to preview the current story flow in the fullscreen viewer.
                    </p>
                    <div className="mt-6 flex items-center gap-3 text-sm text-white/75">
                      <span className={featuredStory.viewed ? 'studio-pill studio-pill--muted' : 'studio-pill studio-pill--active'}>
                        {featuredStory.viewed ? 'Viewed' : 'Unviewed'}
                      </span>
                      <span>{formatRelativeTime(featuredStory.createdAt)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="relative z-10 flex h-full min-h-[24rem] items-center justify-center p-8 text-center">
                  <div className="max-w-sm space-y-3">
                    <span className="studio-chip">Featured story</span>
                    <h2 className="text-2xl font-semibold tracking-tight">No active stories yet</h2>
                    <p className="text-sm leading-relaxed text-white/72">
                      Upload a story to populate the preview, rail, and activity panels.
                    </p>
                  </div>
                </div>
              )}
            </button>
          </div>
        </section>

        <section className="container-app mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)]">
          <div className="studio-reveal">
            <div className="glass-surface rounded-[2rem] border border-white/12 p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[0.6875rem] font-medium tracking-[0.2em] text-accent uppercase">
                    Timeline
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">24-hour expiration</h2>
                </div>
                <p className="text-sm text-muted">
                  Auto-updates from the current story data.
                </p>
              </div>

              <div className="mt-5 space-y-4">
                <div className="timeline-track" aria-hidden="true">
                  {timelineSegments.map((segment) => (
                    <span
                      key={segment.id}
                      className={cn(
                        'timeline-segment',
                        segment.active ? (segment.viewed ? 'timeline-segment--viewed' : 'timeline-segment--active') : 'timeline-segment--expired',
                      )}
                    />
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="studio-metric-card studio-metric-card--compact">
                    <span className="studio-metric-card__label">Unread</span>
                    <span className="studio-metric-card__value">{dashboardStats.unviewedCount}</span>
                  </div>
                  <div className="studio-metric-card studio-metric-card--compact">
                    <span className="studio-metric-card__label">Next expiry</span>
                    <span className="studio-metric-card__value text-[1.15rem] tracking-tight">{dashboardStats.timeRemainingLabel}</span>
                  </div>
                  <div className="studio-metric-card studio-metric-card--compact">
                    <span className="studio-metric-card__label">Latest state</span>
                    <span className="studio-metric-card__value text-[1.15rem] tracking-tight">
                      {dashboardStats.totalCount ? 'Live' : 'Idle'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="studio-reveal" id="activity">
            <div className="glass-surface rounded-[2rem] border border-white/12 p-5 sm:p-6">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[0.6875rem] font-medium tracking-[0.2em] text-accent uppercase">
                    Recent activity
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">Story state</h2>
                </div>
                <p className="text-sm text-muted">Derived from current local stories.</p>
              </div>

              <div className="mt-5 space-y-3">
                {recentActivity.length ? (
                  recentActivity.map((story) => (
                    <div
                      key={story.id}
                      className="studio-activity-row flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{story.label}</p>
                        <p className="truncate text-xs text-muted">{story.detail}</p>
                      </div>
                      <span className={story.tone === 'Viewed' ? 'studio-pill studio-pill--muted' : 'studio-pill studio-pill--active'}>
                        {story.tone}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.03] px-4 py-8 text-center">
                    <p className="text-sm font-medium text-foreground">No recent activity</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      Upload a story to start building a visible activity trail.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="stories" className="container-app mt-6 studio-reveal">
          <div className="glass-surface rounded-[2rem] border border-white/12 p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[0.6875rem] font-medium tracking-[0.2em] text-accent uppercase">
                  Stories rail
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">Your current stories</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted">{dashboardStats.totalCount} total</span>
                <button className="studio-button studio-button--small" type="button" onClick={handleOpenUpload}>
                  Create Story
                </button>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/8 bg-black/10 p-1">
              {stories.length ? (
                <StoryRail
                  data={storyRailData}
                  onAddStory={handleOpenUpload}
                  onSelectStory={handleSelectStory}
                />
              ) : (
                <div className="flex min-h-44 items-center justify-center rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-6 text-center">
                  <div className="max-w-sm space-y-2">
                    <h3 className="text-lg font-semibold tracking-tight">No stories right now</h3>
                    <p className="text-sm leading-relaxed text-muted">
                      Create the first story to populate the rail and featured preview.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <StoryViewer
        key={selectedStory?.id ?? 'closed'}
        currentUserUsername={mockStoryRailData.currentUser.username}
        onStoryDeleted={handleStoryDeleted}
        onStoryViewed={handleStoryViewed}
        initialStoryId={selectedStory?.id ?? null}
        onClose={handleCloseViewer}
        open={selectedStory !== null}
        stories={stories}
      />

      {isUploadModalOpen ? (
        <div
          aria-hidden="false"
          className="fixed inset-0 z-40 flex items-center justify-center px-safe py-safe"
          role="presentation"
        >
          <button
            aria-label="Close upload dialog"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            type="button"
            onClick={handleCloseUpload}
          />

          <section
            aria-labelledby="upload-story-title"
            aria-describedby="upload-story-description"
            aria-modal="true"
            className="upload-modal glass-surface relative z-10 w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/12 bg-background-elevated/90 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.55)] sm:p-6"
            role="dialog"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="absolute -left-20 -top-20 size-48 rounded-full bg-accent/20 blur-3xl" />
            <div className="absolute -bottom-24 -right-20 size-56 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative z-10 space-y-5">
              <div className="space-y-2">
                <p className="text-[0.6875rem] font-medium tracking-[0.2em] text-accent uppercase">
                  Upload Story
                </p>
                <h2 id="upload-story-title" className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
                  Add a new moment
                </h2>
                <p id="upload-story-description" className="max-w-md text-sm leading-relaxed text-muted sm:text-[0.9375rem]">
                  Pick a photo from your device. It will appear instantly in the rail and expire in 24 hours.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5">
                <div className="upload-dropzone flex min-h-40 flex-col items-center justify-center gap-3 rounded-[1.25rem] border border-dashed border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-6 py-8 text-center">
                  <div className="upload-dropzone__orb" aria-hidden="true" />
                  <div className="relative z-10 space-y-1.5">
                    <p className="text-sm font-medium text-foreground sm:text-base">Image upload</p>
                    <p className="text-xs leading-relaxed text-muted sm:text-sm">
                      JPG, PNG, or WEBP. No extra steps, just choose and post.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-5 text-sm font-medium text-foreground transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white/[0.06] active:translate-y-0 active:scale-[0.98]"
                  type="button"
                  onClick={handleCloseUpload}
                >
                  Cancel
                </button>
                <button
                  className="inline-flex h-11 items-center justify-center rounded-full bg-linear-to-r from-accent to-cyan-400 px-5 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(168,85,247,0.35)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_46px_rgba(168,85,247,0.42)] active:translate-y-0 active:scale-[0.98]"
                  type="button"
                  onClick={handleChooseUpload}
                >
                  Choose photo
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
