import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import NET from "vanta/dist/vanta.net.min";
import { useNavigate } from "react-router-dom";
import { MdPhotoCamera, MdArrowForward, MdReceiptLong, MdOpenInNew, MdLocationOn, MdDeleteOutline } from "react-icons/md";
import Navbar from "../Navbar/Navbar";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import "./DashbordClient.scss";
import { api } from "../../api";

function resizeImage(file, maxSize = 256) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = url;
  });
}

function getInitials(nom) {
  if (!nom) return "CL";
  const parts = nom.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const STATUT_META = {
  EN_ATTENTE_VALIDATION: { label: "À valider",  cls: "pending" },
  ATTENTE:               { label: "En attente", cls: "wait"    },
  APPELE:                { label: "Appelé",      cls: "called"  },
  TRAITE:                { label: "Traité",      cls: "done"    },
  ABSENT:                { label: "Absent",      cls: "absent"  },
};

function TicketRow({ ticket, onDelete }) {
  const meta = STATUT_META[ticket.statut] ?? { label: ticket.statut, cls: "wait" };
  return (
    <div className="cl-ticket-row">
      <div className="cl-ticket-row__num">{ticket.numero}</div>
      <div className="cl-ticket-row__info">
        <span className="cl-ticket-row__service">
          {ticket.service?.icone && <span>{ticket.service.icone} </span>}
          {ticket.service?.nom ?? "Service"}
        </span>
        <span className="cl-ticket-row__date">{formatDateTime(ticket.createdAt)}</span>
      </div>
      <span className={`cl-ticket-row__badge cl-ticket-row__badge--${meta.cls}`}>{meta.label}</span>
      <button
        className="cl-ticket-del"
        onClick={() => onDelete(ticket)}
        title="Supprimer ce ticket"
      >
        <MdDeleteOutline size={16} />
      </button>
    </div>
  );
}

function ActiveTicketCard({ ticket, onDelete }) {
  const meta = STATUT_META[ticket.statut] ?? { label: ticket.statut, cls: "wait" };
  const ent = ticket.service?.entreprise;
  const { lat, lng } = ent ?? {};
  const isValidated = ["ATTENTE", "APPELE"].includes(ticket.statut);
  const mapSrc = lat && lng
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`
    : null;

  return (
    <div className="cl-active-card">
      <div className="cl-active-card__top">
        <span className="cl-active-card__num">{ticket.numero}</span>
        <div className="cl-active-card__top-right">
          <span className={`cl-ticket-row__badge cl-ticket-row__badge--${meta.cls}`}>{meta.label}</span>
          <button
            className="cl-ticket-del"
            onClick={() => onDelete(ticket)}
            title="Annuler ce ticket"
          >
            <MdDeleteOutline size={16} />
          </button>
        </div>
      </div>

      {!isValidated ? (
        <div className="cl-active-card__pending">
          <span className="cl-active-card__pending-title">⏳ En attente de validation</span>
          <span className="cl-active-card__pending-sub">
            Les informations de l'entreprise (nom, photo, localisation) s'afficheront une fois votre ticket validé.
          </span>
        </div>
      ) : (
        <>
          {ent && (
            <div className="cl-active-card__ent">
              <div className="cl-active-card__ent-avatar-wrap">
                {ent.avatar
                  ? <img src={ent.avatar} alt={ent.nom} className="cl-active-card__ent-avatar-img" />
                  : <div className="cl-active-card__ent-avatar">{ent.nom?.slice(0, 2).toUpperCase() ?? "EN"}</div>
                }
              </div>
              <div className="cl-active-card__ent-info">
                <span className="cl-active-card__ent-nom">{ent.nom}</span>
                <span className="cl-active-card__ent-service">
                  {ticket.service?.icone} {ticket.service?.nom}
                </span>
              </div>
            </div>
          )}

          {ent?.description && (
            <p className="cl-active-card__ent-desc">{ent.description}</p>
          )}

          {ent && (
            <div className="cl-active-card__map-wrap">
              <div className="cl-active-card__map-label">
                <MdLocationOn size={14} /> Localisation
              </div>
              {mapSrc ? (
                <>
                  <iframe title="Localisation entreprise" className="cl-active-card__map" src={mapSrc} loading="lazy" />
                  <button
                    className="cl-active-card__gmaps"
                    onClick={() => window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank")}
                  >
                    <MdOpenInNew size={13} /> Ouvrir dans Google Maps
                  </button>
                </>
              ) : (
                <p className="cl-active-card__no-geo">Localisation non renseignée par l'entreprise.</p>
              )}
            </div>
          )}
        </>
      )}

      <div className="cl-active-card__date">{formatDateTime(ticket.createdAt)}</div>
    </div>
  );
}

export default function DashbordClient() {
  const { user, updateUser } = useAuth();
  const { socketRef } = useSocket();
  const navigate = useNavigate();
  const vantaRef = useRef(null);
  const vantaInstance = useRef(null);
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  const loadTickets = useCallback(() => {
    return api.get("/tickets/mes-tickets")
      .then((data) => setTickets(Array.isArray(data) ? data : []))
      .catch((err) => console.error("mes-tickets:", err))
      .finally(() => setTicketsLoading(false));
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  // Rafraîchissement temps réel quand l'entreprise valide/refuse/appelle un ticket
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;
    const onChange = () => loadTickets();
    const events = ["ticket:valide", "ticket:refuse", "ticket:appele", "ticket:traite", "ticket:absent"];
    events.forEach((e) => s.on(e, onChange));
    const poll = setInterval(loadTickets, 12000);
    return () => {
      events.forEach((e) => s.off(e, onChange));
      clearInterval(poll);
    };
  }, [loadTickets, socketRef]);

  useEffect(() => {
    if (!vantaInstance.current) {
      vantaInstance.current = NET({
        el: vantaRef.current, THREE,
        mouseControls: true, touchControls: true, gyroControls: false,
        minHeight: 800.0, minWidth: 150.0, scale: 1.0, scaleMobile: 1.0,
        color: 0xffffff, backgroundColor: 0x26266d,
      });
    }
    return () => {
      if (vantaInstance.current) {
        vantaInstance.current.destroy();
        vantaInstance.current = null;
      }
    };
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await resizeImage(file);
      await api.patch("/auth/avatar", { avatar: base64 });
      updateUser({ avatar: base64 });
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Supprimer définitivement votre historique de tickets ?")) return;
    try {
      await api.delete("/tickets/historique");
      setTickets((prev) => prev.filter((t) => !["TRAITE", "ABSENT"].includes(t.statut)));
    } catch (err) {
      console.error("clear historique:", err);
    }
  };

  const handleDeleteTicket = async (ticket) => {
    const isActive = ["EN_ATTENTE_VALIDATION", "ATTENTE", "APPELE"].includes(ticket.statut);
    const msg = isActive
      ? `Annuler le ticket ${ticket.numero} ? Vous perdrez votre place dans la file.`
      : `Supprimer le ticket ${ticket.numero} ?`;
    if (!window.confirm(msg)) return;
    try {
      await api.delete(`/tickets/${ticket.id}`);
      setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
    } catch (err) {
      console.error("delete ticket:", err);
    }
  };

  const activeTickets = tickets.filter((t) =>
    ["EN_ATTENTE_VALIDATION", "ATTENTE", "APPELE"].includes(t.statut)
  );
  const pastTickets = tickets.filter((t) =>
    ["TRAITE", "ABSENT"].includes(t.statut)
  );

  return (
    <div ref={vantaRef} className="cl-vanta-wrapper">
      <div className="navbar-overlay"><Navbar /></div>

      <main className="cl-main">
        {/* ── Colonne gauche ── */}
        <div className="cl-col-left">

          {/* Carte profil */}
          <div className="cl-profile-card">
            <div className="cl-profile-card__avatar-wrap">
              {user?.avatar
                ? <img src={user.avatar} alt={user.nom} className="cl-profile-card__avatar-img" />
                : <div className="cl-profile-card__avatar">{getInitials(user?.nom)}</div>
              }
              <button
                className="cl-profile-card__cam"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Changer la photo"
              >
                <MdPhotoCamera size={14} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} hidden />
            </div>

            <div className="cl-profile-card__body">
              <h2 className="cl-profile-card__nom">{user?.nom ?? "—"}</h2>
              <span className="cl-profile-card__role">Client</span>
              <div className="cl-profile-card__rows">
                <div className="cl-profile-card__row">
                  <span className="cl-profile-card__key">Email</span>
                  <span className="cl-profile-card__val">{user?.email ?? "—"}</span>
                </div>
                <div className="cl-profile-card__row">
                  <span className="cl-profile-card__key">Membre depuis</span>
                  <span className="cl-profile-card__val">{formatDate(user?.createdAt)}</span>
                </div>
                <div className="cl-profile-card__row">
                  <span className="cl-profile-card__key">Tickets pris</span>
                  <span className="cl-profile-card__val">{tickets.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lien vers la page services */}
          <button className="cl-service-link" onClick={() => navigate("/Service2")}>
            <span className="cl-service-link__icon">🎫</span>
            <div className="cl-service-link__text">
              <span className="cl-service-link__title">Prendre un ticket</span>
              <span className="cl-service-link__sub">Choisir un service et rejoindre la file</span>
            </div>
            <MdArrowForward size={20} className="cl-service-link__arrow" />
          </button>

        </div>

        {/* ── Colonne droite ── */}
        <div className="cl-col-right">
          <div className="cl-section">
            <div className="cl-section__head">
              <MdReceiptLong size={17} />
              <span className="cl-section__title">Mes tickets</span>
              {activeTickets.length > 0 && (
                <span className="cl-section__badge">{activeTickets.length} en cours</span>
              )}
            </div>

            {ticketsLoading ? (
              <div className="cl-state">
                <div className="cl-spinner" />
                <span>Chargement…</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="cl-state">
                <div className="cl-state__icon">◎</div>
                <span>Aucun ticket pour l'instant</span>
                <button className="cl-state__cta" onClick={() => navigate("/Service2")}>
                  Prendre mon premier ticket →
                </button>
              </div>
            ) : (
              <>
                {activeTickets.length > 0 && (
                  <div className="cl-ticket-group">
                    <div className="cl-ticket-group__label">En cours</div>
                    {activeTickets.map((t) => <ActiveTicketCard key={t.id} ticket={t} onDelete={handleDeleteTicket} />)}
                  </div>
                )}
                {pastTickets.length > 0 && (
                  <div className="cl-ticket-group">
                    <div className="cl-ticket-group__label cl-ticket-group__label--row">
                      <span>Historique</span>
                      <button className="cl-clear-btn" onClick={handleClearHistory}>
                        <MdDeleteOutline size={14} /> Effacer
                      </button>
                    </div>
                    {pastTickets.slice(0, 8).map((t) => <TicketRow key={t.id} ticket={t} onDelete={handleDeleteTicket} />)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
