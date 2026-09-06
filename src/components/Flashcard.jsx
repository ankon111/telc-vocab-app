import { useState, useMemo, useEffect } from "react"
import FlashcardPlayer from "./FlashcardPlayer"

const BATCH_KEY = "telc_flashcard_batch"

function loadBatchState() {
  try {
    const raw = localStorage.getItem(BATCH_KEY)
    return raw ? JSON.parse(raw) : { batchMode: true, batchSize: 30, batchNum: 1 }
  } catch { return { batchMode: true, batchSize: 30, batchNum: 1 } }
}

export default function Flashcard({ words, todaysDeck, onUpdate }) {
  const [levelFilter, setLevelFilter] = useState("all")
  const [deckType, setDeckType] = useState("all")
  const [core700Only, setCore700Only] = useState(true)
  const [tagFilter, setTagFilter] = useState("all")

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

  const resetKey = [levelFilter, deckType, core700Only, tagFilter, batchMode, batchNum, batchSize].join("|")

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

      <FlashcardPlayer deck={deck} onUpdate={onUpdate} resetKey={resetKey} />
    </div>
  )
}
