import { useEffect, useState } from 'react'
import type { StoryRailUser } from '@/types/story'
import { cn } from '@/utils/cn'
import { formatRelativeTime } from '@/utils/formatRelativeTime'

const STORY_DURATION_MS = 5000

type StoryViewerProps = {
  open: boolean
  stories: StoryRailUser[]
  initialStoryId: string | null
  onClose: () => void
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches)
    }

    updatePreference()

    mediaQuery.addEventListener('change', updatePreference)

    return () => {
      mediaQuery.removeEventListener('change', updatePreference)
    }
  }, [])

  return prefersReducedMotion
}

export function StoryViewer({
  open,
  stories,
  initialStoryId,
  onClose,
}: StoryViewerProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [currentIndex, setCurrentIndex] = useState(() => {
    const initialIndex = stories.findIndex((story) => story.id === initialStoryId)

    return initialIndex >= 0 ? initialIndex : 0
  })
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      setIsReady(true)
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [currentIndex, open])

  useEffect(() => {
    if (!open || stories.length === 0) {
      return
    }

    const timer = window.setTimeout(() => {
      if (currentIndex >= stories.length - 1) {
        onClose()
        return
      }

      setIsReady(false)
      setCurrentIndex((index) => Math.min(index + 1, stories.length - 1))
    }, STORY_DURATION_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [currentIndex, onClose, open, stories.length])

  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight =
      scrollbarWidth > 0 ? `${scrollbarWidth}px` : previousPaddingRight

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()

        setIsReady(false)
        setCurrentIndex((index) => Math.max(index - 1, 0))
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()

        if (currentIndex >= stories.length - 1) {
          onClose()
          return
        }

        setIsReady(false)
        setCurrentIndex((index) => Math.min(index + 1, stories.length - 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentIndex, onClose, open, stories.length])

  if (!open || stories.length === 0) {
    return null
  }

  const currentStory = stories[currentIndex]

  return (
    <div
      aria-label="Story viewer"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-black/80" />

      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 scale-110 bg-cover bg-center blur-3xl transition-opacity duration-500 ease-out',
          isReady ? 'opacity-45' : 'opacity-0',
          prefersReducedMotion && 'transition-none',
        )}
        style={{ backgroundImage: `url(${currentStory.previewUrl})` }}
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_48%),linear-gradient(180deg,rgba(0,0,0,0.28),rgba(0,0,0,0.82))]"
      />

      <button
        aria-label="Previous story"
        className="absolute inset-y-0 left-0 z-10 w-1/2 cursor-default bg-transparent"
        type="button"
        onClick={() => {
          if (currentIndex === 0) {
            return
          }

          setIsReady(false)
          setCurrentIndex((index) => Math.max(index - 1, 0))
        }}
      />

      <button
        aria-label="Next story"
        className="absolute inset-y-0 right-0 z-10 w-1/2 cursor-default bg-transparent"
        type="button"
        onClick={() => {
          if (currentIndex >= stories.length - 1) {
            onClose()
            return
          }

          setIsReady(false)
          setCurrentIndex((index) => Math.min(index + 1, stories.length - 1))
        }}
      />

      <div className="relative z-20 flex h-full w-full flex-col px-safe py-safe">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
          <div className="flex items-center gap-1.5 px-2">
            {stories.map((story, index) => {
              const isComplete = index < currentIndex
              const isActive = index === currentIndex

              return (
                <div
                  key={story.id}
                  className="h-1 flex-1 overflow-hidden rounded-full bg-white/12"
                >
                  <div
                    className={cn(
                      'h-full rounded-full bg-white transition-[width,opacity] ease-linear',
                      prefersReducedMotion ? 'transition-none' : 'duration-300',
                    )}
                    style={{
                      opacity: isComplete || isActive ? 1 : 0.35,
                      transitionDuration: isActive
                        ? prefersReducedMotion
                          ? '0ms'
                          : `${STORY_DURATION_MS}ms`
                        : undefined,
                      width: isComplete ? '100%' : isActive && isReady ? '100%' : '0%',
                    }}
                  />
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between gap-4 px-2 text-white">
            <div>
              <p className="text-sm font-medium tracking-wide text-white/80">
                {currentStory.username}
              </p>
              <p className="text-xs text-white/55">
                {formatRelativeTime(currentStory.createdAt)}
              </p>
            </div>

            <button
              aria-label="Close story viewer"
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/30 text-lg text-white shadow-lg shadow-black/30 backdrop-blur-sm',
                'transition-transform duration-200 hover:scale-105 active:scale-95',
                prefersReducedMotion && 'transition-none hover:scale-100 active:scale-100',
              )}
              type="button"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-2 py-4 sm:px-6 sm:py-6">
          <div
            className={cn(
              'relative w-full max-w-[min(92vw,26rem)] overflow-hidden rounded-[1.75rem] border border-white/12 bg-black/30 shadow-[0_30px_120px_rgba(0,0,0,0.6)] backdrop-blur-sm',
              'transition-[transform,opacity] duration-300 ease-out',
              isReady
                ? 'translate-y-0 scale-100 opacity-100'
                : 'translate-y-4 scale-[0.98] opacity-0',
              prefersReducedMotion && 'transition-none',
            )}
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/35"
            />
            <img
              alt={`${currentStory.username}'s story`}
              className="relative z-10 h-auto w-full object-contain"
              decoding="async"
              height={1024}
              src={currentStory.previewUrl}
              width={768}
            />
          </div>
        </div>
      </div>
    </div>
  )
}