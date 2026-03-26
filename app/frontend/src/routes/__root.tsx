import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Header from '#/components/Header'
import Footer from '#/components/Footer'
import { Button } from '#/components/ui/button'

import '../styles.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime:           5 * 60 * 1000,   // 5 min — data considered fresh
      gcTime:             10 * 60 * 1000,   // 10 min — keep unused data in cache
      refetchOnMount:          false,        // use cached data when navigating back
      refetchOnWindowFocus:    false,        // don't refetch on tab focus
    },
  },
})

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
})

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </QueryClientProvider>
  )
}

function NotFoundPage() {
  return (
    <div className="page-wrap flex flex-col items-center justify-center px-4 pb-8 pt-20 text-center">
      <div className="rise-in">
        <p className="island-kicker mb-3">404 Error</p>
        <h1 className="display-title mb-4 text-5xl font-bold text-[var(--sea-ink)] sm:text-7xl">
          Page Not Found
        </h1>
        <p className="mb-8 max-w-md text-lg text-[var(--sea-ink-soft)]">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <Button asChild size="lg">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  )
}
