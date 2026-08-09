import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StoryRail, StoryViewer } from '@/components/stories'
import { mockStoryRailData } from '@/constants/mockStories'
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

const readFileAsDataUrl = (file: File): Promise<string> =>
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

export function App() {
  const [stories, setStories] = useState<StoryRailUser[]>(loadInitialStories)
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
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

    if (selectedStoryId === storyId) {
      setSelectedStoryId(null)
    }
  }, [selectedStoryId])

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

    const fileSelection = new Promise<File | null>((resolve) => {
      input.addEventListener('change', () => {
        resolve(input.files?.[0] ?? null)
      })
    })

    input.click()

    const file = await fileSelection

    if (!file) {
      return
    }

    let imageData: string

    try {
      imageData = await readFileAsDataUrl(file)
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

  return (
    <div className="app-shell min-h-dvh bg-background text-foreground">
      <div aria-hidden="true" className="app-ambient app-ambient--one" />
      <div aria-hidden="true" className="app-ambient app-ambient--two" />
      <div aria-hidden="true" className="app-ambient app-ambient--three" />

      <main className="relative flex min-h-dvh flex-col py-safe">
        <StoryRail
          data={storyRailData}
          onAddStory={handleOpenUpload}
          onSelectStory={handleSelectStory}
        />
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
