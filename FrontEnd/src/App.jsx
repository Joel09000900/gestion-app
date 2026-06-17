import React from 'react'
import './App.css'

function App() {
  return (
    <div className="app">
      <div className="background"></div>
      
      <header className="header">
        <div className="nav-buttons">
          <button className="nav-btn back-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="nav-btn home-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        <div className="auth-buttons">
          <button className="auth-btn">Inscription</button>
          <button className="auth-btn">Connexion</button>
        </div>
      </header>

      <main className="main-content">
        <div className="container">
          <div className="title-section">
            <h1 className="main-title">Gestion de File d'Attente</h1>
            <p className="subtitle">Service Public - Guichet 1</p>
          </div>

          <div className="status-bar">
            <span className="status-text">Pause en cours</span>
            <span className="service-info">Service Public - Guichet 1</span>
          </div>

          <div className="check-icon">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="40" fill="#007AFF"/>
              <path d="M25 40L35 50L55 30" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div className="ticket-display">
            <div className="current-number">010</div>
            <div className="next-info">Prochain numéro : 011</div>
            <button className="new-ticket-btn">Nouveau ticket</button>
          </div>

          <div className="position-card">
            <h3 className="position-title">Votre position</h3>
            <div className="position-details">
              <div className="position-row">
                <span>Votre numéro :</span>
                <span className="position-value">010</span>
              </div>
              <div className="position-row">
                <span>Position dans la file :</span>
              </div>
              <div className="position-row">
                <span>Progression</span>
                <span className="progress-value">38%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>
              <div className="queue-info">5 personnes devant vous</div>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">8</div>
              <div className="stat-label">Personnes en attente</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">15</div>
              <div className="stat-label">Minutes d'attente</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">10</div>
              <div className="stat-label">Clients servis</div>
            </div>
          </div>

          <div className="info-section">
            <h4 className="info-title">Informations importantes</h4>
            <p className="info-text">
              Veuillez garder votre ticket et vous présenter dès que votre numéro est appelé. En cas d'absence lors de 
              l'appel, vous devrez reprendre un nouveau ticket.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
