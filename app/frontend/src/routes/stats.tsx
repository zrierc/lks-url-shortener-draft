import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { Badge } from '#/components/ui/badge'
import { ClicksOverTime } from '#/components/charts/ClicksOverTime'
import { DeviceBreakdown } from '#/components/charts/DeviceBreakdown'
import { OsBreakdown } from '#/components/charts/OsBreakdown'
import { BrowserBreakdown } from '#/components/charts/BrowserBreakdown'
import { useDebounce } from '#/hooks/useDebounce'
import { apiClient } from '#/api/client'
import { BarChart2Icon, SearchIcon } from 'lucide-react'

export const Route = createFileRoute('/stats')({ component: StatsPage })

const LB_SORT_OPTIONS = [
  { value: 'click_count',  label: 'Click Count' },
  { value: 'code',         label: 'Short Code' },
  { value: 'last_clicked', label: 'Last Clicked' },
] as const

function StatsPage() {
  const [codeInput, setCodeInput] = useState('')
  const [activeCode, setActiveCode] = useState('')

  // Leaderboard filter state
  const [lbSearch, setLbSearch] = useState('')
  const [lbFrom, setLbFrom] = useState('')
  const [lbTo, setLbTo] = useState('')
  const [lbSort, setLbSort] = useState('click_count')
  const [lbOrder, setLbOrder] = useState('desc')
  const [lbPage, setLbPage] = useState(1)

  const debouncedLbSearch = useDebounce(lbSearch, 500)

  const statsQuery = useQuery({
    queryKey: ['stats', activeCode],
    queryFn: () => apiClient.getStats(activeCode),
    enabled: !!activeCode,
    retry: false,
  })

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', { q: debouncedLbSearch, lbFrom, lbTo, lbSort, lbOrder, lbPage }],
    queryFn: () => apiClient.getLeaderboard({
      q:     debouncedLbSearch,
      from:  lbFrom,
      to:    lbTo,
      sort:  lbSort,
      order: lbOrder,
      page:  lbPage,
      limit: 10,
    }),
    placeholderData: (prev) => prev,
  })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const code = codeInput.trim()
    if (!code) return
    setActiveCode(code)
  }

  function handleLbDateChange(field: 'from' | 'to', value: string) {
    if (field === 'from') setLbFrom(value)
    else setLbTo(value)
    setLbPage(1)
  }

  function handleLbSortChange(value: string) {
    setLbSort(value)
    setLbPage(1)
  }

  function handleLbOrderChange(value: string) {
    setLbOrder(value)
    setLbPage(1)
  }

  const lbData = leaderboardQuery.data
  const lbTotalPages = lbData?.total_pages ?? 1

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <div className="rise-in">
        <p className="island-kicker mb-3">Analytics</p>
        <h1 className="display-title mb-6 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Stats Dashboard
        </h1>

        {/* Code search */}
        <Card className="island-shell mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SearchIcon className="size-4" />
              Look up a short code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="e.g. abc123"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={!codeInput.trim() || statsQuery.isFetching}>
                {statsQuery.isFetching ? 'Loading…' : 'Search'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Stats result */}
        {activeCode && (
          <section className="mb-10">
            {statsQuery.isPending && <StatsSkeleton />}
            {statsQuery.isError && (
              <div className="island-shell rounded-2xl p-6 text-center">
                <p className="text-[var(--sea-ink-soft)]">
                  {statsQuery.error instanceof Error
                    ? statsQuery.error.message
                    : 'No stats found for this code.'}
                </p>
              </div>
            )}
            {statsQuery.data && (
              <>
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold text-[var(--sea-ink)]">
                    /{statsQuery.data.code}
                  </h2>
                  <Badge variant="secondary">{statsQuery.data.click_count} clicks</Badge>
                  {statsQuery.data.last_clicked && (
                    <span className="text-sm text-[var(--sea-ink-soft)]">
                      Last click: {new Date(statsQuery.data.last_clicked).toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="mb-6 text-sm text-[var(--sea-ink-soft)] truncate">
                  → {statsQuery.data.original_url}
                </p>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="island-shell">
                    <CardHeader>
                      <CardTitle className="text-sm">Clicks Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {statsQuery.data.clicks_over_time.length === 0 ? (
                        <p className="py-10 text-center text-sm text-[var(--sea-ink-soft)]">No data yet</p>
                      ) : (
                        <ClicksOverTime data={statsQuery.data.clicks_over_time} />
                      )}
                    </CardContent>
                  </Card>

                  <Card className="island-shell">
                    <CardHeader>
                      <CardTitle className="text-sm">Device Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {statsQuery.data.by_device.length === 0 ? (
                        <p className="py-10 text-center text-sm text-[var(--sea-ink-soft)]">No data yet</p>
                      ) : (
                        <DeviceBreakdown data={statsQuery.data.by_device} />
                      )}
                    </CardContent>
                  </Card>

                  <Card className="island-shell">
                    <CardHeader>
                      <CardTitle className="text-sm">OS Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {statsQuery.data.by_os.length === 0 ? (
                        <p className="py-10 text-center text-sm text-[var(--sea-ink-soft)]">No data yet</p>
                      ) : (
                        <OsBreakdown data={statsQuery.data.by_os} />
                      )}
                    </CardContent>
                  </Card>

                  <Card className="island-shell">
                    <CardHeader>
                      <CardTitle className="text-sm">Browser Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {statsQuery.data.by_browser.length === 0 ? (
                        <p className="py-10 text-center text-sm text-[var(--sea-ink-soft)]">No data yet</p>
                      ) : (
                        <BrowserBreakdown data={statsQuery.data.by_browser} />
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </section>
        )}

        {/* Leaderboard */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-[var(--sea-ink)]">
            <BarChart2Icon className="size-5" />
            Leaderboard
          </h2>

          {/* Leaderboard filters */}
          <Card className="island-shell mb-4">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2 mb-3">
                <Input
                  placeholder="Filter by code or URL…"
                  value={lbSearch}
                  onChange={(e) => { setLbSearch(e.target.value); setLbPage(1) }}
                  className="flex-1 min-w-40"
                />
                {lbSearch && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setLbSearch(''); setLbPage(1) }}
                  >
                    Clear
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[var(--sea-ink-soft)]" htmlFor="lb-from">
                    From
                  </label>
                  <input
                    id="lb-from"
                    type="date"
                    value={lbFrom}
                    onChange={(e) => handleLbDateChange('from', e.target.value)}
                    className="rounded-md border border-[var(--line)] bg-[var(--chip-bg)] px-2 py-1 text-sm text-[var(--sea-ink)] focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[var(--sea-ink-soft)]" htmlFor="lb-to">
                    To
                  </label>
                  <input
                    id="lb-to"
                    type="date"
                    value={lbTo}
                    onChange={(e) => handleLbDateChange('to', e.target.value)}
                    className="rounded-md border border-[var(--line)] bg-[var(--chip-bg)] px-2 py-1 text-sm text-[var(--sea-ink)] focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[var(--sea-ink-soft)]" htmlFor="lb-sort">
                    Sort
                  </label>
                  <select
                    id="lb-sort"
                    value={lbSort}
                    onChange={(e) => handleLbSortChange(e.target.value)}
                    className="rounded-md border border-[var(--line)] bg-[var(--chip-bg)] px-2 py-1 text-sm text-[var(--sea-ink)] focus:outline-none"
                  >
                    {LB_SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[var(--sea-ink-soft)]" htmlFor="lb-order">
                    Order
                  </label>
                  <select
                    id="lb-order"
                    value={lbOrder}
                    onChange={(e) => handleLbOrderChange(e.target.value)}
                    className="rounded-md border border-[var(--line)] bg-[var(--chip-bg)] px-2 py-1 text-sm text-[var(--sea-ink)] focus:outline-none"
                  >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                  </select>
                </div>
                {(lbFrom || lbTo) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setLbFrom(''); setLbTo(''); setLbPage(1) }}
                  >
                    Clear dates
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results count */}
          {lbData && (
            <p className="mb-2 text-sm text-[var(--sea-ink-soft)]">
              {lbData.total === 0
                ? 'No results.'
                : `${lbData.total} result${lbData.total !== 1 ? 's' : ''}`}
            </p>
          )}

          {/* Leaderboard list */}
          <Card className="island-shell mb-4">
            <CardContent className="p-0">
              {leaderboardQuery.isPending && (
                <div className="flex flex-col gap-2 p-4">
                  {['a', 'b', 'c', 'd', 'e'].map((k) => (
                    <Skeleton key={k} className="h-10 w-full" />
                  ))}
                </div>
              )}
              {leaderboardQuery.isError && (
                <p className="p-6 text-center text-sm text-[var(--sea-ink-soft)]">
                  Failed to load leaderboard.
                </p>
              )}
              {lbData && lbData.items.length === 0 && (
                <p className="p-6 text-center text-sm text-[var(--sea-ink-soft)]">
                  {debouncedLbSearch ? `No results matching "${debouncedLbSearch}".` : 'No links have been clicked yet.'}
                </p>
              )}
              {lbData && lbData.items.length > 0 && (
                <ol className="divide-y divide-[var(--line)]">
                  {lbData.items.map((entry, i) => (
                    <li
                      key={entry.code}
                      className="flex items-center gap-4 px-4 py-3"
                    >
                      <span className="w-5 shrink-0 text-sm font-bold text-[var(--sea-ink-soft)]">
                        {(lbPage - 1) * 10 + i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          className="block truncate text-left font-mono text-sm text-[var(--lagoon-deep)] hover:underline"
                          onClick={() => {
                            setActiveCode(entry.code)
                            setCodeInput(entry.code)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                        >
                          /{entry.code}
                        </button>
                        {entry.original_url && (
                          <span
                            className="block truncate text-xs text-[var(--sea-ink-soft)]"
                            title={entry.original_url}
                          >
                            {entry.original_url}
                          </span>
                        )}
                      </div>
                      <Badge variant="secondary">{entry.click_count}</Badge>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          {/* Leaderboard pagination */}
          {lbData && lbData.total_pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={lbPage <= 1 || leaderboardQuery.isFetching}
                onClick={() => setLbPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-[var(--sea-ink-soft)]">
                Page {lbPage} of {lbTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={lbPage >= lbTotalPages || leaderboardQuery.isFetching}
                onClick={() => setLbPage((p) => Math.min(lbTotalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-3">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-16" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => `chart-${i}`).map((k) => (
          <Card key={k} className="island-shell">
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
