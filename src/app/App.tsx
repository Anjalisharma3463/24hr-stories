import { StoryRail } from '@/components/stories'

export function App() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main className="flex min-h-dvh flex-col py-safe">
        <StoryRail />

        <div className="container-app flex flex-1 items-center justify-center px-safe pb-8 pt-10">
          <p className="max-w-md text-center text-sm leading-relaxed text-muted">
            Story rail foundation is ready. Fullscreen viewer arrives in the
            next phase.
          </p>
        </div>
      </main>
    </div>
  )
}
