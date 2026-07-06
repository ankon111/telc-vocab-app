import { useState, useEffect, useCallback } from "react"
import VocabList from "./components/VocabList"
import Flashcard from "./components/Flashcard"
import Quiz from "./components/Quiz"
import Stats from "./components/Stats"
import "./App.css"

const STORAGE_KEY = "telc_vocab_progress"
const THEME_KEY = "telc_theme"

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveProgress(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch {}
}

const TAB_ICONS = {
  today: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  list: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/>
    </svg>
  ),
  flash: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="12" y1="5" x2="12" y2="19"/>
    </svg>
  ),
  quiz: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  ),
  stats: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
}

export default function App() {
  const [tab, setTab] = useState("today")
  const [allWords, setAllWords] = useState([])
  const [progress, setProgress] = useState(loadProgress)
  const [expandedCard, setExpandedCard] = useState(null)
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY)
      if (saved) return saved
    } catch {}
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  })

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    try { localStorage.setItem(THEME_KEY, theme) } catch {}
  }, [theme])

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark")

  useEffect(() => {
    // Auto-discover all A2_*.json and B1_*.json chunk files via Vite glob import.
    // Drop any new chunk file into src/data/ and it is picked up automatically.
    const a2Modules = import.meta.glob("./data/A2_*.json", { eager: true })
    const b1Modules = import.meta.glob("./data/B1_*.json", { eager: true })

    const a2Chunks = Object.values(a2Modules).flatMap(m => m.default)
    const b1Chunks = Object.values(b1Modules).flatMap(m => m.default)

    const merged = {}
    ;[...a2Chunks, ...b1Chunks].forEach(w => {
      if (merged[w.word]) {
        const existing = merged[w.word]
        const combined = [...new Set([...existing.level, ...w.level])]
        merged[w.word] = { ...existing, level: combined }
      } else {
        merged[w.word] = { ...w }
      }
    })
    const words = Object.values(merged).map(w => ({
      ...w,
      starred: progress[w.id]?.starred ?? false,
      srsScore: progress[w.id]?.srsScore ?? 0,
      reviewCount: progress[w.id]?.reviewCount ?? 0,
      lastReviewed: progress[w.id]?.lastReviewed ?? null,
      difficulty: progress[w.id]?.difficulty ?? "new",
    }))
    setAllWords(words)
  }, [])

  const updateProgress = useCallback((id, updates) => {
    setProgress(prev => {
      const next = { ...prev, [id]: { ...(prev[id] || {}), ...updates } }
      saveProgress(next)
      return next
    })
    setAllWords(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w))
  }, [])

  const getTodaysDeck = useCallback(() => {
    // Get date-based seed for consistent daily shuffle
    const today = new Date().toISOString().split('T')[0]
    const seed = parseInt(today.replace(/-/g, '')) % 1000
    
    const newWords = allWords.filter(w => w.difficulty === "new")
    const reviewWords = allWords.filter(w => w.difficulty !== "new")
    
    // Shuffle with date seed for consistency
    const seededRandom = (s) => {
      const x = Math.sin(s) * 10000
      return x - Math.floor(x)
    }
    
    const shuffle = (arr, s) => {
      const shuffled = [...arr]
      let rng = s
      for (let i = shuffled.length - 1; i > 0; i--) {
        rng = (rng * 9301 + 49297) % 233280
        const j = Math.floor((rng / 233280) * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    }
    
    const shuffledNew = shuffle(newWords, seed)
    const todaysNew = shuffledNew.slice(0, 10)
    
    // Weight review words by difficulty using weighted random selection (no duplicates)
    let rng = seed + 1
    const selected = new Set()
    const todaysReview = []
    const availableReview = [...reviewWords]
    
    while (todaysReview.length < 20 && availableReview.length > 0) {
      // Calculate total weight of available words
      const weights = availableReview.map(w => {
        const difficulty = w.difficulty
        return difficulty === "hard" ? 4 : difficulty === "medium" ? 2 : 1
      })
      const totalWeight = weights.reduce((a, b) => a + b, 0)
      
      // Seeded random selection
      rng = (rng * 9301 + 49297) % 233280
      let rand = (rng / 233280) * totalWeight
      
      // Pick weighted random word
      let idx = 0
      let cumWeight = 0
      for (let i = 0; i < availableReview.length; i++) {
        cumWeight += weights[i]
        if (rand < cumWeight) {
          idx = i
          break
        }
      }
      
      const word = availableReview[idx]
      if (!selected.has(word.id)) {
        selected.add(word.id)
        todaysReview.push(word)
      }
      availableReview.splice(idx, 1)
    }
    
    return [...todaysNew, ...todaysReview]
  }, [allWords])

  const todaysDeck = getTodaysDeck()

  const tabs = [
    { id: "today", label: "Today", icon: TAB_ICONS.today },
    { id: "list", label: "Vocab", icon: TAB_ICONS.list },
    { id: "flash", label: "Flash", icon: TAB_ICONS.flash },
    { id: "quiz", label: "Quiz", icon: TAB_ICONS.quiz },
    { id: "stats", label: "Stats", icon: TAB_ICONS.stats },
  ]

  const mastered = allWords.filter(w => (progress[w.id]?.srsScore ?? 0) >= 4).length
  const reviewed = allWords.filter(w => progress[w.id]?.reviewCount > 0).length

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="app-title">
            <span className="title-de">Deutsch</span>
            <span className="title-sub">Telc A2 · B1 Vocabulary</span>
          </div>
          <div className="header-stats">
            <span>{allWords.length} words</span>
            <span className="dot">·</span>
            <span>{mastered} mastered</span>
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </header>

      <nav className="app-nav">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`nav-btn ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-label">{t.label}</span>
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab === "today" && (
          <div className="today-screen">
            <div className="today-header">
              <h2>Today's Learning</h2>
              <p className="today-count">{todaysDeck.length} words • {todaysDeck.filter(w => w.difficulty === "new").length} new, {todaysDeck.filter(w => w.difficulty !== "new").length} review</p>
            </div>
            <div className="today-cards">
              {todaysDeck.map(w => (
                <div key={w.id} className={`today-card card diff-${w.difficulty}`} onClick={() => setExpandedCard(expandedCard === w.id ? null : w.id)}>
                  <div className="tc-header">
                    <div className="tc-badges">
                      <span className={`badge badge-${w.level.includes("A2") && !w.level.includes("B1") ? "a2" : w.level.includes("B1") && !w.level.includes("A2") ? "b1" : "both"}`}>
                        {w.level.join(" · ")}
                      </span>
                      <span className="badge badge-type">{w.type}</span>
                      <span className={`diff-badge diff-${w.difficulty}`}>{w.difficulty}</span>
                    </div>
                    <div className="tc-expand-hint">tap to expand</div>
                  </div>
                  <div className="tc-word">{w.article ? `${w.article} ` : ""}{w.word}</div>
                  <div className="tc-meaning">{w.meanings[0].english}</div>
                  
                  {expandedCard === w.id && (
                    <>
                      <hr className="divider" />
                      {w.plural && <div className="meta-pill">Plural: <strong>{w.plural}</strong></div>}
                      {w.synonym && <div className="meta-pill">Synonym: <strong>{w.synonym}</strong></div>}
                      
                      <div style={{ marginTop: "0.75rem" }}>
                        {w.meanings.map((m, i) => (
                          <div className="meaning-row" key={i}>
                            {w.meanings.length > 1 && <div className="meaning-num">{i + 1}</div>}
                            <div>
                              <div className="meaning-en">{m.english}</div>
                              <div className="meaning-bn">{m.bengali}</div>
                              <div className="meaning-ex">{m.example}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {w.type === "Verb" && w.conjugation && (
                        <div className="conj-section">
                          <hr className="divider" />
                          <div className="conj-label">Präsens</div>
                          {w.conjugation.full_present ? (
                            <>
                              <div className="conj-grid">
                                {Object.entries(w.conjugation.full_present).map(([pro, form]) => {
                                  const isIrregular = w.conjugation.irregular && (pro === "du" || pro === "er_sie")
                                  const label = { ich: "ich", du: "du", er_sie: "er/sie", wir: "wir", ihr: "ihr", sie: "sie/Sie" }[pro]
                                  return (
                                    <div className="conj-cell" key={pro}>
                                      <span className="conj-pro">{label}</span>
                                      <span className={`conj-form ${isIrregular ? "irregular" : ""}`}>{form}</span>
                                    </div>
                                  )
                                })}
                              </div>
                              {w.conjugation.irregular && w.conjugation.vowel_change && (
                                <div className="conj-warn">
                                  <i className="ti ti-alert-triangle" aria-hidden="true" style={{ fontSize: "13px" }} />
                                  Vowel change: {w.conjugation.vowel_change} (du and er/sie only)
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
                                <span className={w.conjugation.auxiliary === "hat" ? "aux-hat" : "aux-ist"}>
                                  {w.conjugation.auxiliary}
                                </span> {w.conjugation.participle}
                              </span>
                            </div>
                            <div className="conj-item">
                              <label>Präteritum</label>
                              <span>{w.conjugation.past}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "list" && <VocabList words={allWords} onUpdate={updateProgress} progress={progress} />}
        {tab === "flash" && <Flashcard words={todaysDeck} onUpdate={updateProgress} progress={progress} />}
        {tab === "quiz" && <Quiz words={todaysDeck} onUpdate={updateProgress} progress={progress} />}
        {tab === "stats" && <Stats words={allWords} progress={progress} reviewed={reviewed} mastered={mastered} />}
      </main>
    </div>
  )
}
