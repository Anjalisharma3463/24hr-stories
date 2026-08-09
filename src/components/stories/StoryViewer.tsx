import { useEffect, useRef, useState, type PointerEvent, type TransitionEvent } from 'react'
import type { StoryRailUser } from '@/types/story'
import { cn } from '@/utils/cn'
import { formatRelativeTime } from '@/utils/formatRelativeTime'

const STORY_DURATION_MS = 5000
const SWIPE_THRESHOLD_RATIO = 0.2
const TAP_CANCEL_THRESHOLD_PX = 8
const DRAG_SETTLE_DURATION_MS = 220
const ENTER_OFFSET_PX = 36

type StoryViewerProps = {
  open: boolean
  stories: StoryRailUser[]
  initialStoryId: string | null
  onClose: () => void
  onStoryViewed?: (storyId: string) => void
  onStoryDeleted?: (storyId: string) => void
  currentUserUsername: string
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
  onStoryViewed,
  onStoryDeleted,
  currentUserUsername,
}: StoryViewerProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [currentIndex, setCurrentIndex] = useState(() => {
    const initialIndex = stories.findIndex((story) => story.id === initialStoryId)

    return initialIndex >= 0 ? initialIndex : 0
  })
  const [isReady, setIsReady] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [entryOffset, setEntryOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [pendingIndex, setPendingIndex] = useState<number | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const pointerRef = useRef<{
    id: number
    startX: number
    startY: number
    lastX: number
    lastY: number
    hasMoved: boolean
    isSwipeLocked: boolean
  } | null>(null)
  const gestureTargetRef = useRef<HTMLElement | null>(null)
  const pendingIndexRef = useRef<number | null>(null)
  const swipeDirectionRef = useRef<-1 | 1 | null>(null)
  const reportedStoryIdRef = useRef<string | null>(null)
  const currentStoryId = stories[currentIndex]?.id ?? null
  const currentStory = stories[currentIndex] ?? null
  const canDeleteCurrentStory = currentStory?.username === currentUserUsername

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
    if (!open || !onStoryViewed || !currentStoryId) {
      return
    }

    if (reportedStoryIdRef.current === currentStoryId) {
      return
    }

    reportedStoryIdRef.current = currentStoryId
    onStoryViewed(currentStoryId)
  }, [currentStoryId, onStoryViewed, open])

  useEffect(() => {
    pendingIndexRef.current = pendingIndex
  }, [pendingIndex])

  useEffect(() => {
    if (!open || stories.length === 0 || isDeleteDialogOpen) {
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
  }, [currentIndex, isDeleteDialogOpen, onClose, open, stories.length])

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
    if (!isDeleteDialogOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsDeleteDialogOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDeleteDialogOpen])

  const finishSwipeTransition = (nextIndex: number) => {
    setIsReady(false)
    setEntryOffset(swipeDirectionRef.current === -1 ? ENTER_OFFSET_PX : -ENTER_OFFSET_PX)
    setDragOffset(0)
    setPendingIndex(null)
    setCurrentIndex(nextIndex)

    window.requestAnimationFrame(() => {
      setIsReady(true)
    })
  }

  const resetDragState = () => {
    pointerRef.current = null
    gestureTargetRef.current = null
    swipeDirectionRef.current = null
    setIsDragging(false)
  }

  const handlePointerDown = (
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (isDeleteDialogOpen) {
      return
    }

    if (event.button !== 0) {
      return
    }

    const target = event.target as HTMLElement | null

    if (target?.closest('button,[role="button"],a,input,textarea,select')) {
      return
    }

    gestureTargetRef.current = event.currentTarget
    setEntryOffset(0)
    pointerRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      hasMoved: false,
      isSwipeLocked: false,
    }

    setIsDragging(true)
    setIsReady(false)
    setPendingIndex(null)

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (isDeleteDialogOpen) {
      return
    }

    const pointer = pointerRef.current

    if (!pointer || pointer.id !== event.pointerId || pendingIndexRef.current !== null) {
      return
    }

    const deltaX = event.clientX - pointer.startX
    const deltaY = event.clientY - pointer.startY

    if (!pointer.hasMoved && Math.hypot(deltaX, deltaY) < TAP_CANCEL_THRESHOLD_PX) {
      return
    }

    pointer.hasMoved = true
    pointer.lastX = event.clientX
    pointer.lastY = event.clientY

    if (!pointer.isSwipeLocked && Math.abs(deltaX) > Math.abs(deltaY)) {
      pointer.isSwipeLocked = true
    }

    if (!pointer.isSwipeLocked) {
      return
    }

    event.preventDefault()
    setDragOffset(deltaX)
  }

  const handlePointerUp = (
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (isDeleteDialogOpen) {
      return
    }

    const pointer = pointerRef.current

    if (!pointer || pointer.id !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - pointer.startX
    const deltaY = event.clientY - pointer.startY
    const viewportWidth = window.innerWidth
    const threshold = viewportWidth * SWIPE_THRESHOLD_RATIO
    const absoluteDeltaX = Math.abs(deltaX)
    const isSwipe = pointer.isSwipeLocked && absoluteDeltaX > threshold

    if (gestureTargetRef.current?.hasPointerCapture(event.pointerId)) {
      gestureTargetRef.current.releasePointerCapture(event.pointerId)
    }

    if (isSwipe) {
      const swipeDirection = deltaX < 0 ? -1 : 1
      const targetIndex =
        swipeDirection === -1
          ? Math.min(currentIndex + 1, stories.length - 1)
          : Math.max(currentIndex - 1, 0)

      swipeDirectionRef.current = swipeDirection

      if (targetIndex === currentIndex) {
        setDragOffset(0)
        resetDragState()

        if (currentIndex === stories.length - 1 && swipeDirection === -1) {
          onClose()
        }

        return
      }

      setPendingIndex(targetIndex)
      setIsReady(false)
      setIsDragging(false)
      setDragOffset(swipeDirection * viewportWidth * 1.08)
      return
    }

    if (Math.hypot(deltaX, deltaY) < TAP_CANCEL_THRESHOLD_PX) {
      const tapIsLeft = event.clientX < viewportWidth / 2

      if (tapIsLeft) {
        if (currentIndex === 0) {
          setDragOffset(0)
          setEntryOffset(0)
          resetDragState()
          return
        }

        setIsReady(false)
        setEntryOffset(ENTER_OFFSET_PX)
        setCurrentIndex((index) => Math.max(index - 1, 0))
        resetDragState()
        return
      }

      if (currentIndex >= stories.length - 1) {
        onClose()
        resetDragState()
        return
      }

      setIsReady(false)
      setEntryOffset(-ENTER_OFFSET_PX)
      setCurrentIndex((index) => Math.min(index + 1, stories.length - 1))
    }

    setDragOffset(0)
    setEntryOffset(0)
    resetDragState()
  }

  const handlePointerCancel = () => {
    setDragOffset(0)
    setPendingIndex(null)
    resetDragState()
  }

  const handleCardTransitionEnd = (
    event: TransitionEvent<HTMLDivElement>,
  ) => {
    if (event.propertyName !== 'transform') {
      return
    }

    const nextIndex = pendingIndexRef.current

    if (nextIndex === null) {
      return
    }

    finishSwipeTransition(nextIndex)
  }

  const handleDeleteConfirm = () => {
    if (!currentStory) {
      setIsDeleteDialogOpen(false)
      return
    }

    onStoryDeleted?.(currentStory.id)
    setIsDeleteDialogOpen(false)

    if (currentStory.id === currentStoryId) {
      onClose()
    }
  }

  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isDeleteDialogOpen) {
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()

        setIsReady(false)
        setEntryOffset(ENTER_OFFSET_PX)
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
        setEntryOffset(-ENTER_OFFSET_PX)
        setCurrentIndex((index) => Math.min(index + 1, stories.length - 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentIndex, isDeleteDialogOpen, onClose, open, stories.length])

  if (!open || stories.length === 0) {
    return null
  }
  const currentTransformX = isDragging ? dragOffset : pendingIndex !== null ? dragOffset : isReady ? 0 : entryOffset
  const transitionMs = prefersReducedMotion
    ? 1
    : isDragging || pendingIndex !== null
      ? 0
      : DRAG_SETTLE_DURATION_MS

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
          'absolute inset-0 scale-110 bg-cover bg-center blur-3xl transition-[opacity,transform] duration-500 ease-out',
          isReady ? 'opacity-45' : 'opacity-0',
          prefersReducedMotion && 'transition-none',
        )}
        style={{
          backgroundImage: `url(${currentStory.previewUrl})`,
          transform: `translate3d(${currentTransformX * 0.08}px, 0, 0) scale(1.1)`,
        }}
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_48%),linear-gradient(180deg,rgba(0,0,0,0.28),rgba(0,0,0,0.82))]"
      />

      {canDeleteCurrentStory ? (
        <button
          aria-label="Delete story"
          className={cn(
            'absolute right-4 top-4 z-30 inline-flex h-10 items-center gap-2 rounded-full border border-white/12 bg-black/35 px-4 text-sm font-medium text-white shadow-lg shadow-black/30 backdrop-blur-sm',
            'transition-transform duration-200 hover:scale-105 active:scale-95',
            prefersReducedMotion && 'transition-none hover:scale-100 active:scale-100',
          )}
          type="button"
          onClick={() => setIsDeleteDialogOpen(true)}
        >
          Delete
        </button>
      ) : null}

      <button
        aria-label="Previous story"
        className="absolute inset-y-0 left-0 z-10 w-1/2 cursor-default bg-transparent"
        type="button"
        onClick={() => {
          if (currentIndex === 0) {
            return
          }

          setIsReady(false)
          setEntryOffset(ENTER_OFFSET_PX)
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
          setEntryOffset(-ENTER_OFFSET_PX)
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
            onPointerCancel={handlePointerCancel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onTransitionEnd={handleCardTransitionEnd}
            className={cn(
              'relative w-full max-w-[min(92vw,26rem)] overflow-hidden rounded-[1.75rem] border border-white/12 bg-black/30 shadow-[0_30px_120px_rgba(0,0,0,0.6)] backdrop-blur-sm',
              'touch-none transition-[transform,opacity] ease-out',
              isReady
                ? 'translate-y-0 scale-100 opacity-100'
                : 'translate-y-4 scale-[0.98] opacity-0',
              prefersReducedMotion && 'transition-none',
            )}
            style={{
              transform: `translate3d(${currentTransformX}px, ${isReady ? 0 : 16}px, 0) scale(${isReady ? 1 : 0.98})`,
              transitionDuration: `${transitionMs}ms`,
            }}
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

      {isDeleteDialogOpen && currentStory ? (
        <div
          aria-hidden="false"
          className="absolute inset-0 z-40 flex items-center justify-center px-4"
        >
          <button
            aria-label="Close delete confirmation"
            className="absolute inset-0 bg-black/55"
            type="button"
            onClick={() => setIsDeleteDialogOpen(false)}
          />

          <div
            aria-labelledby="story-delete-title"
            aria-describedby="story-delete-description"
            aria-modal="true"
            className={cn(
              'relative z-10 w-full max-w-sm rounded-2xl border border-white/12 bg-background-elevated p-5 text-left shadow-[0_24px_80px_rgba(0,0,0,0.55)]',
              prefersReducedMotion && 'transition-none',
            )}
            role="alertdialog"
          >
            <h2 id="story-delete-title" className="text-lg font-semibold text-foreground">
              Delete story?
            </h2>
            <p id="story-delete-description" className="mt-2 text-sm leading-relaxed text-muted">
              This will permanently remove your story from the rail and local storage.
            </p>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                className={cn(
                  'inline-flex h-10 items-center justify-center rounded-full border border-border-subtle bg-transparent px-4 text-sm font-medium text-foreground',
                  'transition-transform duration-200 hover:scale-105 active:scale-95',
                  prefersReducedMotion && 'transition-none hover:scale-100 active:scale-100',
                )}
                type="button"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                className={cn(
                  'inline-flex h-10 items-center justify-center rounded-full bg-red-500 px-4 text-sm font-semibold text-white shadow-lg shadow-red-950/30',
                  'transition-transform duration-200 hover:scale-105 active:scale-95',
                  prefersReducedMotion && 'transition-none hover:scale-100 active:scale-100',
                )}
                type="button"
                onClick={handleDeleteConfirm}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}