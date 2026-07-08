import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as THREE from "three";
import NET from "vanta/dist/vanta.net.min";
import { motion } from "framer-motion";
import { MdPhotoCamera, MdLocationOn, MdMyLocation, MdOpenInNew, MdEdit, MdCheck, MdDeleteOutline, MdWarningAmber } from "react-icons/md";
import Navbar from "../Navbar/Navbar";
import "./Entreprise.css";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../../context/SocketContext";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix des icônes Leaflet sous Webpack/CRA (sinon le marqueur n'apparaît pas).
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Centre par défaut quand aucune position n'est connue (Abidjan).
const DEFAULT_CENTER = { lat: 5.34812, lon: -4.01266 };

// Capte les clics sur la carte pour (re)positionner le marqueur.
function MapClickHandler({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

// Recentre la vue quand `trigger` change (ex. après une géoloc GPS).
function RecenterMap({ lat, lon, trigger }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lon != null) map.setView([lat, lon], map.getZoom());
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

const PAGE_KEY_MAP = {
  coiffure:      "coiffeur",
  tresseuses:    "tresseuses",
  pressings:     "pressing",
  "lavage-auto": "lavage-auto",
  residence:     "residence",
};

const SERVICES_BY_PAGE = {
  coiffeur: [
    { nom: "Coupe homme",  prefixe: "A", icone: "💈", description: "Coupe classique, dégradé, barbe" },
    { nom: "Coupe enfant", prefixe: "B", icone: "🧒", description: "Coupe adaptée aux plus petits" },
    { nom: "Coloration",   prefixe: "C", icone: "🎨", description: "Couleur, mèches, balayage" },
  ],
  tresseuses: [
    { nom: "Tresses simples",    prefixe: "A", icone: "💇", description: "Tresses droites et nattes classiques" },
    { nom: "Tresses africaines", prefixe: "B", icone: "👑", description: "Box braids, knotless, collées" },
    { nom: "Entretien tresses",  prefixe: "C", icone: "✨", description: "Réparation, nettoyage, démêlage" },
  ],
  pressing: [
    { nom: "Lavage express", prefixe: "A", icone: "⚡", description: "Lavage rapide en 30 minutes" },
    { nom: "Lavage normal",  prefixe: "B", icone: "🧺", description: "Lavage complet et soigneux" },
    { nom: "Repassage",      prefixe: "C", icone: "♨️", description: "Repassage professionnel à la vapeur" },
    { nom: "Nettoyage sec",  prefixe: "D", icone: "🧴", description: "Nettoyage délicat pour vêtements fragiles" },
  ],
  "lavage-auto": [
    { nom: "Lavage extérieur",    prefixe: "A", icone: "🚿", description: "Carrosserie, jantes & vitres" },
    { nom: "Lavage complet",      prefixe: "B", icone: "🧽", description: "Extérieur + intérieur soigné" },
    { nom: "Nettoyage intérieur", prefixe: "C", icone: "🧹", description: "Aspiration, sièges & tapis" },
    { nom: "Polish & lustrage",   prefixe: "D", icone: "💎", description: "Brillance & protection carrosserie" },
  ],
  residence: [
    { nom: "Visite de logement", prefixe: "A", icone: "🏠", description: "Visite guidée d'un bien à louer ou acheter" },
    { nom: "Dépôt de dossier",   prefixe: "B", icone: "📁", description: "Constitution et dépôt de dossier locataire" },
    { nom: "État des lieux",     prefixe: "C", icone: "📋", description: "État des lieux d'entrée ou de sortie" },
    { nom: "Signature de bail",  prefixe: "D", icone: "✍️", description: "Signature du contrat de bail" },
  ],
};

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
  if (!nom) return "EN";
  return nom.trim().slice(0, 2).toUpperCase();
}

function AgentBadge({ agent, status }) {
  return (
    <div className="en-agent-badge">
      <div className="en-agent-avatar" style={{ background: agent.color }}>
        {agent.initiales}
      </div>
      <div className="en-agent-info">
        <span className="en-agent-name">{agent.nom}</span>
        <span className="en-agent-role">
          <span className={`en-dot ${status === "active" ? "en-dot--green" : "en-dot--orange"}`} />
          {status === "active" ? "En service" : "En pause"}
        </span>
      </div>
    </div>
  );
}

function QueueItem({ ticket, index, isNext }) {
  return (
    <div className={`en-queue-item ${isNext ? "en-queue-item--next" : ""}`}>
      <div className="en-queue-item__left">
        <span className="en-queue-item__rank">#{index + 1}</span>
        {ticket.clientAvatar
          ? <img src={ticket.clientAvatar} alt={ticket.clientNom} className="en-queue-item__avatar" />
          : <div className="en-queue-item__avatar en-queue-item__avatar--ph">{getInitials(ticket.clientNom)}</div>}
        <div>
          <div className="en-queue-item__numero">{ticket.numero}</div>
          <div className="en-queue-item__service">{ticket.clientNom ?? "Client"} · {ticket.service}</div>
        </div>
      </div>
      <div className="en-queue-item__right">
        <span className="en-queue-item__wait">{ticket.attente}</span>
        <span className={`en-badge ${isNext ? "en-badge--next" : "en-badge--wait"}`}>
          {isNext ? "Prochain" : "En attente"}
        </span>
      </div>
    </div>
  );
}

function HistoriqueItem({ ticket }) {
  return (
    <div className="en-hist-item">
      {ticket.clientAvatar
        ? <img src={ticket.clientAvatar} alt={ticket.clientNom} className="en-hist-avatar" />
        : <div className="en-hist-avatar en-hist-avatar--ph">{getInitials(ticket.clientNom)}</div>}
      <span className="en-hist-num">{ticket.numero}</span>
      <span className="en-hist-service">{ticket.clientNom ?? "Client"} · {ticket.service}</span>
      <span className={`en-hist-status en-hist-status--${ticket.statut}`}>
        {ticket.statut === "traite" ? "✓ Traité" : "⊘ Absent"}
      </span>
      <span className="en-hist-time">{ticket.heure}</span>
    </div>
  );
}

export default function Entreprise() {
  const { user, logout } = useAuth();
  const { serviceId } = useParams();
  const { socketRef } = useSocket();
  const navigate = useNavigate();

  const vantaRef = useRef(null);
  const vantaInstance = useRef(null);

  const [agent] = useState({
    initiales: user?.nom?.slice(0, 2).toUpperCase() ?? "EN",
    nom: user?.nom ?? "Entreprise",
    guichet: "Guichet 01",
    color: "linear-gradient(135deg, #1a6bff, #6fa3ff)",
  });
  const [agentStatus] = useState("active"); // toujours "active" : bandeau Pause retiré (secteur informel)
  const [elapsed, setElapsed] = useState(0);
  const [activeTab, setActiveTab] = useState("queue");
  const [notification, setNotification] = useState(null);
  const [dbTickets, setDbTickets] = useState([]);
  const [hiddenHistIds, setHiddenHistIds] = useState(() => new Set());

  const fileInputRef = useRef(null);
  const [entreprise, setEntreprise] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Type = source de vérité depuis l'entreprise ; repli sur l'URL le temps du chargement.
  const typeKey = entreprise?.type ?? serviceId;
  const pageKey = PAGE_KEY_MAP[typeKey] ?? null;
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [geo, setGeo] = useState({ status: "idle", lat: null, lon: null, error: null });
  const [markerPos, setMarkerPos] = useState(null); // position en cours d'édition { lat, lon }
  const [savingPos, setSavingPos] = useState(false);
  const [recenter, setRecenter]   = useState(0);     // bump → recentre la carte

  useEffect(() => {
    let alive = true;
    api.get("/entreprises/moi").then((data) => {
      if (alive) {
        setEntreprise(data);
        setDescDraft(data.description ?? "");
        if (data.lat && data.lng) {
          setGeo({ status: "success", lat: data.lat, lon: data.lng, error: null });
          setMarkerPos({ lat: data.lat, lon: data.lng });
        }
      }
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Auto-création des services DB au premier accès à une page de service.
  // Garde par page (ref) pour ne pas re-POSTer à chaque rendu ; après création,
  // on refetch l'entreprise afin que `entreprise.services` ne reste pas périmé.
  const ensuredPagesRef = useRef(new Set());
  useEffect(() => {
    if (!pageKey || !entreprise) return;
    if (ensuredPagesRef.current.has(pageKey)) return;

    const needed = SERVICES_BY_PAGE[pageKey] ?? [];
    if (needed.length === 0) return;

    const existingPrefixes = new Set((entreprise.services ?? []).map((s) => s.prefixe));
    const missing = needed.filter((svc) => !existingPrefixes.has(svc.prefixe));

    ensuredPagesRef.current.add(pageKey); // marqué traité avant l'async → pas de double envoi
    if (missing.length === 0) return;

    Promise.all(missing.map((svc) => api.post("/services", svc).catch(() => null)))
      .then(() => api.get("/entreprises/moi"))
      .then((data) => { if (data) setEntreprise(data); })
      .catch(() => {});
  }, [pageKey, entreprise]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await resizeImage(file);
      await api.patch("/entreprises/avatar", { avatar: base64 });
      setEntreprise((prev) => prev ? { ...prev, avatar: base64 } : prev);
    } catch (err) { console.error(err); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleSaveDesc = async () => {
    try {
      await api.patch("/entreprises/profil", { description: descDraft });
      setEntreprise((prev) => prev ? { ...prev, description: descDraft } : prev);
      setEditingDesc(false);
    } catch (err) { console.error(err); }
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setGeo({ status: "error", lat: null, lon: null, error: "Géolocalisation non supportée." });
      return;
    }
    setGeo((g) => ({ ...g, status: "loading", error: null }));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setGeo({ status: "success", lat, lon, error: null });
        setMarkerPos({ lat, lon });
        setRecenter((c) => c + 1);
        try {
          await api.patch("/entreprises/profil", { lat, lng: lon });
        } catch (err) { console.error(err); }
      },
      (err) => setGeo({ status: "error", lat: null, lon: null, error: err.message || "Position indisponible." }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Position choisie manuellement (clic sur la carte ou drag du marqueur).
  const handlePickOnMap = (lat, lon) => setMarkerPos({ lat, lon });

  // Enregistre la position du marqueur en base.
  const handleSavePosition = async () => {
    if (!markerPos) return;
    setSavingPos(true);
    try {
      await api.patch("/entreprises/profil", { lat: markerPos.lat, lng: markerPos.lon });
      setGeo({ status: "success", lat: markerPos.lat, lon: markerPos.lon, error: null });
    } catch (err) { console.error(err); }
    finally { setSavingPos(false); }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await api.delete("/auth/compte");
      logout();
      navigate("/");
    } catch (err) {
      console.error("delete account:", err);
      setDeletingAccount(false);
      window.alert("Échec de la suppression du compte : " + err.message);
    }
  };

  const nomEntreprise = entreprise?.nom ?? user?.nom ?? "Mon entreprise";
  const avatar = entreprise?.avatar ?? null;
  const mapCenter = markerPos
    ? [markerPos.lat, markerPos.lon]
    : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lon];
  // La position du marqueur diffère-t-elle de celle enregistrée en base ?
  const positionModifiee = markerPos && (markerPos.lat !== geo.lat || markerPos.lon !== geo.lon);

  // ── Source des tickets ──
  // Admin = super-entreprise : reçoit TOUS les tickets (toutes entreprises) via /tickets/all.
  // Entreprise : uniquement les siens via /entreprises/tickets.
  const isAdmin = user?.role === "ADMIN";
  const refreshTickets = useCallback(async () => {
    try {
      const all = await api.get(isAdmin ? "/tickets/all" : "/entreprises/tickets");
      setDbTickets(Array.isArray(all) ? all : []);
    } catch (err) {
      console.error("refresh tickets:", err);
    }
  }, [isAdmin]);

  // Chargement initial + rafraîchissement temps réel (socket) + polling de secours
  useEffect(() => {
    refreshTickets();
    const s = socketRef.current;
    const onChange = () => refreshTickets();
    const events = ["ticket:nouveau", "ticket:valide", "ticket:refuse", "ticket:appele", "ticket:traite", "ticket:absent"];
    if (s) events.forEach(e => s.on(e, onChange));
    const poll = setInterval(refreshTickets, 10000);
    return () => {
      if (s) events.forEach(e => s.off(e, onChange));
      clearInterval(poll);
    };
  }, [refreshTickets, socketRef]);

  // Périmètre : services de la page courante (sinon tous les tickets de l'entreprise)
  const scoped = useMemo(() => {
    const names = pageKey ? new Set((SERVICES_BY_PAGE[pageKey] ?? []).map(s => s.nom)) : null;
    return names ? dbTickets.filter(t => names.has(t.service?.nom)) : dbTickets;
  }, [dbTickets, pageKey]);

  const fmtHeure = (v) => {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "—" : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const pendingValidations = useMemo(
    () => scoped.filter(t => t.statut === "EN_ATTENTE_VALIDATION"),
    [scoped]
  );

  const current = useMemo(() => {
    const appeles = scoped.filter(tk => tk.statut === "APPELE");
    if (appeles.length === 0) return null;
    const t = [...appeles].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
    return {
      id: t.id, numero: t.numero, service: t.service?.nom ?? "Service", since: fmtHeure(t.updatedAt),
      clientNom: t.user?.nom, clientAvatar: t.user?.avatar,
    };
  }, [scoped]);

  const queue = useMemo(
    () => scoped
      .filter(t => t.statut === "ATTENTE")
      .map(t => ({ id: t.id, numero: t.numero, service: t.service?.nom ?? "Service", attente: `~${t.attente ?? 0} min`, clientNom: t.user?.nom, clientAvatar: t.user?.avatar })),
    [scoped]
  );

  const historique = useMemo(
    () => scoped
      .filter(t => (t.statut === "TRAITE" || t.statut === "ABSENT") && !hiddenHistIds.has(t.id))
      .slice().reverse().slice(0, 20)
      .map(t => ({ id: t.id, numero: t.numero, service: t.service?.nom ?? "Service", statut: t.statut === "TRAITE" ? "traite" : "absent", heure: fmtHeure(t.updatedAt), clientNom: t.user?.nom, clientAvatar: t.user?.avatar })),
    [scoped, hiddenHistIds]
  );

  const traites = useMemo(() => scoped.filter(t => t.statut === "TRAITE").length, [scoped]);
  const absents = useMemo(() => scoped.filter(t => t.statut === "ABSENT").length, [scoped]);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const handleValidateTicket = async () => {
    const ticket = pendingValidations[0];
    if (!ticket) return;
    try {
      await api.patch(`/tickets/${ticket.id}/valider`);          // ticket.id = id DB réel
      socketRef.current?.emit("ticket:valide", { id: ticket.id });
      showNotif(`Ticket ${ticket.numero} validé ✓ — ajouté à la file`);
      refreshTickets();
    } catch (err) {
      showNotif(`Échec de la validation : ${err.message}`, "warn");
    }
  };

  const handleRefuseTicket = async () => {
    const ticket = pendingValidations[0];
    if (!ticket) return;
    try {
      await api.patch(`/tickets/${ticket.id}/refuser`);
      socketRef.current?.emit("ticket:refuse", { id: ticket.id });
      showNotif(`Ticket ${ticket.numero} refusé`, "warn");
      refreshTickets();
    } catch (err) {
      showNotif(`Échec du refus : ${err.message}`, "warn");
    }
  };

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

  useEffect(() => {
    if (!current) return;
    setElapsed(0);
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [current?.id]);

  const showNotif = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2500);
  };

  const handleNext = async () => {
    if (queue.length === 0) { showNotif("Aucun ticket en attente", "warn"); return; }
    const next = queue[0];
    try {
      await api.patch(`/tickets/${next.id}/appeler`, { guichet: agent.guichet });
      socketRef.current?.emit("ticket:appele", { id: next.id, guichet: agent.guichet });
      showNotif(`Ticket ${next.numero} appelé`);
      refreshTickets();
    } catch (err) {
      showNotif(`Échec de l'appel : ${err.message}`, "warn");
    }
  };

  const handleTraite = async () => {
    if (!current) return;
    try {
      await api.patch(`/tickets/${current.id}/terminer`, { statut: "TRAITE" });
      socketRef.current?.emit("ticket:traite", { id: current.id });
      showNotif(`${current.numero} marqué comme traité ✓`);
      refreshTickets();
    } catch (err) {
      showNotif(`Échec : ${err.message}`, "warn");
    }
  };

  const handleAbsent = async () => {
    if (!current) return;
    try {
      await api.patch(`/tickets/${current.id}/terminer`, { statut: "ABSENT" });
      socketRef.current?.emit("ticket:absent", { id: current.id });
      showNotif(`${current.numero} marqué absent`, "warn");
      refreshTickets();
    } catch (err) {
      showNotif(`Échec : ${err.message}`, "warn");
    }
  };

  // L'historique est de la donnée DB partagée avec les clients :
  // on le masque de la vue (session) au lieu de supprimer les tickets des clients.
  const handleClearHistory = () => {
    if (historique.length === 0) return;
    if (!window.confirm("Masquer l'historique des tickets traités et absents de cette vue ?")) return;
    setHiddenHistIds(prev => {
      const next = new Set(prev);
      historique.forEach(h => next.add(h.id));
      return next;
    });
    showNotif("Historique masqué de la vue");
  };

  const formatElapsed = (s) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

  return (
    <div ref={vantaRef} className="en-vanta-wrapper">
      <div className="navbar-overlay">
        <Navbar />
      </div>

      {notification && (
        <div className={`en-toast en-toast--${notification.type}`}>
          {notification.msg}
        </div>
      )}

      {pendingValidations.length > 0 && (
        <div className="en-val-overlay">
          <div className="en-val-modal">

            {pendingValidations.length > 1 && (
              <div className="en-val-queue-badge">
                +{pendingValidations.length - 1} ticket{pendingValidations.length > 2 ? "s" : ""} en attente
              </div>
            )}

            <div className="en-val-icon">🎫</div>
            <div className="en-val-label">Nouveau ticket</div>
            <div className="en-val-numero">{pendingValidations[0].numero}</div>
            <div className="en-val-service">
              {pendingValidations[0].service?.icone} {pendingValidations[0].service?.nom}
            </div>

            <div className="en-val-info">
              {pendingValidations[0].user?.avatar
                ? <img src={pendingValidations[0].user.avatar} alt={pendingValidations[0].user?.nom} className="en-val-avatar" />
                : <div className="en-val-avatar en-val-avatar--ph">{getInitials(pendingValidations[0].user?.nom)}</div>}
              <span>{pendingValidations[0].user?.nom ?? "Client"}</span>
            </div>

            <div className="en-val-actions">
              <button className="en-val-btn en-val-btn--refuse" onClick={handleRefuseTicket}>
                ✕ Refuser
              </button>
              <button className="en-val-btn en-val-btn--validate" onClick={handleValidateTicket}>
                ✓ Valider
              </button>
            </div>

          </div>
        </div>
      )}

      <div className="en-layout">

        <motion.div
          className="en-col"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
        >
          {/* ── Carte profil ── */}
          <div className="en-glass-card en-profile-card">
            <div className="en-profile-card__avatar-wrap">
              {avatar
                ? <img src={avatar} alt={nomEntreprise} className="en-profile-card__avatar-img" />
                : <div className="en-profile-card__avatar">{getInitials(nomEntreprise)}</div>
              }
              <button className="en-profile-card__cam-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Changer la photo">
                <MdPhotoCamera size={14} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} hidden />
            </div>

            <div className="en-profile-card__info">
              <h2 className="en-profile-card__nom">{nomEntreprise}</h2>
              <span className="en-profile-card__badge">Entreprise</span>

              {editingDesc ? (
                <div className="en-profile-card__desc-edit">
                  <textarea
                    className="en-profile-card__desc-input"
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    rows={3}
                    placeholder="Décrivez votre entreprise…"
                    autoFocus
                  />
                  <div className="en-profile-card__desc-actions">
                    <button className="en-profile-card__desc-cancel" onClick={() => { setEditingDesc(false); setDescDraft(entreprise?.description ?? ""); }}>Annuler</button>
                    <button className="en-profile-card__desc-save" onClick={handleSaveDesc}><MdCheck size={14}/> Enregistrer</button>
                  </div>
                </div>
              ) : (
                <div className="en-profile-card__desc-wrap" onClick={() => setEditingDesc(true)}>
                  <p className="en-profile-card__desc">
                    {entreprise?.description || <em className="en-profile-card__desc--empty">Ajouter une description…</em>}
                  </p>
                  <MdEdit size={13} className="en-profile-card__desc-edit-icon" />
                </div>
              )}
            </div>
          </div>

          {/* ── Géolocalisation ── */}
          <div className="en-glass-card en-geo-card">
            <div className="en-geo-card__head">
              <MdLocationOn size={17} />
              <span>Localisation</span>
            </div>
            <button className="en-geo-card__btn" onClick={handleLocate} disabled={geo.status === "loading"}>
              <MdMyLocation size={15} />
              {geo.status === "loading" ? "Localisation en cours…" : "Localiser mon entreprise (GPS)"}
            </button>
            {geo.status === "error" && <div className="en-geo-card__error">{geo.error}</div>}

            <p className="en-geo-card__hint">
              Ou cliquez sur la carte / déplacez le marqueur pour définir votre position manuellement.
            </p>

            <MapContainer
              center={mapCenter}
              zoom={15}
              scrollWheelZoom={false}
              className="en-geo-card__map"
              style={{ height: 220, width: "100%", borderRadius: 12 }}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onPick={handlePickOnMap} />
              <RecenterMap lat={markerPos?.lat} lon={markerPos?.lon} trigger={recenter} />
              {markerPos && (
                <Marker
                  position={[markerPos.lat, markerPos.lon]}
                  draggable
                  eventHandlers={{
                    dragend: (e) => {
                      const m = e.target.getLatLng();
                      setMarkerPos({ lat: m.lat, lon: m.lng });
                    },
                  }}
                />
              )}
            </MapContainer>

            {markerPos && (
              <div className="en-geo-card__result">
                <div className="en-geo-card__coords">
                  <span>Lat. {markerPos.lat.toFixed(5)}</span>
                  <span>Lon. {markerPos.lon.toFixed(5)}</span>
                </div>
                <button
                  className="en-geo-card__btn"
                  onClick={handleSavePosition}
                  disabled={savingPos || !positionModifiee}
                >
                  <MdCheck size={15} />
                  {savingPos ? "Enregistrement…" : positionModifiee ? "Enregistrer cette position" : "Position enregistrée ✓"}
                </button>
                <button className="en-geo-card__gmaps" onClick={() => window.open(`https://www.google.com/maps?q=${markerPos.lat},${markerPos.lon}`, "_blank")}>
                  <MdOpenInNew size={14} /> Voir sur Google Maps
                </button>
              </div>
            )}
          </div>

          {/* ── Zone de danger : suppression du compte (masquée pour l'admin) ── */}
          {!isAdmin && (
            <div className="en-glass-card en-danger-card">
              <div className="en-danger-card__head">
                <MdWarningAmber size={17} />
                <span>Zone de danger</span>
              </div>
              <p className="en-danger-card__text">
                Supprimer définitivement votre entreprise, ses services et tous ses tickets.
              </p>
              <button className="en-danger-card__btn" onClick={() => setShowDeleteModal(true)}>
                <MdDeleteOutline size={15} /> Supprimer mon compte
              </button>
            </div>
          )}

          <div className="en-glass-card en-current-card">
            <div className="en-current-card__bg-circle" />
            <div className="en-current-card__bg-circle en-current-card__bg-circle--2" />

            <div className="en-current-card__header">
              <span className="en-label-chip">Ticket en cours</span>
              <span className="en-time-chip">
                <span className="en-time-dot" />
                {formatElapsed(elapsed)}
              </span>
            </div>

            {current ? (
              <>
                <div className="en-numero" key={current.id}>{current.numero}</div>
                <div className="en-service-txt">{current.service}</div>
                <div className="en-client" title="Vérifiez l'identité du client">
                  {current.clientAvatar
                    ? <img src={current.clientAvatar} alt={current.clientNom} className="en-client__avatar" />
                    : <div className="en-client__avatar en-client__avatar--ph">{getInitials(current.clientNom)}</div>}
                  <div className="en-client__meta">
                    <span className="en-client__nom">{current.clientNom ?? "Client"}</span>
                    <span className="en-client__label">Identité du client</span>
                  </div>
                </div>
                <div className="en-since">Pris en charge à {current.since}</div>
                <div className="en-actions">
                  <motion.button className="btn-submit en-btn-next" onClick={handleNext} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    → Suivant
                  </motion.button>
                  <motion.button className="en-btn-traite" onClick={handleTraite} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    ✓ Traité
                  </motion.button>
                  <motion.button className="en-btn-absent" onClick={handleAbsent} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    ⊘ Absent
                  </motion.button>
                </div>
              </>
            ) : (
              <div className="en-empty">
                <div className="en-empty__icon">◎</div>
                <div>Aucun ticket en cours</div>
                <div className="en-empty__sub">Appelez le suivant</div>
              </div>
            )}
          </div>

          <div className="en-stats-grid">
            {[
              { val: traites,      label: "Traités aujourd'hui", accent: true },
              { val: queue.length, label: "En attente" },
              { val: absents,      label: "Absents" },
              { val: traites + absents > 0 ? `${Math.round((traites / (traites + absents)) * 100)}%` : "—", label: "Taux de traitement", accent: true },
            ].map((s, i) => (
              <motion.div
                key={i}
                className={`en-glass-card en-stat-card ${s.accent ? "en-stat-card--accent" : ""}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.3 + i * 0.07, duration: 0.5 } }}
              >
                <div className="en-stat-val">{s.val}</div>
                <div className="en-stat-label">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="en-col"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
        >
          <div className="en-glass-card en-panel">
            <div className="en-tabs">
              <button className={`en-tab ${activeTab === "queue" ? "en-tab--active" : ""}`} onClick={() => setActiveTab("queue")}>
                File d'attente
                {queue.length > 0 && <span className="en-tab-count">{queue.length}</span>}
              </button>
              <button className={`en-tab ${activeTab === "historique" ? "en-tab--active" : ""}`} onClick={() => setActiveTab("historique")}>
                Historique
                <span className="en-tab-count en-tab-count--muted">{historique.length}</span>
              </button>
            </div>

            {activeTab === "queue" && (
              <div className="en-tab-content">
                <div className="en-queue-bar">
                  <span className="en-queue-info">
                    {queue.length === 0 ? "Aucun ticket en attente" : `${queue.length} ticket${queue.length > 1 ? "s" : ""} en attente`}
                  </span>
                  <motion.button className="btn-submit en-call-btn" onClick={handleNext} disabled={queue.length === 0} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    Appeler le suivant →
                  </motion.button>
                </div>
                <div className="en-queue-list">
                  {queue.length === 0 ? (
                    <div className="en-empty"><div className="en-empty__icon">◎</div><div>File vide</div></div>
                  ) : (
                    queue.map((t, i) => <QueueItem key={t.id} ticket={t} index={i} isNext={i === 0} />)
                  )}
                </div>
              </div>
            )}

            {activeTab === "historique" && (
              <div className="en-tab-content">
                <div className="en-queue-bar">
                  <span className="en-queue-info">Tickets traités cette session</span>
                  {historique.length > 0 && (
                    <button className="en-clear-btn" onClick={handleClearHistory}>
                      <MdDeleteOutline size={15} /> Effacer l'historique
                    </button>
                  )}
                </div>
                <div className="en-queue-list">
                  {historique.length === 0 ? (
                    <div className="en-empty"><div className="en-empty__icon">◎</div><div>Aucun historique</div></div>
                  ) : (
                    historique.map((h) => <HistoriqueItem key={h.id} ticket={h} />)
                  )}
                </div>
              </div>
            )}

            <div className="en-panel-footer">
              <AgentBadge agent={agent} status={agentStatus} />
            </div>
          </div>
        </motion.div>

      </div>

      {showDeleteModal && (
        <div
          className="en-modal-overlay"
          onClick={() => !deletingAccount && setShowDeleteModal(false)}
        >
          <div className="en-modal" onClick={(e) => e.stopPropagation()}>
            <div className="en-modal__icon"><MdWarningAmber size={28} /></div>
            <h3 className="en-modal__title">Supprimer votre compte ?</h3>
            <p className="en-modal__text">
              Cette action est <strong>irréversible</strong>. Votre entreprise, ses services
              et tous les tickets associés seront définitivement effacés de la base de données.
            </p>
            <div className="en-modal__actions">
              <button
                className="en-modal__cancel"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingAccount}
              >
                Annuler
              </button>
              <button
                className="en-modal__confirm"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? "Suppression…" : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
