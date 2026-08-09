import { useEffect, useState } from 'react'
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

  const selectedStory =
    stories.find((story) => story.id === selectedStoryId) ?? null

  const storyRailData: StoryRailData = {
    currentUser: mockStoryRailData.currentUser,
    stories,
  }

  const handleStoryViewed = (storyId: string) => {
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
  }

  const handleStoryDeleted = (storyId: string) => {
    removeStoredStory(storyId)

    setStories((currentStories) => currentStories.filter((story) => story.id !== storyId))

    if (selectedStoryId === storyId) {
      setSelectedStoryId(null)
    }
  }

  useEffect(() => {
    const activeStoredStories = filterActiveStoredStories(
      getStoredStories(stories).map(createStoredStory),
    )

    saveStoredStories(activeStoredStories)
  }, [stories])

  useEffect(() => {
    const activeStoredStories = getStoredStories(stories)
    const delay = getNextStoredStoryExpirationDelay(
      activeStoredStories.map(createStoredStory),
    )

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

        saveStoredStories(nextStoredStories)

        return nextStories
      })
    }, delay)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [stories])

  const handleAddStory = async () => {
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

      saveStoredStories(
        filterActiveStoredStories(
          getStoredStories(nextStories).map(createStoredStory),
        ),
      )

      return nextStories
    })
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main className="flex min-h-dvh flex-col py-safe">
        <StoryRail
          data={storyRailData}
          onAddStory={() => {
            void handleAddStory()
          }}
          onSelectStory={(story) => setSelectedStoryId(story.id)}
        />
      </main>

      <StoryViewer
        key={selectedStory?.id ?? 'closed'}
        currentUserUsername={mockStoryRailData.currentUser.username}
        onStoryDeleted={handleStoryDeleted}
        onStoryViewed={handleStoryViewed}
        initialStoryId={selectedStory?.id ?? null}
        onClose={() => setSelectedStoryId(null)}
        open={selectedStory !== null}
        stories={stories}
      />
    </div>
  )
}
