import type { StoryRailData } from '@/types/story'

const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

export const mockStoryRailData: StoryRailData = {
  currentUser: {
    id: 'user-self',
    username: 'You',
    avatarUrl: 'https://picsum.photos/seed/self-avatar/128/128',
    hasStory: false,
  },
  stories: [
    {
      id: 'story-1',
      username: 'maya',
      avatarUrl: 'https://picsum.photos/seed/maya-avatar/128/128',
      previewUrl: 'https://picsum.photos/seed/maya-story/144/192',
      createdAt: hoursAgo(1),
      seen: false,
    },
    {
      id: 'story-2',
      username: 'alex',
      avatarUrl: 'https://picsum.photos/seed/alex-avatar/128/128',
      previewUrl: 'https://picsum.photos/seed/alex-story/144/192',
      createdAt: hoursAgo(2),
      seen: false,
    },
    {
      id: 'story-3',
      username: 'sora',
      avatarUrl: 'https://picsum.photos/seed/sora-avatar/128/128',
      previewUrl: 'https://picsum.photos/seed/sora-story/144/192',
      createdAt: hoursAgo(3),
      seen: true,
    },
    {
      id: 'story-4',
      username: 'nina',
      avatarUrl: 'https://picsum.photos/seed/nina-avatar/128/128',
      previewUrl: 'https://picsum.photos/seed/nina-story/144/192',
      createdAt: hoursAgo(5),
      seen: false,
    },
    {
      id: 'story-5',
      username: 'leo',
      avatarUrl: 'https://picsum.photos/seed/leo-avatar/128/128',
      previewUrl: 'https://picsum.photos/seed/leo-story/144/192',
      createdAt: hoursAgo(8),
      seen: true,
    },
    {
      id: 'story-6',
      username: 'zara',
      avatarUrl: 'https://picsum.photos/seed/zara-avatar/128/128',
      previewUrl: 'https://picsum.photos/seed/zara-story/144/192',
      createdAt: hoursAgo(12),
      seen: false,
    },
    {
      id: 'story-7',
      username: 'kai',
      avatarUrl: 'https://picsum.photos/seed/kai-avatar/128/128',
      previewUrl: 'https://picsum.photos/seed/kai-story/144/192',
      createdAt: hoursAgo(16),
      seen: true,
    },
    {
      id: 'story-8',
      username: 'ivy',
      avatarUrl: 'https://picsum.photos/seed/ivy-avatar/128/128',
      previewUrl: 'https://picsum.photos/seed/ivy-story/144/192',
      createdAt: hoursAgo(20),
      seen: false,
    },
    {
      id: 'story-9',
      username: 'remy',
      avatarUrl: 'https://picsum.photos/seed/remy-avatar/128/128',
      previewUrl: 'https://picsum.photos/seed/remy-story/144/192',
      createdAt: hoursAgo(22),
      seen: true,
    },
  ],
}
