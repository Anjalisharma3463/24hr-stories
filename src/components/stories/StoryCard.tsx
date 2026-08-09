import { useCardTilt } from '@/hooks/useCardTilt'
import type { StoryRailUser } from '@/types/story'
import { cn } from '@/utils/cn'
import { formatRelativeTime } from '@/utils/formatRelativeTime'

type StoryCardProps = {
  story: StoryRailUser
  onSelect?: (story: StoryRailUser) => void
}

export function StoryCard({ story, onSelect }: StoryCardProps) {
  const tiltRef = useCardTilt<HTMLDivElement>()

  return (
    <button
      type="button"
      aria-label={`Open ${story.username}'s story, ${formatRelativeTime(story.createdAt)}`}
      className={cn(
        'group story-card snap-start',
        'flex min-w-[4.75rem] shrink-0 flex-col items-center gap-2 md:min-w-[5.25rem]',
        'rounded-2xl p-1.5 outline-none',
        'transition-[transform,opacity] duration-200',
        'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'active:scale-[0.97]',
      )}
      onClick={() => onSelect?.(story)}
    >
      <div
        ref={tiltRef}
        className={cn(
          'story-card-tilt preserve-3d gpu-layer scene-3d-near',
          'rounded-[1.5rem] bg-white/[0.03] p-0.5',
          'transition-transform duration-200',
          'group-hover:scale-[1.035]',
        )}
      >
        <div className={cn('story-ring', story.viewed ? 'story-ring--seen' : 'story-ring--unseen')}>
          <div className="story-ring__inner story-ring__inner--premium">
            <div className="story-ring__sheen" aria-hidden="true" />
            <img
              src={story.previewUrl}
              alt=""
              width={72}
              height={72}
              loading="lazy"
              decoding="async"
              className="story-ring__image"
            />
          </div>
        </div>
      </div>

      <div className="flex w-full max-w-[4.75rem] flex-col items-center gap-0.5 text-center md:max-w-[5.25rem]">
        <span
          className={cn(
            'w-full truncate text-[0.6875rem] font-medium tracking-wide',
            story.viewed ? 'text-foreground-secondary' : 'text-foreground',
          )}
        >
          {story.username}
        </span>
        <span className="w-full truncate text-[0.625rem] uppercase tracking-[0.14em] text-muted">
          {formatRelativeTime(story.createdAt)}
        </span>
      </div>
    </button>
  )
}
