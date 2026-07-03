import { useState, useMemo, useCallback } from "react"

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

function getOptions(current, allWords) {
  const wrong = shuffle(allWords.filter(w => w.id !== current.id)).slice(0, 3)
  return shuffle([current, ...wrong])
}

export default function Quiz({ words, onUpdate }) {
  const [levelFilter, setLevelFilter] = useState("all")
  const [quizType, setQuizType] = useState("de-en")
  const [score, setScore] = useState({ correct: 0, wrong: 0 })
  const [answered, setAnswered] = useState(null)
  const [history, setHistory] = useState([])
  const [qIndex, setQIndex] = useState(0)

  const pool = useMemo(() => {
    let ws = words
    if (levelFilter !== "all") ws = ws.filter(w => w.level.includes(levelFilter))
    return shuffle(ws)
  }, [words, levelFilter, qIndex])

  const current = pool[qIndex % pool.length]
  const options = useMemo(() => current ? getOptions(current, words) : [], [current, words])

  const answer = useCallback((opt) => {
    if (answered !== null) return
    const correct = opt.id === current.id
    setAnswered(opt.id)
    setScore(s => correct ? { ...s, correct: s.correct + 1 } : { ...s, wrong: s.wrong + 1 })
    setHistory(h => [...h, { word: current.word, correct }])
    onUpdate(current.id, {
      reviewCount: (current.reviewCount || 0) + 1,
      srsScore: Math.min(5, (current.srsScore || 0) + (correct ? 1 : -1)),
      lastReviewed: Date.now(),
    })
  }, [answered, current, onUpdate])

  const next = () => { setAnswered(null); setQIndex(i => i + 1) }

  const restart = () => { setScore({ correct: 0, wrong: 0 }); setHistory([]); setAnswered(null); setQIndex(i => i + 1) }

  const total = score.correct + score.wrong
  const accuracy = total ? Math.round((score.correct / total) * 100) : 0

  if (!current) return <div className="empty-state">No words available.</div>

  const getQuestion = () => {
    if (quizType === "de-en") return { prompt: `${current.article ? current.article + " " : ""}${current.word}`, promptSub: current.type, getLabel: (w) => w.meanings[0].english, getBengali: (w) => w.meanings[0].bengali }
    if (quizType === "en-de") return { prompt: current.meanings[0].english, promptSub: current.meanings[0].bengali, getLabel: (w) => `${w.article ? w.article + " " : ""}${w.word}`, getBengali: () => "" }
    return { prompt: current.meanings[0].english, promptSub: "", getLabel: (w) => w.meanings[0].bengali, getBengali: () => "" }
  }

  const q = getQuestion()

  return (
    <div className="quiz-screen">
      <div className="quiz-controls">
        <div className="level-tabs">
          {["all","A2","B1"].map(l => (
            <button key={l} className={`level-tab ${levelFilter === l ? "active" : ""}`} onClick={() => { setLevelFilter(l); restart(); }}>
              {l === "all" ? "All" : l}
            </button>
          ))}
        </div>
        <select className="type-select" value={quizType} onChange={e => { setQuizType(e.target.value); restart(); }}>
          <option value="de-en">German → English</option>
          <option value="en-de">English → German</option>
          <option value="en-bn">English → Bengali</option>
        </select>
      </div>

      <div className="score-row">
        <span className="score-correct">✓ {score.correct}</span>
        <span className="score-wrong">✗ {score.wrong}</span>
        <span className="score-pct">{total > 0 ? `${accuracy}% accuracy` : ""}</span>
      </div>

      <div className="card quiz-question">
        <div className="quiz-q-label">What does this mean?</div>
        <div className="quiz-q-word">{q.prompt}</div>
        {q.promptSub && <div className="quiz-q-sub">{q.promptSub}</div>}
        {current.meanings[0].example && answered && (
          <div className="meaning-ex" style={{ marginTop: "0.5rem" }}>{current.meanings[0].example}</div>
        )}
      </div>

      <div className="quiz-options">
        {options.map(opt => {
          let cls = "quiz-opt"
          if (answered !== null) {
            if (opt.id === current.id) cls += " correct"
            else if (opt.id === answered) cls += " wrong"
            else cls += " disabled"
          }
          return (
            <button key={opt.id} className={cls} onClick={() => answer(opt)}>
              <span className="opt-en">{q.getLabel(opt)}</span>
              {q.getBengali(opt) && <span className="opt-bn">{q.getBengali(opt)}</span>}
            </button>
          )
        })}
      </div>

      {answered !== null && (
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button className="btn btn-primary" onClick={next}>Next question →</button>
        </div>
      )}

      {history.length > 0 && (
        <div className="quiz-history">
          <div className="conj-label" style={{ marginBottom: "8px" }}>Recent</div>
          {history.slice(-5).reverse().map((h, i) => (
            <div key={i} className={`history-item ${h.correct ? "ok" : "miss"}`}>
              <span>{h.correct ? "✓" : "✗"}</span>
              <span>{h.word}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
