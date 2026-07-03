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

export default function App() {
  const [tab, setTab] = useState("list")
  const [allWords, setAllWords] = useState([])
  const [progress, setProgress] = useState(loadProgress)
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

  const tabs = [
    { id: "list", label: "Vocab list", icon: "ti-list" },
    { id: "flash", label: "Flashcards", icon: "ti-cards" },
    { id: "quiz", label: "Quiz", icon: "ti-help" },
    { id: "stats", label: "Stats", icon: "ti-chart-bar" },
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
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              <i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"}`} aria-hidden="true" />
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
            <i className={`ti ${t.icon}`} aria-hidden="true" />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab === "list" && <VocabList words={allWords} onUpdate={updateProgress} progress={progress} />}
        {tab === "flash" && <Flashcard words={allWords} onUpdate={updateProgress} progress={progress} />}
        {tab === "quiz" && <Quiz words={allWords} onUpdate={updateProgress} progress={progress} />}
        {tab === "stats" && <Stats words={allWords} progress={progress} reviewed={reviewed} mastered={mastered} />}
      </main>
    </div>
  )
}
