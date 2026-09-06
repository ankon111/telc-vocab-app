import { useState, useMemo } from "react"
import { WordCard } from "./VocabList"
import FlashcardPlayer from "./FlashcardPlayer"

const BUCKETS = [
  { id: "again", label: "Again" },
  { id: "hard", label: "Hard" },
  { id: "good", label: "Good" },
  { id: "easy", label: "Easy" },
]

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function matchesDateFilter(lastReviewed, dateFilter) {
  if (dateFilter === "all") return true
  if (!lastReviewed) return false
  const today = startOfDay(Date.now())
  const day = 24 * 60 * 60 * 1000
  if (dateFilter === "today") return lastReviewed >= today
  if (dateFilter === "yesterday") return lastReviewed >= today - day && lastReviewed < today
  if (dateFilter === "7days") return lastReviewed >= today - 6 * day
  return true
}

export default function Revise({ words, onUpdate }) {
  const [bucket, setBucket] = useState("again")
  const [dateFilter, setDateFilter] = useState("all")
  const [session, setSession] = useState(null)

  const filteredWords = useMemo(() => {
    return words.filter(w => w.lastRating === bucket && matchesDateFilter(w.lastReviewed, dateFilter))
  }, [words, bucket, dateFilter])

  const sessionDeck = useMemo(() => {
    if (!session) return []
    return words.filter(w => session.includes(w.id))
  }, [words, session])

  if (session) {
    return (
      <div>
        <div className="fc-controls">
          <button className="btn" onClick={() => setSession(null)}>‹ Back to list</button>
          <span style={{ fontSize: "0.85rem", color: "var(--text2)" }}>
            {BUCKETS.find(b => b.id === bucket)?.label} words
          </span>
        </div>
        <FlashcardPlayer deck={sessionDeck} onUpdate={onUpdate} resetKey={session.join(",")} />
      </div>
    )
  }

  return (
    <div>
      <div className="list-controls">
        <div className="filter-row">
          <div className="level-tabs">
            {BUCKETS.map(b => (
              <button key={b.id} className={`level-tab ${bucket === b.id ? "active" : ""}`} onClick={() => setBucket(b.id)}>
                {b.label}
              </button>
            ))}
          </div>
          <select className="type-select" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7days">Last 7 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      <div className="list-count">{filteredWords.length} words</div>

      {filteredWords.length > 0 && (
        <button className="btn btn-primary" style={{ marginBottom: "1rem" }} onClick={() => setSession(filteredWords.map(w => w.id))}>
          Start Flashcard session ({filteredWords.length})
        </button>
      )}

      <div className="word-list">
        {filteredWords.map(w => <WordCard key={w.id} word={w} onUpdate={onUpdate} />)}
      </div>

      {filteredWords.length === 0 && (
        <div className="empty-state">No words in this bucket for the selected period.</div>
      )}
    </div>
  )
}
