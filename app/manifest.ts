import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CommitCoach',
    short_name: 'CommitCoach',
    description: 'Habit tracking that learns why you miss days.',
    start_url: '/today',
    display: 'standalone',
    background_color: '#FAFAF9',
    theme_color: '#059669',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
