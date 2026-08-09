import { useState } from 'react'
import { StoryRail, StoryViewer } from '@/components/stories'
import { mockStoryRailData } from '@/constants/mockStories'
import {
  createStoredStory,
  fromStoredStory,
  loadStoredStories,
  saveStoredStories,
} from '@/services'
import type { StoryRailData, StoryRailUser } from '@/types/story'

const sortStoriesByNewest = (stories: StoryRailUser[]) =>
  [...stories].sort(
    (leftStory, rightStory) =>
      new Date(rightStory.createdAt).getTime() -
      new Date(leftStory.createdAt).getTime(),
  )

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

const initialStories = sortStoriesByNewest([
  ...mockStoryRailData.stories,
  ...loadStoredStories().map(fromStoredStory),
])

const initialStoryRailData: StoryRailData = {
  currentUser: mockStoryRailData.currentUser,
  stories: initialStories,
}

export function App() {
  const [stories, setStories] = useState<StoryRailUser[]>(initialStories)
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)

  const selectedStory = stories.find((story) => story.id === selectedStoryId) ?? null

  const storyRailData: StoryRailData = {
    ...initialStoryRailData,
    stories,
  }

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
      seen: false,
    }

    setStories((currentStories) => {
      const nextStories = sortStoriesByNewest([newStory, ...currentStories])

      saveStoredStories(
        nextStories
          .filter((story) => !mockStoryRailData.stories.some(({ id }) => id === story.id))
          .map(createStoredStory),
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
        initialStoryId={selectedStory?.id ?? null}
        onClose={() => setSelectedStoryId(null)}
        open={selectedStory !== null}
        stories={stories}
      />
    </div>
  )
}
