import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as THREE from "three";
import NET from "vanta/dist/vanta.net.min";
import { useSearchParams, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import Navbar from "../Navbar/Navbar";
import { useSocket } from "../../context/SocketContext";
import { api } from "../../api";
import { FaCut, FaCar, FaChild, FaPalette, FaPumpSoap, FaTshirt, FaSprayCan, FaBuilding, FaHome, FaFileAlt, FaClipboardList, FaFileSignature } from "react-icons/fa";
import { GiComb, GiHairStrands } from "react-icons/gi";
import { MdLocalLaundryService, MdStorefront, MdIron, MdDryCleaning, MdLocalCarWash, MdCleaningServices } from "react-icons/md";

const AVG_MIN = 7;

// Prix catalogue (FCFA) par nom de service. Tresseuses non tarifées (non demandé).
const PRICES = {
  // Coiffure
  "Coupe homme": 2000, "Coupe enfant": 1000, "Coloration": 5000,
  // Pressing (valeurs par défaut — ajustables ici)
  "Lavage express": 1500, "Lavage normal": 2500, "Repassage": 1000, "Nettoyage sec": 4000,
  // Lavage auto
  "Lavage extérieur": 2000, "Lavage complet": 4000, "Nettoyage intérieur": 3000, "Polish & lustrage": 8000,
};

// Icône vectorielle par service (fallback : l'emoji DB si non mappé)
const SERVICE_ICONS = {
  "Coupe homme": FaCut,
  "Coupe enfant": FaChild,
  "Coloration": FaPalette,
  "Tresses simples": GiComb,
  "Tresses africaines": GiHairStrands,
  "Entretien tresses": FaPumpSoap,
  "Lavage express": FaTshirt,
  "Lavage normal": MdLocalLaundryService,
  "Repassage": MdIron,
  "Nettoyage sec": MdDryCleaning,
  "Lavage extérieur": MdLocalCarWash,
  "Lavage complet": FaCar,
  "Nettoyage intérieur": MdCleaningServices,
  "Polish & lustrage": FaSprayCan,
  "Visite de logement": FaHome,
  "Dépôt de dossier": FaFileAlt,
  "État des lieux": FaClipboardList,
  "Signature de bail": FaFileSignature,
};

// Config par type. `prefix` = préfixe des classes CSS (co/tr/pr/la), identiques par ailleurs.
// La feuille de style correspondante est importée par la page enveloppe.
const CONFIG = {
  coiffure:      { prefix: "co", Icon: FaCut,                title: "Coiffeur",          noun: "salon de coiffure" },
  tresseuses:    { prefix: "tr", Icon: GiComb,               title: "Tresseuses",         noun: "atelier de tresses" },
  pressings:     { prefix: "pr", Icon: MdLocalLaundryService, title: "Pressing",          noun: "pressing" },
  "lavage-auto": { prefix: "la", Icon: FaCar,                title: "Lavage Automobile",  noun: "centre de lavage" },
  residence:     { prefix: "re", Icon: FaBuilding,          title: "Résidence",          noun: "agence immobilière" },
};

// Statuts DB (majuscules) → libellé + classe CSS (suffixes en minuscules)
const STATUT_META = {
  EN_ATTENTE_VALIDATION: { label: "⏳ En validation", cls: "en_attente_validation" },
  ATTENTE:               { label: "En attente",      cls: "attente" },
  APPELE:                { label: "Appelé",          cls: "appele" },
  TRAITE:                { label: "Traité",          cls: "attente" },
  ABSENT:                { label: "Absent",          cls: "attente" },
};

function fmtHeure(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function computeEstimate(ticket, queue) {
  if (!ticket) return null;
  const s = ticket.statut;
  if (s === "TRAITE" || s === "ABSENT") return { kind: "done" };
  if (s === "EN_ATTENTE_VALIDATION") return { kind: "validation" };
  if (s === "APPELE") return { kind: "appele" };

  const sorted = [...queue].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const idx = sorted.findIndex((q) => q.id === ticket.id);
  const position = idx >= 0 ? idx : sorted.length;
  const minutes = position * AVG_MIN;
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  const heurePassage = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const urgency = position === 0 ? "now" : position <= 2 ? "soon" : position <= 5 ? "mid" : "wait";
  return { kind: "wait", position, minutes, heurePassage, urgency, total: sorted.length };
}

function ServiceCard({ P, service, selected, onClick }) {
  const enAttente = service._count?.tickets ?? 0;
  const attente = enAttente * AVG_MIN;
  const level = enAttente <= 2 ? "low" : enAttente <= 4 ? "mid" : "high";
  const prix = PRICES[service.nom];
  const Icon = SERVICE_ICONS[service.nom];
  return (
    <button className={`${P}-service-card ${selected ? `${P}-service-card--selected` : ""}`} onClick={onClick}>
      <div className={`${P}-service-card__icon`}>{Icon ? <Icon size={26} /> : service.icone}</div>
      <div className={`${P}-service-card__nom`}>{service.nom}</div>
      <div className={`${P}-service-card__desc`}>{service.description}</div>
      {prix != null && <div className={`${P}-service-card__prix`}>{prix.toLocaleString()} F</div>}
      <div className={`${P}-service-card__footer`}>
        <span className={`${P}-wait-badge ${P}-wait-badge--${level}`}>~{attente} min</span>
        <span className={`${P}-service-card__count`}>{enAttente} en att.</span>
      </div>
    </button>
  );
}

function QueueRow({ P, item, isMyTicket, isScanned }) {
  const meta = STATUT_META[item.statut] ?? { label: item.statut, cls: "attente" };
  return (
    <div className={`${P}-queue-row ${item.statut === "APPELE" ? `${P}-queue-row--calling` : ""} ${isMyTicket ? `${P}-queue-row--mine` : ""} ${isScanned ? `${P}-queue-row--scanned` : ""}`}>
      <div className={`${P}-queue-row__left`}>
        <span className={`${P}-queue-row__num`}>{item.numero}</span>
        {item.guichet && <span className={`${P}-queue-row__guichet`}>→ {item.guichet}</span>}
      </div>
      <div className={`${P}-queue-row__right`}>
        {isMyTicket && <span className={`${P}-mine-label`}>Vous</span>}
        <span className={`${P}-status-badge ${P}-status-badge--${meta.cls}`}>{meta.label}</span>
      </div>
    </div>
  );
}

function TicketEmis({ P, type, ticket, service, estimate, onReset }) {
  const [secondes, setSecondes] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecondes((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const e = estimate ?? { kind: "wait", position: ticket.devant ?? 0, minutes: ticket.attente ?? 0, urgency: "wait", total: 0, heurePassage: "—" };
  const SvcIcon = SERVICE_ICONS[service?.nom];

  return (
    <div className={`${P}-ticket-emis`}>
      <div className={`${P}-ticket-emis__header`}>
        <span className={`${P}-ticket-emis__label`}>Votre ticket</span>
        <span className={`${P}-ticket-emis__timer`}>
          <span className={`${P}-timer-dot`} />
          {secondes < 60 ? `${secondes}s` : `${Math.floor(secondes / 60)}m ${secondes % 60}s`}
        </span>
      </div>
      <div className={`${P}-ticket-emis__numero`}>{ticket.numero}</div>
      <div className={`${P}-ticket-emis__service`}>{SvcIcon ? <SvcIcon size={16} style={{ verticalAlign: "-3px", marginRight: 5 }} /> : service?.icone} {service?.nom}</div>
      {PRICES[service?.nom] != null && <div className={`${P}-ticket-emis__prix`}>{PRICES[service?.nom].toLocaleString()} F</div>}

      {e.kind === "validation" ? (
        <div className="we-validation-msg">⏳ En attente de validation par l'entreprise…</div>
      ) : e.kind === "appele" ? (
        <div className="we-appele-msg">
          🔔 Votre numéro est appelé !<br />
          <small>Présentez-vous immédiatement au siège</small>
        </div>
      ) : e.kind === "done" ? (
        <div className="we-validation-msg">Ce ticket est clôturé.</div>
      ) : (
        <div className={`we-estimate we-estimate--${e.urgency}`}>
          <div className="we-estimate__row">
            <div className="we-est-block">
              <span className="we-est-block__val">{e.position}</span>
              <span className="we-est-block__label">devant vous</span>
            </div>
            <div className="we-est-sep" />
            <div className="we-est-block">
              <span className="we-est-block__val">~{e.minutes} min</span>
              <span className="we-est-block__label">attente estimée</span>
            </div>
            <div className="we-est-sep" />
            <div className="we-est-block">
              <span className="we-est-block__val">{e.heurePassage}</span>
              <span className="we-est-block__label">heure passage</span>
            </div>
          </div>
          {e.total > 0 && (
            <div className="we-progress">
              <div className="we-progress__track">
                <div className="we-progress__fill" style={{ width: `${Math.max(4, ((e.total - e.position) / e.total) * 100)}%` }} />
              </div>
              <span className="we-progress__label">{e.position} / {e.total} en file</span>
            </div>
          )}
          <div className={`we-urgency-msg we-urgency-msg--${e.urgency}`}>
            {e.urgency === "now"  && "🟢 Vous êtes le prochain !"}
            {e.urgency === "soon" && "🟡 Préparez-vous, bientôt votre tour"}
            {e.urgency === "mid"  && "🟠 Encore quelques minutes de patience"}
            {e.urgency === "wait" && "🔵 Vous pouvez vous éloigner momentanément"}
          </div>
        </div>
      )}

      <div className={`${P}-ticket-emis__meta`}>
        <div className={`${P}-ticket-meta-item`}>
          <div className={`${P}-ticket-meta-item__label`}>Émis à</div>
          <div className={`${P}-ticket-meta-item__val`}>{fmtHeure(ticket.createdAt)}</div>
        </div>
      </div>
      <div className={`${P}-ticket-emis__qr`}>
        <div className="we-qr-box">
          <QRCodeSVG
            value={`${window.location.origin}/service/${type}?t=${ticket.numero}`}
            size={112}
            bgColor="rgba(12,12,55,0.95)"
            fgColor="#ffffff"
            level="M"
          />
        </div>
        <div className="we-qr-hint">📱 Scanner pour suivre votre ticket</div>
      </div>
      <div className={`${P}-ticket-emis__actions`}>
        <button className={`${P}-ticket-emis__reset`} onClick={onReset}>↩ Nouveau ticket</button>
        <Link to="/DashbordClient" className={`${P}-ticket-emis__dashboard`}>Voir mes tickets →</Link>
      </div>
    </div>
  );
}

export default function ServicePage({ type }) {
  const cfg = CONFIG[type] ?? CONFIG.coiffure;
  const P = cfg.prefix;

  const vantaRef = useRef(null);
  const vantaInstance = useRef(null);
  const { socketRef } = useSocket();
  const [searchParams] = useSearchParams();
  const urlTicketNum = searchParams.get("t");

  const [entreprises, setEntreprises] = useState([]);
  const [selectedEntId, setSelectedEntId] = useState(null);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [queue, setQueue] = useState([]);
  const [myTicketId, setMyTicketId] = useState(null);
  const [myTicket, setMyTicket] = useState(null);
  const [notification, setNotif] = useState(null);

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

  const notify = (msg, t = "success") => {
    setNotif({ msg, type: t });
    setTimeout(() => setNotif(null), 3000);
  };

  // Réinitialise toute la sélection quand on change de type de page
  useEffect(() => {
    setEntreprises([]); setSelectedEntId(null); setSelectedServiceId(null);
    setQueue([]); setMyTicket(null); setMyTicketId(null);
    api.get(`/entreprises?type=${type}`)
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setEntreprises(arr);
        if (arr.length === 1) setSelectedEntId(arr[0].id);
      })
      .catch(() => {});
  }, [type]);

  const selectedEnt = useMemo(
    () => entreprises.find((e) => e.id === selectedEntId) ?? null,
    [entreprises, selectedEntId]
  );
  const services = selectedEnt?.services ?? [];
  const selectedService = services.find((s) => s.id === selectedServiceId) ?? null;

  const refresh = useCallback(async () => {
    try {
      if (selectedServiceId) {
        const f = await api.get(`/tickets/file/${selectedServiceId}`);
        setQueue(Array.isArray(f) ? f : []);
      }
      if (myTicketId) {
        const mine = await api.get("/tickets/mes-tickets");
        const found = Array.isArray(mine) ? mine.find((t) => t.id === myTicketId) : null;
        if (found) setMyTicket(found);
      }
    } catch { /* silencieux */ }
  }, [selectedServiceId, myTicketId]);

  useEffect(() => {
    refresh();
    const s = socketRef.current;
    const onChange = () => refresh();
    const events = ["ticket:nouveau", "ticket:valide", "ticket:refuse", "ticket:appele", "ticket:traite", "ticket:absent"];
    if (s) events.forEach((e) => s.on(e, onChange));
    const poll = setInterval(refresh, 10000);
    return () => {
      if (s) events.forEach((e) => s.off(e, onChange));
      clearInterval(poll);
    };
  }, [refresh, socketRef]);

  const handleGetTicket = async () => {
    if (!selectedServiceId) { notify("Veuillez sélectionner un service", "warn"); return; }
    try {
      const t = await api.post("/tickets", { serviceId: selectedServiceId });
      socketRef.current?.emit("ticket:nouveau", t);
      setMyTicketId(t.id);
      setMyTicket(t);
      notify(`Ticket ${t.numero} émis avec succès ✓`);
      refresh();
    } catch (err) {
      notify(`Échec : ${err.message}`, "warn");
    }
  };

  const handleReset = () => { setMyTicket(null); setMyTicketId(null); setSelectedServiceId(null); };

  const estimate = useMemo(() => computeEstimate(myTicket, queue), [myTicket, queue]);

  return (
    <div ref={vantaRef} className={`${P}-vanta-wrapper`}>
      <div className="navbar-overlay"><Navbar /></div>
      <div className={`${P}-root`}>
        {notification && <div className={`${P}-toast ${P}-toast--${notification.type}`}>{notification.msg}</div>}
        <header className={`${P}-header`}>
          <div className={`${P}-logo`}><cfg.Icon size={18} style={{ verticalAlign: "-3px", marginRight: 7 }} /><span>{cfg.title}</span></div>
          <div className={`${P}-header__right`}>
            <Link to="/DashbordClient" className={`${P}-header__dash`}>Mon dashboard →</Link>
          </div>
        </header>

        <main className={`${P}-main`}>
          <div className={`${P}-col-left`}>

            {/* Étape 1 : choisir une entreprise */}
            <section className={`${P}-section`}>
              <div className={`${P}-section__title`}>Choisissez un établissement</div>
              <div className={`${P}-section__subtitle`}>
                {entreprises.length === 0 ? `Aucun ${cfg.noun} disponible pour le moment.` : "Sélectionnez l'établissement où vous souhaitez être servi"}
              </div>
              <div className={`${P}-services-grid`}>
                {entreprises.map((ent) => (
                  <button
                    key={ent.id}
                    className={`${P}-service-card ${selectedEntId === ent.id ? `${P}-service-card--selected` : ""}`}
                    onClick={() => { setSelectedEntId(ent.id); setSelectedServiceId(null); setMyTicket(null); setMyTicketId(null); }}
                  >
                    <div className={`${P}-service-card__icon`}>{ent.avatar ? <img src={ent.avatar} alt={ent.nom} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} /> : <MdStorefront size={28} />}</div>
                    <div className={`${P}-service-card__nom`}>{ent.nom}</div>
                    <div className={`${P}-service-card__desc`}>{ent.description || cfg.noun}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* Étape 2 : choisir un service */}
            {selectedEnt && (
              <section className={`${P}-section`}>
                <div className={`${P}-section__title`}>Choisissez un service</div>
                <div className={`${P}-section__subtitle`}>Prestations de {selectedEnt.nom}</div>
                <div className={`${P}-services-grid`}>
                  {services.map((svc) => (
                    <ServiceCard key={svc.id} P={P} service={svc} selected={selectedServiceId === svc.id} onClick={() => setSelectedServiceId(svc.id)} />
                  ))}
                </div>
                <button className={`${P}-get-btn ${!selectedServiceId ? `${P}-get-btn--disabled` : ""}`} onClick={handleGetTicket} disabled={!selectedServiceId}>
                  {selectedServiceId ? `↗ Obtenir un ticket — ${selectedService?.nom}` : "Sélectionnez un service pour continuer"}
                </button>
              </section>
            )}

            {/* File d'attente */}
            {selectedServiceId && (
              <section className={`${P}-section`}>
                <div className={`${P}-section__title`}>File d'attente</div>
                <div className={`${P}-section__subtitle`}>Synchronisé en temps réel</div>
                <div className={`${P}-queue-list`}>
                  {queue.length === 0 && (
                    <div style={{ color: "rgba(255,255,255,.35)", fontSize: ".82rem", padding: "12px 0" }}>Aucun ticket en attente.</div>
                  )}
                  {queue.map((item) => (
                    <QueueRow key={item.id} P={P} item={item} isMyTicket={myTicket?.id === item.id} isScanned={item.numero === urlTicketNum} />
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className={`${P}-col-right`}>
            {myTicket ? (
              <TicketEmis P={P} type={type} ticket={myTicket} service={selectedService ?? services.find((s) => s.id === myTicket.serviceId)} estimate={estimate} onReset={handleReset} />
            ) : (
              <div className={`${P}-ticket-placeholder`}>
                <div className={`${P}-ticket-placeholder__icon`}>◎</div>
                <div className={`${P}-ticket-placeholder__title`}>Votre ticket apparaîtra ici</div>
                <div className={`${P}-ticket-placeholder__sub`}>Choisissez un établissement, un service, puis cliquez sur <em>Obtenir un ticket</em></div>
                <div className={`${P}-ghost-ticket`}>
                  <div className={`${P}-ghost-ticket__num`}>?</div>
                  <div className={`${P}-ghost-ticket__line`} />
                  <div className={`${P}-ghost-ticket__line ${P}-ghost-ticket__line--short`} />
                </div>
              </div>
            )}
            <div className={`${P}-legend`}>
              <div className={`${P}-legend__title`}>Légende des statuts</div>
              <div className={`${P}-legend__items`}>
                <div className={`${P}-legend__item`}><span className={`${P}-status-badge ${P}-status-badge--appele`}>Appelé</span><span>Présentez-vous au siège</span></div>
                <div className={`${P}-legend__item`}><span className={`${P}-status-badge ${P}-status-badge--attente`}>En attente</span><span>Patientez, vous serez appelé</span></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
