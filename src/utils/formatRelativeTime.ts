const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
})

export function formatRelativeTime(isoDate: string): string {
  const dateMs = new Date(isoDate).getTime()
  const diffMs = Date.now() - dateMs

  if (Number.isNaN(dateMs) || diffMs < 0) {
    return 'Just now'
  }

  const minutes = Math.floor(diffMs / 60_000)

  if (minutes < 1) {
    return 'Just now'
  }

  if (minutes < 60) {
    return relativeTimeFormatter.format(-minutes, 'minute')
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return relativeTimeFormatter.format(-hours, 'hour')
  }

  return relativeTimeFormatter.format(-Math.floor(hours / 24), 'day')
}
