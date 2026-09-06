import { useState, useMemo, useEffect } from "react"

const PAGE_SIZE = 200
const VOCAB_SEED = 42

const TYPE_COLORS = {
  Nomen: "badge-type",
  Verb: "badge-type",
  Adjektiv: "badge-type",
  Adverb: "badge-type",
  Konjunktion: "badge-type",
  Präposition: "badge-type",
  Pronomen: "badge-type",
}

function speakGerman(text) {
  if (!("speechSynthesis" in window)) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = "de-DE"
  utter.rate = 0.9
  const voices = window.speechSynthesis.getVoices()
  const deVoice = voices.find(v => v.lang === "de-DE") || voices.find(v => v.lang?.startsWith("de"))
  if (deVoice) utter.voice = deVoice
  window.speechSynthesis.speak(utter)
}

function seededShuffle(arr, seed) {
  const shuffled = [...arr]
  let rng = seed
  for (let i = shuffled.length - 1; i > 0; i--) {
    rng = (rng * 9301 + 49297) % 233280
    const j = Math.floor((rng / 233280) * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function LevelBadge({ level }) {
  const hasA2 = level.includes("A2")
  const hasB1 = level.includes("B1")
  if (hasA2 && hasB1) return <span className="badge badge-both">A2 · B1</span>
  if (hasA2) return <span className="badge badge-a2">A2</span>
  return <span className="badge badge-b1">B1</span>
}

export function WordCard({ word, onUpdate }) {
  const [expanded, setExpanded] = useState(false)

  const toggleStar = (e) => {
    e.stopPropagation()
    onUpdate(word.id, { starred: !word.starred })
  }

  const speak = (e) => {
    e.stopPropagation()
    speakGerman(word.word)
  }

  const showConj = word.type === "Verb" && word.conjugation
  const showPrefix = word.prefix

  return (
    <div className="card vocab-card" onClick={() => setExpanded(e => !e)}>
      <div className="vc-header">
        <div className="vc-word-row">
          {word.article && <span className="vc-article">{word.article}</span>}
          <span className="vc-word">{word.word}</span>
          <span className="badge-type badge">{word.type}</span>
          <LevelBadge level={word.level} />
          {word.tags?.includes("core700") && <span className="badge badge-core700" title="Must-know high-frequency word">🎯</span>}
          <button className="speak-btn" onClick={speak} aria-label="pronounce" title="Hear pronunciation">
            🔊
          </button>
        </div>
        <button className={`star-btn ${word.starred ? "active" : ""}`} onClick={toggleStar} aria-label="star">
          {word.starred ? "★" : "☆"}
        </button>
      </div>

      <div className="vc-quick">
        <span className="meaning-en">{word.meanings[0].english}</span>
        <span className="meaning-bn"> · {word.meanings[0].bengali}</span>
      </div>

      {expanded && (
        <>
          <hr className="divider" />

          {word.plural && <div className="meta-pill">Plural: <strong>{word.plural}</strong></div>}
          {word.synonym && <div className="meta-pill">Synonym: <strong>{word.synonym}</strong></div>}

          <div style={{ marginTop: "0.75rem" }}>
            {word.meanings.map((m, i) => (
              <div className="meaning-row" key={i}>
                <div className="meaning-num">{i + 1}</div>
                <div>
                  <div className="meaning-en">{m.english}</div>
                  <div className="meaning-bn">{m.bengali}</div>
                  <div className="meaning-ex">{m.example}</div>
                </div>
              </div>
            ))}
          </div>

          {showConj && (
            <div className="conj-section">
              <hr className="divider" />
              <div className="conj-label">Präsens</div>
              {word.conjugation.full_present ? (
                <>
                  <div className="conj-grid">
                    {Object.entries(word.conjugation.full_present).map(([pro, form]) => {
                      const isIrregular = word.conjugation.irregular && (pro === "du" || pro === "er_sie")
                      const label = { ich: "ich", du: "du", er_sie: "er/sie", wir: "wir", ihr: "ihr", sie: "sie/Sie" }[pro]
                      return (
                        <div className="conj-cell" key={pro}>
                          <span className="conj-pro">{label}</span>
                          <span className={`conj-form ${isIrregular ? "irregular" : ""}`}>{form}</span>
                        </div>
                      )
                    })}
                  </div>
                  {word.conjugation.irregular && word.conjugation.vowel_change && (
                    <div className="conj-warn">
                      <i className="ti ti-alert-triangle" aria-hidden="true" style={{ fontSize: "13px" }} />
                      Vowel change: {word.conjugation.vowel_change} (du and er/sie only)
                    </div>
                  )}
                </>
              ) : null}
              <hr className="divider" />
              <div className="conj-label">Perfekt &amp; Präteritum</div>
              <div className="conj-row">
                <div className="conj-item">
                  <label>Perfekt</label>
                  <span>
                    <span className={word.conjugation.auxiliary === "hat" ? "aux-hat" : "aux-ist"}>
                      {word.conjugation.auxiliary}
                    </span> {word.conjugation.participle}
                  </span>
                </div>
                <div className="conj-item">
                  <label>Präteritum</label>
                  <span>{word.conjugation.past}</span>
                </div>
              </div>
            </div>
          )}

          {showPrefix && (
            <div className="prefix-tip">
              <strong>{word.prefix.prefix}</strong> prefix · {word.prefix.meaning}
              {word.prefix.related?.length > 0 && (
                <div className="related-chips">
                  {word.prefix.related.map(r => <span className="chip" key={r}>{r}</span>)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function VocabList({ words, onUpdate }) {
  const [search, setSearch] = useState("")
  const [levelFilter, setLevelFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [starredOnly, setStarredOnly] = useState(false)
  const [core700Only, setCore700Only] = useState(false)
  const [tagFilter, setTagFilter] = useState("all")
  const [shuffled, setShuffled] = useState(false)
  const [page, setPage] = useState(1)

  const types = useMemo(() => {
    const s = new Set(words.map(w => w.type))
    return ["all", ...Array.from(s).sort()]
  }, [words])

  // Tags come from the optional `tags` field (e.g. ["core700","tier1","connectors"]).
  // We surface everything except the "core700" marker itself, which has its own toggle.
  const tags = useMemo(() => {
    const s = new Set()
    words.forEach(w => (w.tags || []).forEach(t => { if (t !== "core700") s.add(t) }))
    return ["all", ...Array.from(s).sort()]
  }, [words])

  const filtered = useMemo(() => {
    let ws = words
    if (search) ws = ws.filter(w => w.word.toLowerCase().includes(search.toLowerCase()) || w.meanings.some(m => m.english.toLowerCase().includes(search.toLowerCase()) || m.bengali.includes(search)))
    if (levelFilter !== "all") ws = ws.filter(w => w.level.includes(levelFilter))
    if (typeFilter !== "all") ws = ws.filter(w => w.type === typeFilter)
    if (starredOnly) ws = ws.filter(w => w.starred)
    if (core700Only) ws = ws.filter(w => w.tags?.includes("core700"))
    if (tagFilter !== "all") ws = ws.filter(w => w.tags?.includes(tagFilter))
    if (shuffled) ws = seededShuffle(ws, VOCAB_SEED)
    return ws
  }, [words, search, levelFilter, typeFilter, starredOnly, core700Only, tagFilter, shuffled])

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1) }, [search, levelFilter, typeFilter, starredOnly, core700Only, tagFilter, shuffled])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      <div className="list-controls">
        <input
          className="search-input"
          placeholder="Search German, English, or বাংলা…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="filter-row">
          <div className="level-tabs">
            {["all", "A2", "B1"].map(l => (
              <button key={l} className={`level-tab ${levelFilter === l ? "active" : ""}`} onClick={() => setLevelFilter(l)}>
                {l === "all" ? "All" : l}
              </button>
            ))}
            <button className={`level-tab ${starredOnly ? "active starred" : ""}`} onClick={() => setStarredOnly(s => !s)}>
              ★ Starred
            </button>
            <button className={`level-tab ${core700Only ? "active" : ""}`} onClick={() => setCore700Only(c => !c)} title="Must-know high-frequency B1 words">
              🎯 Core 700
            </button>
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <select className="type-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              {types.map(t => <option key={t} value={t}>{t === "all" ? "All types" : t}</option>)}
            </select>
            {tags.length > 1 && (
              <select className="type-select" value={tagFilter} onChange={e => setTagFilter(e.target.value)}>
                {tags.map(t => <option key={t} value={t}>{t === "all" ? "All tags" : t}</option>)}
              </select>
            )}
            <button className="btn" onClick={() => setShuffled(s => !s)} title="Shuffle" style={{ fontSize: '1.1rem' }}>
              🔀
            </button>
          </div>
        </div>
      </div>

      <div className="list-count">{filtered.length} words{totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}</div>

      <div className="word-list">
        {paginated.map(w => <WordCard key={w.id} word={w} onUpdate={onUpdate} />)}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">No words found. Try a different search or filter.</div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
          <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</button>
          <span className="page-info">{page} / {totalPages}</span>
          <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next ›</button>
          <button className="page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
        </div>
      )}
    </div>
  )
}
