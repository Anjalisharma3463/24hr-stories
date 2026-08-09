import { useEffect, useRef } from 'react'

const MAX_TILT = 4
const LERP = 0.14
const SETTLE_THRESHOLD = 0.05

type TiltState = {
  rotateX: number
  rotateY: number
}

export function useCardTilt<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const frameRef = useRef<number | null>(null)
  const targetRef = useRef<TiltState>({ rotateX: 0, rotateY: 0 })
  const currentRef = useRef<TiltState>({ rotateX: 0, rotateY: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) {
      return
    }

    const isCoarsePointer = window.matchMedia(
      '(hover: none) and (pointer: coarse)',
    ).matches
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (isCoarsePointer || prefersReducedMotion) {
      return
    }

    const applyTransform = () => {
      element.style.transform = `rotateX(${currentRef.current.rotateX.toFixed(2)}deg) rotateY(${currentRef.current.rotateY.toFixed(2)}deg) translateZ(6px)`
    }

    const tick = () => {
      const current = currentRef.current
      const target = targetRef.current

      current.rotateX += (target.rotateX - current.rotateX) * LERP
      current.rotateY += (target.rotateY - current.rotateY) * LERP

      applyTransform()

      const isSettled =
        Math.abs(target.rotateX - current.rotateX) < SETTLE_THRESHOLD &&
        Math.abs(target.rotateY - current.rotateY) < SETTLE_THRESHOLD

      if (isSettled) {
        current.rotateX = target.rotateX
        current.rotateY = target.rotateY
        applyTransform()
        frameRef.current = null
        return
      }

      frameRef.current = requestAnimationFrame(tick)
    }

    const startAnimation = () => {
      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width - 0.5
      const y = (event.clientY - rect.top) / rect.height - 0.5

      targetRef.current = {
        rotateX: Math.max(-MAX_TILT, Math.min(MAX_TILT, -y * MAX_TILT * 2)),
        rotateY: Math.max(-MAX_TILT, Math.min(MAX_TILT, x * MAX_TILT * 2)),
      }

      startAnimation()
    }

    const handlePointerLeave = () => {
      targetRef.current = { rotateX: 0, rotateY: 0 }
      startAnimation()
    }

    element.addEventListener('pointermove', handlePointerMove)
    element.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }

      element.removeEventListener('pointermove', handlePointerMove)
      element.removeEventListener('pointerleave', handlePointerLeave)
      element.style.transform = ''
    }
  }, [])

  return ref
}
