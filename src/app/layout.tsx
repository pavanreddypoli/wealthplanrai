import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'WealthPlanrAI — AI-Powered Financial Planning', template: '%s | WealthPlanrAI' },
  description: 'AI-powered financial planning platform for modern advisors. Assess clients, generate insights, and deliver personalized financial plans powered by AI.',
  keywords: ['financial planning', 'AI financial advisor', 'wealth management', 'financial assessment', 'RIA software', 'CFP tools'],
  openGraph: {
    title: 'WealthPlanrAI — AI-Powered Financial Planning',
    description: 'AI-powered financial planning for modern advisors',
    type: 'website',
    url: 'https://wealthplanrai.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WealthPlanrAI',
    description: 'AI-powered financial planning for modern advisors',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
