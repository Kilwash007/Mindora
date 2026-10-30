import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import Card from './Card.jsx'
import Button from './Button.jsx'
import { api } from '../data/api.js'
import { formatTime } from '../data/services.js'

const POLL_MS = 5000

// The triage chat between a patient and the clinician assigned to them.
// role is who is looking at it ('user' or 'professional'). When canSend is
// false the box is replaced by disabledReason. Polls every few seconds, the
// same way the therapy Messages page does.
export default function TriageChat({ triageId, role, canSend, disabledReason }) {
  const [messages, setMessages] = useState(null)
  const [error, setError] = useState(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)

  const load = useCallback(() => {
    api
      .getTriageMessages(triageId)
      .then((data) => {
        setMessages(data)
        setError(null)
      })
      .catch((err) => setError(err.message))
  }, [triageId])

  useEffect(() => {
    load()
    const interval = setInterval(load, POLL_MS)
    return () => clearInterval(interval)
  }, [load])

  // Scroll the chat itself (not the whole page) when a new message arrives.
  const count = messages?.length ?? 0
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [count])

  const handleSend = async (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setError(null)
    try {
      await api.sendTriageMessage(triageId, text)
      setDraft('')
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="px-4 py-3 border-b border-ink-100">
        <p className="font-semibold text-navy-800 text-sm">Triage chat</p>
      </div>

      <div ref={listRef} className="h-72 overflow-y-auto px-4 py-3 space-y-3">
        {messages === null && !error && (
          <div className="flex items-center gap-2 text-ink-400 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        )}
        {messages && messages.length === 0 && (
          <p className="text-sm text-ink-400">No messages yet.</p>
        )}
        {messages?.map((m) => {
          const mine = m.senderRole === role
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                  mine ? 'bg-navy-800 text-white rounded-br-sm' : 'bg-ink-100 text-navy-800 rounded-bl-sm'
                }`}
              >
                {m.content}
                <p className={`text-[10px] mt-1 ${mine ? 'text-navy-200' : 'text-ink-400'}`}>
                  {formatTime(m.createdAt)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {error && <p className="px-4 pb-2 text-xs text-red-600">{error}</p>}

      {canSend ? (
        <form onSubmit={handleSend} className="border-t border-ink-100 p-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message..."
            maxLength={2000}
            className="flex-1 min-w-0 rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none"
          />
          <Button type="submit" variant="accent" disabled={!draft.trim() || sending} aria-label="Send message">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      ) : (
        <p className="border-t border-ink-100 px-4 py-3 text-xs text-ink-500">{disabledReason}</p>
      )}
    </Card>
  )
}
