import { mockStoryRailData } from '@/constants/mockStories'
import type { StoryRailData, StoryRailUser } from '@/types/story'
import { cn } from '@/utils/cn'
import { AddStoryCard } from './AddStoryCard'
import { StoryCard } from './StoryCard'

type StoryRailProps = {
  data?: StoryRailData
  onAddStory?: () => void
  onSelectStory?: (story: StoryRailUser) => void
}

export function StoryRail({
  data = mockStoryRailData,
  onAddStory,
  onSelectStory,
}: StoryRailProps) {
  return (
    <section
      aria-label="Stories"
      className={cn(
        'story-rail',
        'w-full border-b border-border-subtle',
        'bg-linear-to-b from-background-secondary/80 to-background/40',
        'py-4 md:py-5',
      )}
    >
      <div className="container-app">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[0.6875rem] font-medium tracking-wide text-accent uppercase">
              Stories
            </p>
            <h2 className="text-lg font-semibold tracking-tight md:text-xl">
              Today
            </h2>
          </div>
          <p className="hidden text-xs text-muted sm:block">
            Swipe to explore
          </p>
        </div>

        <div className="story-rail-scroll -mx-1 px-1">
          <div className="flex w-max min-w-full gap-3 md:gap-4">
            <AddStoryCard user={data.currentUser} onAdd={onAddStory} />
            {data.stories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                onSelect={onSelectStory}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
