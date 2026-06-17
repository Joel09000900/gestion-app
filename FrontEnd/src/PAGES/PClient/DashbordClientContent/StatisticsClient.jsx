import React from 'react'
import './StatisticsClient.css'
import HeaderClient from './HeaderClient'
import InfoSection from './InfoSection'
import StatusBar from './StatusBar'
import TicketSection from './TicketSection'

function StatisticsClient() {
  return (
    <div className="statistics">

      <div className='d-flex' style={{ position:'relative', flexDirection:'column'}}>
    
     
      </div>

      <div className='d-flex StatContain'>
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


    </div>
  )
}

export default StatisticsClient
