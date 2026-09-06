import { useState, useEffect, useRef } from "react"

const difficultyMap = { 1: "hard", 2: "hard", 3: "medium", 4: "easy" }
const ratingMap = { 1: "again", 2: "hard", 3: "good", 4: "easy" }
const SWIPE_THRESHOLD = 50

export default function FlashcardPlayer({ deck, onUpdate, resetKey }) {
  const [flipped, setFlipped] = useState(false)
  const [index, setIndex] = useState(0)
  const [frontier, setFrontier] = useState(0)
  const [sessionDone, setSessionDone] = useState([])
  const touchStartRef = useRef(null)

  // Reset session progress when the caller's filter selection changes (not on
  // every word-content update, since rating a card gives `deck` new array
  // references each time and would otherwise reset the session mid-review).
  useEffect(() => {
    setIndex(0)
    setFrontier(0)
    setFlipped(false)
    setSessionDone([])
  }, [resetKey])

  if (deck.length === 0) return <div className="empty-state">No words in this deck.</div>

  const atSummary = index >= deck.length
  const current = atSummary ? null : deck[index]
  const canGoBack = index > 0
  const canGoForward = index < frontier
  const isPeeking = !atSummary && index < frontier
  const progress = Math.round((sessionDone.length / Math.max(deck.length, 1)) * 100)

  const goBack = () => { setIndex(i => Math.max(0, i - 1)); setFlipped(false) }
  const goForward = () => { setIndex(i => Math.min(frontier, i + 1)); setFlipped(false) }

  const rate = (score) => {
    if (!current) return
    onUpdate(current.id, {
      srsScore: Math.min(5, (current.srsScore || 0) + (score >= 3 ? 1 : -1)),
      reviewCount: (current.reviewCount || 0) + 1,
      lastReviewed: Date.now(),
      difficulty: difficultyMap[score] || "medium",
      lastRating: ratingMap[score],
    })
    setSessionDone(prev => [...new Set([...prev, current.id])])
    setFlipped(false)
    const nextIndex = index + 1
    setFrontier(f => Math.max(f, nextIndex))
    setIndex(nextIndex)
  }

  const restart = () => { setIndex(0); setFrontier(0); setFlipped(false); setSessionDone([]) }

  const handleTouchStart = (e) => {
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY }
  }

  const handleTouchEnd = (e) => {
    const start = touchStartRef.current
    touchStartRef.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
      e.preventDefault()
      if (dx < 0) { if (canGoBack) goBack() }
      else if (canGoForward) goForward()
    }
  }

  return (
    <>
      {(canGoBack || canGoForward) && (
        <div className="fc-controls" style={{ marginBottom: "0.5rem" }}>
          <button className="page-btn" onClick={goBack} disabled={!canGoBack}>‹ Back</button>
          {isPeeking && <span className="fc-meta-line">Reviewing a previous card · swipe left/right or use the buttons</span>}
          {canGoForward && <button className="page-btn" onClick={goForward}>Forward ›</button>}
        </div>
      )}

      <div className="fc-meta">
        <span>{sessionDone.length} / {deck.length}</span>
        <span>{progress}% done</span>
      </div>
      <div className="prog-bar" style={{ marginBottom: "1rem" }}>
        <div className="prog-fill success" style={{ width: `${progress}%` }} />
      </div>

      {atSummary ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✓</div>
          <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Session complete!</div>
          <div style={{ color: "var(--text2)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>You reviewed {deck.length} cards.</div>
          <button className="btn btn-primary" onClick={restart}>Start again</button>
          <button className="btn" style={{ marginLeft: "0.5rem" }} onClick={goBack}>‹ Review last card</button>
        </div>
      ) : (
        <>
          <div
            className={`fc-card card ${flipped ? "flipped" : ""}`}
            onClick={() => setFlipped(f => !f)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="fc-level-row">
              {current.level.map(l => (
                <span key={l} className={`badge ${l === "A2" ? "badge-a2" : "badge-b1"}`}>{l}</span>
              ))}
              <span className="badge badge-type">{current.type}</span>
              <span className={`badge badge-diff diff-${current.difficulty}`}>{current.lastRating || current.difficulty}</span>
            </div>

            <div className="fc-front">
              <div className="fc-word-row">
                {current.article && (
                  <span className={`fc-article ${flipped ? "" : "fc-article-blank"}`}>
                    {flipped ? current.article : "___"}
                  </span>
                )}
                <span className="fc-word">{current.word}</span>
              </div>
              {current.plural && <div className="fc-meta-line">Plural: {current.plural}</div>}
            </div>

            {flipped && (
              <>
                <hr className="divider" />
                <div className="fc-back">
                  {current.meanings.map((m, i) => (
                    <div className="meaning-row" key={i}>
                      {current.meanings.length > 1 && <div className="meaning-num">{i + 1}</div>}
                      <div>
                        <div className="meaning-en">{m.english}</div>
                        <div className="meaning-bn">{m.bengali}</div>
                        <div className="meaning-ex">{m.example}</div>
                      </div>
                    </div>
                  ))}
                  {current.conjugation && (
                    <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--text2)" }}>
                      <span className={current.conjugation.auxiliary === "hat" ? "aux-hat" : "aux-ist"} style={{ fontWeight: 600 }}>{current.conjugation.auxiliary}</span> {current.conjugation.participle} · {current.conjugation.past}
                    </div>
                  )}
                </div>
              </>
            )}

            {!flipped && <div className="fc-hint">tap to reveal{canGoBack ? " · swipe left for previous" : ""}</div>}
          </div>

          {flipped && (
            <div className="fc-rating">
              <button className="fc-btn again" onClick={() => rate(1)}>Again<span>forgot</span></button>
              <button className="fc-btn hard" onClick={() => rate(2)}>Hard<span>struggled</span></button>
              <button className="fc-btn good" onClick={() => rate(3)}>Good<span>knew it</span></button>
              <button className="fc-btn easy" onClick={() => rate(4)}>Easy<span>instant</span></button>
            </div>
          )}
        </>
      )}
    </>
  )
}
