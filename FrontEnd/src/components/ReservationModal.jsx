import { useState } from "react";
import "./ReservationModal.css";

export default function ReservationModal({ service, onConfirm, onCancel }) {
  const [mode, setMode]   = useState("maintenant");
  const [date, setDate]   = useState("");
  const [heure, setHeure] = useState("");

  const today    = new Date().toISOString().split("T")[0];
  const canConfirm = mode === "maintenant" || (date && heure);

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(mode === "planifier" ? { date, heure } : null);
  };

  return (
    <div className="rm-overlay">
      <div className="rm-modal">

        {/* En-tête service */}
        <div className="rm-header">
          <div className="rm-service-icon">{service?.icon ?? "🎫"}</div>
          <div className="rm-service-info">
            <div className="rm-service-nom">{service?.nom ?? "Service"}</div>
            <div className="rm-service-prix">{service?.prix ? `${typeof service.prix === "number" ? service.prix.toLocaleString() : service.prix} F` : ""}</div>
          </div>
        </div>

        <div className="rm-divider" />

        {/* Choix du mode */}
        <div className="rm-label">Quand souhaitez-vous être servi ?</div>
        <div className="rm-modes">
          <button
            className={`rm-mode-btn ${mode === "maintenant" ? "rm-mode-btn--active" : ""}`}
            onClick={() => setMode("maintenant")}
          >
            <span className="rm-mode-icon">⚡</span>
            <span>Maintenant</span>
          </button>
          <button
            className={`rm-mode-btn ${mode === "planifier" ? "rm-mode-btn--active" : ""}`}
            onClick={() => setMode("planifier")}
          >
            <span className="rm-mode-icon">📅</span>
            <span>Planifier</span>
          </button>
        </div>

        {/* Champs date / heure */}
        {mode === "planifier" && (
          <div className="rm-datetime">
            <div className="rm-field">
              <label className="rm-field-label">Date</label>
              <input
                className="rm-input"
                type="date"
                min={today}
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div className="rm-field">
              <label className="rm-field-label">Heure</label>
              <input
                className="rm-input"
                type="time"
                value={heure}
                onChange={e => setHeure(e.target.value)}
              />
            </div>
            {date && heure && (
              <div className="rm-recap">
                Réservation le <strong>{new Date(date).toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" })}</strong> à <strong>{heure}</strong>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="rm-actions">
          <button className="rm-btn rm-btn--cancel" onClick={onCancel}>
            Annuler
          </button>
          <button
            className={`rm-btn rm-btn--confirm ${!canConfirm ? "rm-btn--disabled" : ""}`}
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            Confirmer →
          </button>
        </div>

      </div>
    </div>
  );
}
