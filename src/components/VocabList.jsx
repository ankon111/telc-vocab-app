import { useState, useMemo } from "react"

const TYPE_COLORS = {
  Nomen: "badge-type",
  Verb: "badge-type",
  Adjektiv: "badge-type",
  Adverb: "badge-type",
  Konjunktion: "badge-type",
  Präposition: "badge-type",
  Pronomen: "badge-type",
}

function LevelBadge({ level }) {
  const hasA2 = level.includes("A2")
  const hasB1 = level.includes("B1")
  if (hasA2 && hasB1) return <span className="badge badge-both">A2 · B1</span>
  if (hasA2) return <span className="badge badge-a2">A2</span>
  return <span className="badge badge-b1">B1</span>
}

function WordCard({ word, onUpdate }) {
  const [expanded, setExpanded] = useState(false)

  const toggleStar = (e) => {
    e.stopPropagation()
    onUpdate(word.id, { starred: !word.starred })
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
  const [shuffled, setShuffled] = useState(false)

  const types = useMemo(() => {
    const s = new Set(words.map(w => w.type))
    return ["all", ...Array.from(s).sort()]
  }, [words])

  const filtered = useMemo(() => {
    let ws = words
    if (search) ws = ws.filter(w => w.word.toLowerCase().includes(search.toLowerCase()) || w.meanings.some(m => m.english.toLowerCase().includes(search.toLowerCase()) || m.bengali.includes(search)))
    if (levelFilter !== "all") ws = ws.filter(w => w.level.includes(levelFilter))
    if (typeFilter !== "all") ws = ws.filter(w => w.type === typeFilter)
    if (starredOnly) ws = ws.filter(w => w.starred)
    if (shuffled) ws = [...ws].sort(() => Math.random() - 0.5)
    return ws
  }, [words, search, levelFilter, typeFilter, starredOnly, shuffled])

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
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <select className="type-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              {types.map(t => <option key={t} value={t}>{t === "all" ? "All types" : t}</option>)}
            </select>
            <button className="btn" onClick={() => setShuffled(s => !s)} title="Shuffle">
              <i className="ti ti-shuffle" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="list-count">{filtered.length} words</div>

      <div className="word-list">
        {filtered.map(w => <WordCard key={w.id} word={w} onUpdate={onUpdate} />)}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">No words found. Try a different search or filter.</div>
      )}
    </div>
  )
}
