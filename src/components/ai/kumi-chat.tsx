'use client'

/**
 * Kumi — KumBola's AI guide.
 *
 * Floating chat widget (trigger + panel) that talks to `POST /api/ai/chat`:
 *   Request : { messages: { role: 'user' | 'assistant'; content: string }[], context: { view } }
 *   Response: { reply: string } on 200, { error: string } on 4xx/5xx.
 *
 * History is persisted to localStorage ('kumi-chat-history'), capped at 40 messages.
 * System-role messages are transient UI (errors/retry) and are never sent or stored.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Components } from 'react-markdown'
import Markdown from 'react-markdown'
import { SendHorizontal, Sparkles, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { LogoMark } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSession } from '@/lib/store'
import { cn } from '@/lib/utils'

type ApiRole = 'user' | 'assistant'
type ChatRole = ApiRole | 'system'

interface ChatMessage {
  role: ChatRole
  content: string
}

interface KumiChatPayloadMessage {
  role: ApiRole
  content: string
}

const CHAT_ENDPOINT = '/api/ai/chat'
const STORAGE_KEY = 'kumi-chat-history'
const MAX_STORED_MESSAGES = 40
const MAX_CONTEXT_MESSAGES = 12
const SERVER_UNREACHABLE = "Kumi couldn't reach the server — try again."

/** Thrown when the API answered (non-OK status or malformed body). */
class KumiApiError extends Error {}

const SUGGESTIONS: readonly string[] = [
  'How do I book a pickup?',
  'What does a plan cost?',
  'How do drivers get paid?',
  'What is proof of disposal?',
  'Which areas do you serve?',
]

function greeting(authed: boolean): ChatMessage {
  const intro = authed
    ? "Welcome back! I'm **Kumi**, your KumBola guide. 🌿"
    : "Hi there! I'm **Kumi**, your KumBola guide. 🌿"
  const outro = authed
    ? 'What would you like to know?'
    : 'Sign in to book — but feel free to ask me anything. What\u2019s on your mind?'
  return {
    role: 'assistant',
    content: `${intro}

I can help you with:
- **Booking pickups** — schedule a waste collection in a few taps
- **Plans & pricing** — compare pay-per-bag and monthly plans
- **Driver earnings** — how trip pay and payouts work
- **Proof of disposal** — verified dumping records for every load

${outro}`,
  }
}

/* ------------------------------------------------------------------ */
/* Storage helpers                                                     */
/* ------------------------------------------------------------------ */

function loadStoredMessages(): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const cleaned: ChatMessage[] = []
    for (const entry of parsed.slice(-MAX_STORED_MESSAGES)) {
      if (!entry || typeof entry !== 'object') continue
      const { role, content } = entry as Record<string, unknown>
      if ((role === 'user' || role === 'assistant') && typeof content === 'string' && content.trim()) {
        cleaned.push({ role, content })
      }
    }
    return cleaned
  } catch {
    return []
  }
}

function persistMessages(messages: ChatMessage[]): void {
  if (typeof window === 'undefined') return
  try {
    const storable = messages.filter((m) => m.role !== 'system').slice(-MAX_STORED_MESSAGES)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storable))
  } catch {
    // Private browsing / quota exceeded — chat simply won't persist.
  }
}

/** Safely read a non-empty string field off an unknown JSON body. */
function readStringField(data: unknown, field: string): string | null {
  if (!data || typeof data !== 'object' || !(field in data)) return null
  const value = (data as Record<string, unknown>)[field]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/* ------------------------------------------------------------------ */
/* Markdown rendering (bold, bullets, line breaks — styled manually)   */
/* ------------------------------------------------------------------ */

const markdownComponents: Components = {
  p: ({ children }) => <p className="m-0">{children}</p>,
  ul: ({ children }) => <ul className="ml-4 list-disc space-y-1 marker:text-primary/60">{children}</ul>,
  ol: ({ children }) => <ol className="ml-4 list-decimal space-y-1 marker:text-primary/60">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-2">
      {children}
    </a>
  ),
  blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/40 pl-2 italic">{children}</blockquote>,
  pre: ({ children }) => <pre className="overflow-x-auto rounded-lg bg-foreground/5 p-2 text-xs">{children}</pre>,
  code: ({ children }) => <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.8em]">{children}</code>,
}

/* ------------------------------------------------------------------ */
/* Widget                                                              */
/* ------------------------------------------------------------------ */

export function KumiChat({ authed }: { authed: boolean }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(() => [greeting(authed)])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const stickToBottomRef = useRef(true)
  const messagesRef = useRef<ChatMessage[]>(messages)
  messagesRef.current = messages

  /* --- load persisted history once (authed known server- & client-side) --- */
  useEffect(() => {
    const stored = loadStoredMessages()
    if (stored.length > 1) {
      setMessages(stored)
    } else {
      // No history (or a stale greeting-only store) — seed one matching the current auth state.
      const fresh = [greeting(authed)]
      setMessages(fresh)
      persistMessages(fresh)
    }
    // Mount only — authed comes from the server-rendered page and never changes identity here.
  }, [])

  /* --- persist user/assistant messages (system bubbles stay transient) --- */
  useEffect(() => {
    persistMessages(messages)
  }, [messages])

  /* --- auto-scroll to the newest message while pinned to the bottom --- */
  useEffect(() => {
    if (!open || !stickToBottomRef.current) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [open, messages, busy])

  /* --- focus input on open; Escape closes and returns focus to trigger --- */
  useEffect(() => {
    if (!open) return
    stickToBottomRef.current = true
    const raf = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(raf)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  /* --- abort in-flight request on unmount --- */
  useEffect(() => () => abortRef.current?.abort(), [])

  const closePanel = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  const togglePanel = useCallback(() => {
    if (open) closePanel()
    else setOpen(true)
  }, [open, closePanel])

  /* --- API call; appends the reply or a transient system error bubble --- */
  const requestReply = useCallback(async (history: ChatMessage[]) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    stickToBottomRef.current = true
    setBusy(true)

    const payloadMessages: KumiChatPayloadMessage[] = history
      .filter((m): m is ChatMessage & { role: ApiRole } => m.role !== 'system')
      .slice(-MAX_CONTEXT_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          context: { view: useSession.getState().view },
        }),
        signal: controller.signal,
      })

      const data: unknown = await res.json().catch(() => null)

      if (!res.ok) {
        throw new KumiApiError(readStringField(data, 'error') ?? `Something went wrong (HTTP ${res.status}).`)
      }

      const reply = readStringField(data, 'reply')
      if (!reply) throw new KumiApiError('Kumi sent an empty response — please try again.')

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      if (controller.signal.aborted) return
      const message = err instanceof KumiApiError ? err.message : SERVER_UNREACHABLE
      setMessages((prev) => [...prev, { role: 'system', content: message }])
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setBusy(false)
      }
    }
  }, [])

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || busy) return
      const next: ChatMessage[] = [...messagesRef.current, { role: 'user', content: trimmed }]
      setMessages(next)
      setInput('')
      void requestReply(next)
    },
    [busy, requestReply]
  )

  /** Re-run the request for the last user message without duplicating it. */
  const retryLast = useCallback(() => {
    if (busy) return
    const history = [...messagesRef.current]
    while (history.length > 0 && history[history.length - 1].role === 'system') history.pop()
    const last = history[history.length - 1]
    if (!last || last.role !== 'user') return
    setMessages(history)
    stickToBottomRef.current = true
    void requestReply(history)
  }, [busy, requestReply])

  const clearConversation = useCallback(() => {
    const controller = abortRef.current
    abortRef.current = null
    controller?.abort()
    setBusy(false)
    const fresh = [greeting(authed)]
    setMessages(fresh)
    persistMessages(fresh)
    stickToBottomRef.current = true
    toast('Conversation cleared')
  }, [authed])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  return (
    <>
      {/* Floating trigger + desktop label pill */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 sm:bottom-6 sm:right-6">
        {!open && (
          <span className="hidden animate-in fade-in slide-in-from-right-2 rounded-full border bg-card/95 px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur sm:block">
            Kumi
          </span>
        )}
        <button
          ref={triggerRef}
          type="button"
          onClick={togglePanel}
          aria-label={open ? 'Close Kumi chat' : 'Chat with Kumi'}
          aria-expanded={open}
          className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg outline-none transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {open ? <X className="size-6" /> : <Sparkles className="size-6" />}
        </button>
      </div>

      {/* Chat panel (plain positioned div so it floats over everything) */}
      {open && (
        <div
          role="dialog"
          aria-label="Kumi chat"
          className={cn(
            'fixed inset-x-3 bottom-3 z-50 flex h-[min(70vh,560px)] max-h-[70vh] animate-in fade-in slide-in-from-bottom-2 flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl duration-200',
            'sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[560px] sm:w-[380px]'
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b bg-background/60 px-4 py-3 backdrop-blur">
            <LogoMark className="size-8 shrink-0" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold">
                Kumi <span className="font-normal text-muted-foreground">— your KumBola guide</span>
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-green-600" />
                </span>
                Online
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              onClick={clearConversation}
              aria-label="Clear conversation"
            >
              <Trash2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              onClick={closePanel}
              aria-label="Close chat"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            aria-live="polite"
            aria-label="Chat messages"
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4 [scrollbar-width:thin]"
          >
            {messages.map((m, i) => {
              if (m.role === 'system') {
                const signInHint = /sign[\s-]?in|log[\s-]?in|authenticat/i.test(m.content)
                return (
                  <div
                    key={`system-${i}`}
                    className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive"
                  >
                    <p>{m.content}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={retryLast}
                        className="rounded-full border border-destructive/40 px-2.5 py-0.5 font-medium transition-colors hover:bg-destructive/20"
                      >
                        Retry
                      </button>
                      {signInHint && (
                        <span className="rounded-full border border-gold/50 bg-gold/15 px-2.5 py-0.5 font-medium text-gold-foreground">
                          Sign in to continue — use the Sign in button in the top bar.
                        </span>
                      )}
                    </div>
                  </div>
                )
              }
              if (m.role === 'user') {
                return (
                  <div key={`user-${i}`} className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm leading-relaxed text-primary-foreground">
                      {m.content}
                    </div>
                  </div>
                )
              }
              return (
                <div key={`assistant-${i}`} className="flex items-start gap-2">
                  <LogoMark className="mt-0.5 size-6 shrink-0" />
                  <div className="max-w-[85%] space-y-1.5 rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
                    <Markdown components={markdownComponents}>{m.content}</Markdown>
                  </div>
                </div>
              )
            })}

            {/* Typing indicator */}
            {busy && (
              <div className="flex items-start gap-2" role="status" aria-label="Kumi is typing">
                <LogoMark className="mt-0.5 size-6 shrink-0" />
                <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-300ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-150ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer: suggestion chips + input + disclaimer */}
          <div className="border-t">
            {messages.length <= 1 && !busy && (
              <div className="px-3 pt-2.5">
                <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="shrink-0 whitespace-nowrap rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 shadow-xs transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form
              className="flex items-center gap-2 p-3"
              onSubmit={(e) => {
                e.preventDefault()
                send(input)
              }}
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    send(input)
                  }
                }}
                placeholder="Ask Kumi anything…"
                aria-label="Message Kumi"
                autoComplete="off"
                maxLength={1000}
                disabled={busy}
                className="h-10 flex-1 rounded-full bg-background"
              />
              <Button
                type="submit"
                size="icon"
                disabled={busy || !input.trim()}
                aria-label="Send message"
                className="size-10 shrink-0 rounded-full"
              >
                <SendHorizontal className="size-4" />
              </Button>
            </form>

            <p className="-mt-1.5 px-3 pb-2.5 text-center text-[11px] leading-snug text-muted-foreground">
              Kumi is an AI guide — for urgent issues call +233 55 000 0000
            </p>
          </div>
        </div>
      )}
    </>
  )
}
