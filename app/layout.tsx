import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '../components/AuthProvider'
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'Smart Task Evaluator',
  description: 'Intelligent task evaluation and management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <AuthProvider>
          <Navigation />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  )
}