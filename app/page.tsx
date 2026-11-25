import { GpxUpload } from "./components/gpx-upload";

function RouteGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" fill="none">
      <path d="M8 37c7-1 5-15 13-15 6 0 5 9 12 7 4-1 4-9 7-18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 1" />
      <circle cx="8" cy="37" r="4" fill="#ff7547" />
      <circle cx="40" cy="11" r="4" fill="#f6f4ef" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="studio-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="GPX Video — головна">
          <span className="brand-mark"><RouteGlyph /></span>
          <span>gpx<span className="brand-light">video</span></span>
        </a>
        <div className="topbar-right">
          <span className="local-badge"><span className="status-dot" /> Бета-студія</span>
          <button className="help-button" aria-label="Довідка">?</button>
        </div>
      </header>

      <section className="welcome" id="home">
        <div className="eyebrow"><span className="eyebrow-line" /> ВАША МАРШРУТНА СТУДІЯ</div>
        <h1>Кожен маршрут<br />вартий <span>великого кадру.</span></h1>
        <p className="intro">Перетворіть свою активність на короткий фільм.<br className="desktop-break" /> Почніть із GPX-файлу — решту створимо разом.</p>

        <div className="workspace-card">
          <div className="workspace-head">
            <div>
              <div className="workspace-label">НОВИЙ ПРОЄКТ</div>
              <h2>Імпортуйте маршрут</h2>
            </div>
            <span className="step-count"><span>01</span> / 03</span>
          </div>

          <GpxUpload />

          <div className="privacy-note"><span className="lock-icon" aria-hidden="true">◈</span> Ваші GPS-дані приватні. Файл не передається на сервер.</div>
        </div>

        <div className="workflow" aria-label="Етапи створення відео">
          <div className="workflow-item active"><span className="workflow-number">1</span><span>Імпорт маршруту</span></div>
          <span className="workflow-connector" />
          <div className="workflow-item"><span className="workflow-number">2</span><span>Перегляд анімації</span></div>
          <span className="workflow-connector" />
          <div className="workflow-item"><span className="workflow-number">3</span><span>Створення відео</span></div>
        </div>
      </section>

      <footer className="footer"><span>YOUR ACTIVITY. YOUR MOVIE.</span><span>СТВОРЕНО ДЛЯ РУХУ <i>✳</i></span></footer>
    </main>
  );
}
