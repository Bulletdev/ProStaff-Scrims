import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/providers/QueryProvider'
import { LanguageProvider } from '@/contexts/LanguageContext'
import '@/styles/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'scrims.lol — Find Your Next Scrim',
  description: 'The fastest way to schedule competitive scrims. Find opponents, book games, track results. Powered by ProStaff.gg',
  keywords: ['scrims', 'esports', 'league of legends', 'competitive gaming', 'scrim finder'],
  openGraph: {
    title: 'scrims.lol',
    description: 'Find your next scrim. Powered by ProStaff.gg',
    url: 'https://scrims.lol',
    siteName: 'scrims.lol',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-navy text-text-primary antialiased`}>
        <QueryProvider>
          <LanguageProvider>
            {children}
            <Toaster theme="dark" position="bottom-right" richColors />
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
