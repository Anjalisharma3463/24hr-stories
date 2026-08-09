import { useState } from 'react'
import { StoryRail, StoryViewer } from '@/components/stories'
import { mockStoryRailData } from '@/constants/mockStories'

export function App() {
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)

  const selectedStory =
    mockStoryRailData.stories.find((story) => story.id === selectedStoryId) ??
    null

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main className="flex min-h-dvh flex-col py-safe">
        <StoryRail
          data={mockStoryRailData}
          onSelectStory={(story) => {
            setSelectedStoryId(story.id)
          }}
        />
      </main>

      <StoryViewer
        key={selectedStory?.id ?? 'closed'}
        initialStoryId={selectedStory?.id ?? null}
        onClose={() => setSelectedStoryId(null)}
        open={selectedStory !== null}
        stories={mockStoryRailData.stories}
      />
    </div>
  )
}
