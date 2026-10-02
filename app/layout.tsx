import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'CommitCoach',
    template: '%s · CommitCoach',
  },
  description:
    'A habit tracker that asks what happened when you miss a day, learns your patterns, and adjusts the plan instead of shaming you for a broken streak.',
  applicationName: 'CommitCoach',
  appleWebApp: { capable: true, title: 'CommitCoach', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF9' },
    { media: '(prefers-color-scheme: dark)', color: '#0C0A09' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans text-text antialiased">{children}</body>
    </html>
  )
}
