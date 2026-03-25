import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { useClipboard } from '#/hooks/useClipboard'
import { useDebounce } from '#/hooks/useDebounce'
import { apiClient } from '#/api/client'
import { CheckIcon, CopyIcon, LinkIcon, SearchIcon } from 'lucide-react'

export const Route = createFileRoute('/links')({ component: LinksPage })

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Created At' },
  { value: 'code',       label: 'Short Code' },
  { value: 'original_url', label: 'Original URL' },
] as const

function LinksPage() {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('created_at')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebounce(search, 500)

  const linksQuery = useQuery({
    queryKey: ['links', { q: debouncedSearch, sort, order, page }],
    queryFn: () => apiClient.getLinks({ q: debouncedSearch, sort, order, page, limit: 20 }),
    placeholderData: (prev) => prev,
  })

  function handleSortChange(newSort: string) {
    setSort(newSort)
    setPage(1)
  }

  function handleOrderChange(newOrder: string) {
    setOrder(newOrder)
    setPage(1)
  }

  const data = linksQuery.data
  const totalPages = data?.total_pages ?? 1

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <div className="rise-in">
        <p className="island-kicker mb-3">Directory</p>
        <h1 className="display-title mb-6 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          All Links
        </h1>

        {/* Filters */}
        <Card className="island-shell mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SearchIcon className="size-4" />
              Filter &amp; Sort
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Search by code or URL…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="flex-1 min-w-48"
              />
              {search && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSearch('')}
                >
                  Clear
                </Button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-[var(--sea-ink-soft)]" htmlFor="lb-sort">
                  Sort by
                </label>
                <select
                  id="lb-sort"
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="rounded-md border border-[var(--line)] bg-[var(--chip-bg)] px-2 py-1 text-sm text-[var(--sea-ink)] focus:outline-none"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-[var(--sea-ink-soft)]" htmlFor="lb-order">
                  Order
                </label>
                <select
                  id="lb-order"
                  value={order}
                  onChange={(e) => handleOrderChange(e.target.value)}
                  className="rounded-md border border-[var(--line)] bg-[var(--chip-bg)] px-2 py-1 text-sm text-[var(--sea-ink)] focus:outline-none"
                >
                  <option value="desc">Newest first</option>
                  <option value="asc">Oldest first</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results summary */}
        {data && (
          <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">
            {data.total === 0
              ? 'No links found.'
              : `Showing ${(page - 1) * 20 + 1}–${Math.min(page * 20, data.total)} of ${data.total} link${data.total !== 1 ? 's' : ''}`}
          </p>
        )}

        {/* Table */}
        <Card className="island-shell mb-6">
          <CardContent className="p-0">
            {linksQuery.isPending && <LinksSkeleton />}
            {linksQuery.isError && (
              <p className="p-6 text-center text-sm text-[var(--sea-ink-soft)]">
                {linksQuery.error instanceof Error ? linksQuery.error.message : 'Failed to load links.'}
              </p>
            )}
            {data && data.items.length === 0 && (
              <p className="p-6 text-center text-sm text-[var(--sea-ink-soft)]">
                {debouncedSearch ? `No links matching "${debouncedSearch}".` : 'No links have been created yet.'}
              </p>
            )}
            {data && data.items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
                      <th className="px-4 py-3">Short Code</th>
                      <th className="px-4 py-3">Original URL</th>
                      <th className="px-4 py-3 whitespace-nowrap">Created At</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {data.items.map((item) => (
                      <LinksRow key={item.code} item={item} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || linksQuery.isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-[var(--sea-ink-soft)]">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || linksQuery.isFetching}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}

type LinkItem = {
  code: string
  short_url: string
  original_url: string
  created_at: string
}

function LinksRow({ item }: { item: LinkItem }) {
  const { copied, copy } = useClipboard()

  return (
    <tr className="hover:bg-[var(--chip-bg)] transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <LinkIcon className="size-3 shrink-0 text-[var(--lagoon-deep)]" />
          <a
            href={item.short_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[var(--lagoon-deep)] hover:underline"
          >
            /{item.code}
          </a>
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className="block max-w-xs truncate text-[var(--sea-ink-soft)]"
          title={item.original_url}
        >
          {item.original_url}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-[var(--sea-ink-soft)]">
        {new Date(item.created_at).toLocaleString()}
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          title="Copy short URL"
          onClick={() => copy(item.short_url)}
          className="rounded p-1 text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] transition-colors"
        >
          {copied ? (
            <CheckIcon className="size-4 text-green-500" />
          ) : (
            <CopyIcon className="size-4" />
          )}
        </button>
      </td>
    </tr>
  )
}

function LinksSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {Array.from({ length: 5 }, (_, i) => `row-${i}`).map((k) => (
        <Skeleton key={k} className="h-10 w-full" />
      ))}
    </div>
  )
}
