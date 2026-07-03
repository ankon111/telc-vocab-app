export default function Stats({ words, progress, reviewed, mastered }) {
  const a2 = words.filter(w => w.level.includes("A2"))
  const b1 = words.filter(w => w.level.includes("B1") && !w.level.includes("A2"))
  const both = words.filter(w => w.level.includes("A2") && w.level.includes("B1"))

  const masteredA2 = a2.filter(w => (progress[w.id]?.srsScore ?? 0) >= 4).length
  const masteredB1 = b1.filter(w => (progress[w.id]?.srsScore ?? 0) >= 4).length

  const starred = words.filter(w => progress[w.id]?.starred).length

  const byType = {}
  words.forEach(w => { byType[w.type] = (byType[w.type] || 0) + 1 })

  const streakDays = (() => {
    const dates = Object.values(progress)
      .filter(p => p.lastReviewed)
      .map(p => new Date(p.lastReviewed).toDateString())
    return [...new Set(dates)].length
  })()

  const statCards = [
    { label: "Total words", value: words.length, sub: "in database" },
    { label: "Reviewed", value: reviewed, sub: "at least once" },
    { label: "Mastered", value: mastered, sub: "score ≥ 4" },
    { label: "Starred", value: starred, sub: "saved for review" },
    { label: "Study days", value: streakDays, sub: "days active" },
    { label: "Accuracy", value: `${words.length ? Math.round((mastered / words.length) * 100) : 0}%`, sub: "mastered rate" },
  ]

  return (
    <div className="stats-screen">
      <div className="stat-grid">
        {statCards.map(c => (
          <div className="stat-card" key={c.label}>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-sub">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="conj-label" style={{ marginBottom: "12px" }}>Progress by level</div>

        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span style={{ fontSize: "0.85rem" }}>A2 vocabulary</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text3)" }}>{masteredA2}/{a2.length}</span>
          </div>
          <div className="prog-bar">
            <div className="prog-fill a2" style={{ width: `${a2.length ? Math.round((masteredA2 / a2.length) * 100) : 0}%` }} />
          </div>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span style={{ fontSize: "0.85rem" }}>B1 vocabulary</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text3)" }}>{masteredB1}/{b1.length}</span>
          </div>
          <div className="prog-bar">
            <div className="prog-fill b1" style={{ width: `${b1.length ? Math.round((masteredB1 / b1.length) * 100) : 0}%` }} />
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
            <span style={{ fontSize: "0.85rem" }}>Overall</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text3)" }}>{mastered}/{words.length}</span>
          </div>
          <div className="prog-bar">
            <div className="prog-fill success" style={{ width: `${words.length ? Math.round((mastered / words.length) * 100) : 0}%` }} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="conj-label" style={{ marginBottom: "12px" }}>Words by type</div>
        <div className="type-breakdown">
          {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
            <div key={type} className="type-row">
              <span className="badge badge-type">{type}</span>
              <div className="prog-bar" style={{ flex: 1 }}>
                <div className="prog-fill b1" style={{ width: `${Math.round((count / words.length) * 100)}%` }} />
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--text3)", minWidth: "32px", textAlign: "right" }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="conj-label" style={{ marginBottom: "8px" }}>Telc B1 coverage target</div>
        <div style={{ fontSize: "0.82rem", color: "var(--text2)", lineHeight: 1.8 }}>
          <div>2,500 words → 92% spoken coverage (B1)</div>
          <div>Current database: <strong>{words.length} words</strong></div>
          <div>Database grows as more words are added</div>
        </div>
      </div>
    </div>
  )
}
