import { useState, useMemo, useCallback, useEffect } from "react"

const SRS_INTERVALS = { 1: 0, 2: 1, 3: 3, 4: 10 }
const BATCH_KEY = "telc_flashcard_batch"

function loadBatchState() {
  try {
    const raw = localStorage.getItem(BATCH_KEY)
    return raw ? JSON.parse(raw) : { batchMode: false, batchSize: 30, batchNum: 1 }
  } catch { return { batchMode: false, batchSize: 30, batchNum: 1 } }
}

export default function Flashcard({ words, todaysDeck, onUpdate }) {
  const [levelFilter, setLevelFilter] = useState("all")
  const [deckType, setDeckType] = useState("all")
  const [core700Only, setCore700Only] = useState(false)
  const [tagFilter, setTagFilter] = useState("all")
  const [flipped, setFlipped] = useState(false)
  const [index, setIndex] = useState(0)
  const [sessionDone, setSessionDone] = useState([])

  const initialBatch = useMemo(loadBatchState, [])
  const [batchMode, setBatchMode] = useState(initialBatch.batchMode)
  const [batchSize, setBatchSize] = useState(initialBatch.batchSize)
  const [batchNum, setBatchNum] = useState(initialBatch.batchNum)

  useEffect(() => {
    try { localStorage.setItem(BATCH_KEY, JSON.stringify({ batchMode, batchSize, batchNum })) } catch {}
  }, [batchMode, batchSize, batchNum])

  // Tags come from the optional `tags` field (e.g. ["core700","tier1","connectors"]).
  const tags = useMemo(() => {
    const s = new Set()
    words.forEach(w => (w.tags || []).forEach(t => { if (t !== "core700") s.add(t) }))
    return ["all", ...Array.from(s).sort()]
  }, [words])

  const baseDeck = useMemo(() => {
    let ws = deckType === "today" ? todaysDeck : words
    if (levelFilter !== "all") ws = ws.filter(w => w.level.includes(levelFilter))
    if (deckType === "starred") ws = ws.filter(w => w.starred)
    if (deckType === "new") ws = ws.filter(w => !w.reviewCount || w.reviewCount === 0)
    if (core700Only) ws = ws.filter(w => w.tags?.includes("core700"))
    if (tagFilter !== "all") ws = ws.filter(w => w.tags?.includes(tagFilter))
    return ws.length ? ws : words
  }, [words, todaysDeck, levelFilter, deckType, core700Only, tagFilter])

  const totalBatches = Math.max(1, Math.ceil(baseDeck.length / batchSize))

  // Keep batchNum in range whenever the base deck or batch size changes.
  useEffect(() => {
    setBatchNum(n => Math.min(Math.max(1, n), totalBatches))
  }, [totalBatches])

  const deck = useMemo(() => {
    if (!batchMode) return baseDeck
    const start = (batchNum - 1) * batchSize
    const slice = baseDeck.slice(start, start + batchSize)
    return slice.length ? slice : baseDeck
  }, [baseDeck, batchMode, batchNum, batchSize])

  // Reset session progress when filters/batch selection change (not on every
  // word-content update, since rating a card gives `words` a new array
  // reference each time and would otherwise reset the session mid-review).
  useEffect(() => {
    setIndex(0)
    setFlipped(false)
    setSessionDone([])
  }, [levelFilter, deckType, core700Only, tagFilter, batchMode, batchNum, batchSize])

  const current = deck[index % deck.length]
  const progress = Math.round((sessionDone.length / Math.max(deck.length, 1)) * 100)

  const rate = useCallback((score) => {
    if (!current) return
    const difficultyMap = { 1: "hard", 2: "hard", 3: "medium", 4: "easy" }
    onUpdate(current.id, {
      srsScore: Math.min(5, (current.srsScore || 0) + (score >= 3 ? 1 : -1)),
      reviewCount: (current.reviewCount || 0) + 1,
      lastReviewed: Date.now(),
      difficulty: difficultyMap[score] || "medium",
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
            <button key={l} className={`level-tab ${levelFilter === l ? "active" : ""}`} onClick={() => setLevelFilter(l)}>
              {l === "all" ? "All" : l}
            </button>
          ))}
          <button className={`level-tab ${core700Only ? "active" : ""}`} onClick={() => setCore700Only(c => !c)} title="Must-know high-frequency B1 words">
            🎯 Core 700
          </button>
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {tags.length > 1 && (
            <select className="type-select" value={tagFilter} onChange={e => setTagFilter(e.target.value)}>
              {tags.map(t => <option key={t} value={t}>{t === "all" ? "All tags" : t}</option>)}
            </select>
          )}
          <select className="type-select" value={deckType} onChange={e => setDeckType(e.target.value)}>
            <option value="all">All cards</option>
            <option value="today">Today</option>
            <option value="new">New only</option>
            <option value="starred">Starred</option>
          </select>
        </div>
      </div>

      <div className="fc-controls">
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--text2)" }}>
          <input type="checkbox" checked={batchMode} onChange={e => setBatchMode(e.target.checked)} />
          Revise in batches
        </label>
        {batchMode && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <input
              type="number"
              className="type-select"
              style={{ width: "60px" }}
              min={1}
              value={batchSize}
              onChange={e => setBatchSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
              title="Words per batch"
            />
            <button className="page-btn" onClick={() => setBatchNum(n => Math.max(1, n - 1))} disabled={batchNum <= 1}>‹</button>
            <span className="page-info">
              Batch {batchNum} of {totalBatches} · words {(batchNum - 1) * batchSize + 1}–{Math.min(batchNum * batchSize, baseDeck.length)} of {baseDeck.length}
            </span>
            <button className="page-btn" onClick={() => setBatchNum(n => Math.min(totalBatches, n + 1))} disabled={batchNum >= totalBatches}>›</button>
          </div>
        )}
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
              <span className={`badge badge-diff diff-${current.difficulty}`}>{current.difficulty}</span>
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
