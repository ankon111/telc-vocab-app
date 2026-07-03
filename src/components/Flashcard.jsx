import { useState, useMemo, useCallback } from "react"

const SRS_INTERVALS = { 1: 0, 2: 1, 3: 3, 4: 10 }

export default function Flashcard({ words, onUpdate }) {
  const [levelFilter, setLevelFilter] = useState("all")
  const [deckType, setDeckType] = useState("all")
  const [flipped, setFlipped] = useState(false)
  const [index, setIndex] = useState(0)
  const [sessionDone, setSessionDone] = useState([])

  const deck = useMemo(() => {
    let ws = words
    if (levelFilter !== "all") ws = ws.filter(w => w.level.includes(levelFilter))
    if (deckType === "starred") ws = ws.filter(w => w.starred)
    if (deckType === "new") ws = ws.filter(w => !w.reviewCount || w.reviewCount === 0)
    return ws.length ? ws : words
  }, [words, levelFilter, deckType])

  const current = deck[index % deck.length]
  const progress = Math.round((sessionDone.length / Math.max(deck.length, 1)) * 100)

  const rate = useCallback((score) => {
    if (!current) return
    onUpdate(current.id, {
      srsScore: Math.min(5, (current.srsScore || 0) + (score >= 3 ? 1 : -1)),
      reviewCount: (current.reviewCount || 0) + 1,
      lastReviewed: Date.now(),
    })
    setSessionDone(prev => [...new Set([...prev, current.id])])
    setFlipped(false)
    setIndex(i => i + 1)
  }, [current, onUpdate])

  const restart = () => { setIndex(0); setFlipped(false); setSessionDone([]) }

  if (!current) return <div className="empty-state">No words in this deck.</div>

  const done = sessionDone.length >= deck.length

  return (
    <div className="flashcard-screen">
      <div className="fc-controls">
        <div className="level-tabs">
          {["all","A2","B1"].map(l => (
            <button key={l} className={`level-tab ${levelFilter === l ? "active" : ""}`} onClick={() => { setLevelFilter(l); setIndex(0); setFlipped(false); setSessionDone([]); }}>
              {l === "all" ? "All" : l}
            </button>
          ))}
        </div>
        <select className="type-select" value={deckType} onChange={e => { setDeckType(e.target.value); setIndex(0); setFlipped(false); setSessionDone([]); }}>
          <option value="all">All cards</option>
          <option value="new">New only</option>
          <option value="starred">Starred</option>
        </select>
      </div>

      <div className="fc-meta">
        <span>{sessionDone.length} / {deck.length}</span>
        <span>{progress}% done</span>
      </div>
      <div className="prog-bar" style={{ marginBottom: "1rem" }}>
        <div className="prog-fill success" style={{ width: `${progress}%` }} />
      </div>

      {done ? (
        <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✓</div>
          <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Session complete!</div>
          <div style={{ color: "var(--text2)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>You reviewed {deck.length} cards.</div>
          <button className="btn btn-primary" onClick={restart}>Start again</button>
        </div>
      ) : (
        <>
          <div className={`fc-card card ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(f => !f)}>
            <div className="fc-level-row">
              {current.level.map(l => (
                <span key={l} className={`badge ${l === "A2" ? "badge-a2" : "badge-b1"}`}>{l}</span>
              ))}
              <span className="badge badge-type">{current.type}</span>
            </div>

            <div className="fc-front">
              {current.article && <span className="fc-article">{current.article} </span>}
              <span className="fc-word">{current.word}</span>
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

            {!flipped && <div className="fc-hint">tap to reveal</div>}
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
    </div>
  )
}
