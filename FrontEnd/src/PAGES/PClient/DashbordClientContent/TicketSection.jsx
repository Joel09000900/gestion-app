import React from 'react'
import CheckIcon from './CheckIcon'
import './TicketSection.css'

function TicketSection() {
  return (
    <div className="ticket-section">
      <div className="ticket-icon-container">
        <CheckIcon />
      </div>
      <div className="ticket-info">
        <h2 className="ticket-title">Ticket Généré</h2>
        <p className="ticket-date">09/10/2024 • 11:38</p>
      </div>
      
      <div className="current-ticket">
        <div className="ticket-number">010</div>
        <div className="next-info">
          <span className="next-label">Prochain numéro : 011</span>
          <button className="new-ticket-btn">Nouveau ticket</button>
        </div>
      </div>
    </div>
  )
}

export default TicketSection
