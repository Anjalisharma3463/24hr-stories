import { Plus } from 'lucide-react'
import type { CurrentUserStory } from '@/types/story'
import { cn } from '@/utils/cn'
import { formatRelativeTime } from '@/utils/formatRelativeTime'

type AddStoryCardProps = {
  user: CurrentUserStory
  onAdd?: () => void
}

export function AddStoryCard({ user, onAdd }: AddStoryCardProps) {
  const label = user.hasStory ? 'Your story' : 'Add your story'
  const timestamp = user.createdAt ? formatRelativeTime(user.createdAt) : 'New'

  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'group add-story-card snap-start',
        'flex min-w-[4.75rem] shrink-0 flex-col items-center gap-2 md:min-w-[5.25rem]',
        'rounded-2xl p-1.5 outline-none',
        'transition-[transform,opacity] duration-200',
        'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'active:scale-[0.96]',
      )}
      onClick={() => onAdd?.()}
    >
      <div
        className={cn(
          'relative flex size-[4.75rem] items-center justify-center md:size-[5.25rem]',
          'transition-transform duration-200',
          'group-hover:scale-[1.04]',
        )}
      >
        <div className="story-ring story-ring--self">
          <div className="story-ring__inner story-ring__inner--self story-ring__inner--premium">
            <div className="story-ring__sheen" aria-hidden="true" />
            {user.hasStory && user.previewUrl ? (
              <img
                src={user.previewUrl}
                alt=""
                width={72}
                height={72}
                className="story-ring__image"
              />
            ) : (
              <img
                src={user.avatarUrl}
                alt=""
                width={72}
                height={72}
                className="story-ring__image story-ring__image--muted"
              />
            )}
          </div>
        </div>

        <span
          aria-hidden="true"
          className={cn(
            'absolute -bottom-0.5 -right-0.5',
            'flex size-7 items-center justify-center rounded-full',
            'border-2 border-background bg-accent text-foreground',
            'shadow-glow transition-transform duration-200',
            'group-hover:scale-110 group-active:scale-95',
          )}
        >
          <Plus className="size-4 stroke-[2.5]" />
        </span>
      </div>

      <div className="flex w-full max-w-[4.75rem] flex-col items-center gap-0.5 text-center md:max-w-[5.25rem]">
        <span className="w-full truncate text-[0.6875rem] font-semibold tracking-wide text-accent">
          Your Story
        </span>
        <span className="w-full truncate text-[0.625rem] uppercase tracking-[0.14em] text-muted">
          {timestamp}
        </span>
      </div>
    </button>
  )
}
