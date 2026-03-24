import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { z } from 'zod'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { useClipboard } from '#/hooks/useClipboard'
import { apiClient } from '#/api/client'
import type { ShortenResponse } from '#/types/index'
import { CheckIcon, CopyIcon, LinkIcon } from 'lucide-react'

export const Route = createFileRoute('/shortener')({ component: ShortenerPage })

const urlSchema = z.string().url('Please enter a valid URL (include https://).')

function ShortenerPage() {
  const [url, setUrl] = useState('')
  const [validationError, setValidationError] = useState('')
  const [result, setResult] = useState<ShortenResponse | null>(null)
  const { copied, copy } = useClipboard()

  const mutation = useMutation({
    mutationFn: (u: string) => apiClient.shorten(u),
    onSuccess: (data) => {
      setResult(data)
      setUrl('')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = urlSchema.safeParse(url.trim())
    if (!parsed.success) {
      setValidationError(parsed.error.errors[0]?.message ?? 'Invalid URL')
      return
    }
    setValidationError('')
    mutation.mutate(parsed.data)
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <div className="rise-in mx-auto max-w-xl">
        <p className="island-kicker mb-3">URL Shortener</p>
        <h1 className="display-title mb-6 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Shorten a link
        </h1>

        <Card className="island-shell">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LinkIcon className="size-4" />
              Enter a URL to shorten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://example.com/very/long/url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value)
                    setValidationError('')
                  }}
                  aria-invalid={!!validationError}
                  className="flex-1"
                />
                <Button type="submit" disabled={mutation.isPending || !url.trim()}>
                  {mutation.isPending ? 'Shortening…' : 'Shorten'}
                </Button>
              </div>
              {validationError && (
                <p className="text-sm text-destructive">{validationError}</p>
              )}
              {mutation.isError && (
                <p className="text-sm text-destructive">
                  {mutation.error instanceof Error
                    ? mutation.error.message
                    : 'Something went wrong. Please try again.'}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {result && (
          <Card className="island-shell rise-in mt-6 border-[var(--lagoon-deep)]/30">
            <CardHeader>
              <CardTitle className="text-base text-[var(--palm)]">
                Your short link is ready!
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5">
                <a
                  href={result.short_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 truncate font-mono text-sm font-semibold text-[var(--lagoon-deep)]"
                >
                  {result.short_url}
                </a>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => copy(result.short_url)}
                  title="Copy to clipboard"
                >
                  {copied ? <CheckIcon className="size-3.5 text-[var(--palm)]" /> : <CopyIcon className="size-3.5" />}
                </Button>
              </div>
              <p className="text-xs text-[var(--sea-ink-soft)]">
                Original: <span className="truncate">{result.original_url}</span>
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
