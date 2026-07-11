import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { QueryProvider } from '@/providers/QueryProvider'

export const metadata: Metadata = {
  title: {
    default: 'BuildWise AI — AI-Powered Construction Estimation',
    template: '%s | BuildWise AI',
  },
  description:
    'Upload your building plan and get instant AI-powered material estimation, Bill of Quantities, and cost breakdown. Used by 5000+ civil engineers.',
  keywords: ['construction estimation', 'BOQ', 'material takeoff', 'AI', 'civil engineering'],
  authors: [{ name: 'BuildWise AI' }],
  openGraph: {
    title: 'BuildWise AI',
    description: 'AI-powered construction material estimation',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
