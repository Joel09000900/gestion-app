import React from 'react'
import './QueuePosition.css'
import StatisticsClient from '../DashbordClientContent/StatisticsClient'
import InfoSection from './InfoSection'
import HeaderClient from './HeaderClient'
import StatusBar from './StatusBar'
import TicketSection from './TicketSection'


function QueuePosition() {
  return (
    <div className="queue-position">

      <HeaderClient/> 
      <StatusBar/>
      <TicketSection/>

      <h3 className="position-title my-4">Votre position</h3>
      <div className="position-details">
        <div className="position-row">
          <span className="position-label">Votre numéro :</span>
          <span className="position-value">010</span>
        </div>
        <div className="position-row">
          <span className="position-label">Position dans la file :</span>
        </div>
        <div className="progress-section">
          <span className="progress-label">Progression</span>
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress-fill" style={{width: '38%'}}></div>
            </div>
            <span className="progress-percentage">38%</span>
          </div>
        </div>
        <div className="queue-info my-4">
          <span className="queue-ahead">5 personnes devant vous</span>
        </div>
      </div>
      <StatisticsClient/>
      <InfoSection/>
           
    </div>

    
  )
}

export default QueuePosition
