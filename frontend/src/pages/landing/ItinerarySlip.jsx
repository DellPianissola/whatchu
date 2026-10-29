import { ITINERARY, SECTIONS } from './content.js'
import './ItinerarySlip.css'

const ItinerarySlip = () => (
  <section id={SECTIONS.HOW} className="itinerary landing-panel" aria-labelledby="how-title">
    <div className="itinerary-copy">
      <h2 id="how-title" className="landing-h2" data-reveal>Do convite ao sofá</h2>
      <p className="itinerary-lead" data-reveal style={{ '--i': 1 }}>
        O trabalho de juntar as listas acontece antes. Na hora do filme sobra um clique.
      </p>
    </div>

    <div className="itinerary-slip" data-reveal style={{ '--i': 2 }}>
      <p className="itinerary-slip-head">Ingresso para hoje</p>
      {ITINERARY.map(({ when, rows }) => (
        <div key={when} className="itinerary-group">
          <h3 className="itinerary-when">{when}</h3>
          <dl className="itinerary-rows">
            {rows.map(([what, value]) => (
              <div key={what} className="itinerary-row">
                <dt>{what}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
      <p className="itinerary-total">
        <span>Filme da noite decidido</span>
        <span>admite o grupo todo</span>
      </p>
    </div>
  </section>
)

export default ItinerarySlip
