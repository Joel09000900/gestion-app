import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as THREE from "three";
import NET from "vanta/dist/vanta.net.min";
import { Link } from "react-router-dom";
import Navbar from "../Navbar/Navbar";
import { useSocket } from "../../context/SocketContext";
import { api } from "../../api";
import "./PAdmin.css";

// Statuts DB (majuscules) → libellé + classe CSS pour l'affichage admin
const STATUT_META = {
  TRAITE:                { cls: "traite",  text: "✓ Traité" },
  ABSENT:                { cls: "absent",  text: "⊘ Absent" },
  ATTENTE:               { cls: "attente", text: "⏳ Attente" },
  APPELE:                { cls: "attente", text: "🔔 Appelé" },
  EN_ATTENTE_VALIDATION: { cls: "attente", text: "⏳ Validation" },
};

function fmtHeure(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ── Composants UI ─────────────────────────────────────── */

function KpiCard({ value, label, delta, deltaType, accentColor }) {
  return (
    <div className="ad-kpi-card" style={{ "--kpi-accent": accentColor }}>
      <div className="ad-kpi-card__stripe" />
      <div className="ad-kpi-val">{value}</div>
      <div className="ad-kpi-label">{label}</div>
      {delta && (
        <div className={`ad-kpi-delta ad-kpi-delta--${deltaType}`}>
          {deltaType === "up" ? "↑" : deltaType === "down" ? "↓" : "→"} {delta}
        </div>
      )}
    </div>
  );
}

function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.val), 1);
  return (
    <div className="ad-barchart">
      <div className="ad-barchart__bars">
        {data.map((d, i) => (
          <div key={i} className="ad-barchart__col">
            <div className="ad-barchart__bar-wrap">
              <div
                className={`ad-barchart__bar ${d.projected ? "ad-barchart__bar--proj" : ""}`}
                style={{ height: `${(d.val / max) * 100}%` }}
              >
                <div className="ad-barchart__bar-tooltip">{d.val}</div>
              </div>
            </div>
            <div className="ad-barchart__label">{d.heure}</div>
          </div>
        ))}
      </div>
      <div className="ad-barchart__legend">
        <span className="ad-legend-item"><span className="ad-legend-dot ad-legend-dot--light" /> Réel</span>
        <span className="ad-legend-item"><span className="ad-legend-dot ad-legend-dot--proj" /> Projection</span>
      </div>
    </div>
  );
}

function DonutChart({ segments }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const r = 58;
  const cx = 80;
  const cy = 80;
  const stroke = 18;
  const circumference = 2 * Math.PI * r;

  const arcs = useMemo(() => {
    let offset = 0;
    return segments.map((seg) => {
      const dash = total > 0 ? (seg.value / total) * circumference : 0;
      const arc = { ...seg, dash, gap: circumference - dash, offset };
      offset += dash;
      return arc;
    });
  }, [segments, total, circumference]);

  if (total === 0) {
    return (
      <div className="ad-donut-empty">
        Aucun ticket enregistré
      </div>
    );
  }

  return (
    <div className="ad-donut-wrap">
      <svg viewBox="0 0 160 160" className="ad-donut-svg">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth={stroke}
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={circumference / 4 - arc.offset}
            style={{ transition: "stroke-dasharray 0.7s ease" }}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize="26" fontWeight="800"
          style={{ fontFamily: "'Syne', sans-serif" }}>{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="9.5">
          tickets total
        </text>
      </svg>
      <div className="ad-donut-legend">
        {segments.map((seg) => (
          <div key={seg.label} className="ad-donut-leg-item">
            <span className="ad-donut-leg-dot" style={{ background: seg.color }} />
            <span className="ad-donut-leg-label">{seg.label}</span>
            <span className="ad-donut-leg-val">{seg.value}</span>
            <span className="ad-donut-leg-pct">
              {total > 0 ? Math.round((seg.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RateGauge({ label, value, color }) {
  return (
    <div className="ad-gauge">
      <div className="ad-gauge__header">
        <span className="ad-gauge__label">{label}</span>
        <span className="ad-gauge__val" style={{ color }}>{value}%</span>
      </div>
      <div className="ad-gauge__track">
        <div
          className="ad-gauge__fill"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

function TicketRow({ ticket }) {
  const meta = STATUT_META[ticket.statut] ?? { cls: "attente", text: ticket.statut };
  return (
    <div className="ad-ticket-row">
      <span className="ad-ticket-num">{ticket.numero}</span>
      <span className="ad-ticket-service">{ticket.service?.nom ?? "—"}</span>
      <span className="ad-ticket-agent">{ticket.service?.entreprise?.nom ?? "—"}</span>
      <span className={`ad-ticket-statut ad-ticket-statut--${meta.cls}`}>{meta.text}</span>
      <span className="ad-ticket-heure">{fmtHeure(ticket.createdAt)}</span>
    </div>
  );
}

/* ── Page principale ───────────────────────────────────── */

export default function PAdmin() {
  const vantaRef = useRef(null);
  const vantaInstance = useRef(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [now, setNow] = useState("");
  const { socketRef } = useSocket();
  const [tickets, setTickets] = useState([]);

  const refresh = useCallback(() => {
    return api.get("/tickets/all")
      .then((data) => setTickets(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Chargement initial + temps réel (socket) + polling de secours
  useEffect(() => {
    refresh();
    const s = socketRef.current;
    const onChange = () => refresh();
    const events = ["ticket:nouveau", "ticket:valide", "ticket:refuse", "ticket:appele", "ticket:traite", "ticket:absent"];
    if (s) events.forEach((e) => s.on(e, onChange));
    const poll = setInterval(refresh, 12000);
    return () => {
      if (s) events.forEach((e) => s.off(e, onChange));
      clearInterval(poll);
    };
  }, [refresh, socketRef]);

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
    const tick = () => {
      const d = new Date();
      setNow(
        d.toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" }) +
        " · " + String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0")
      );
    };
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  /* ── Métriques (statuts DB en majuscules) ── */
  const total        = tickets.length;
  const nbTraites    = tickets.filter((t) => t.statut === "TRAITE").length;
  const nbAbsents    = tickets.filter((t) => t.statut === "ABSENT").length;
  const nbEnAttente  = tickets.filter((t) => t.statut === "ATTENTE").length;
  const nbAppeles    = tickets.filter((t) => t.statut === "APPELE").length;
  const nbValidation = tickets.filter((t) => t.statut === "EN_ATTENTE_VALIDATION").length;
  const liveCount    = nbEnAttente + nbAppeles;

  const tauxTraitement = total > 0 ? Math.round((nbTraites / total) * 100) : 0;
  const tauxAbsence    = total > 0 ? Math.round((nbAbsents / total) * 100) : 0;

  // Attente moyenne réelle = durée émission → traité, moyennée sur les tickets traités
  const avgWaitMin = useMemo(() => {
    const done = tickets.filter((t) => t.statut === "TRAITE" && t.createdAt && t.updatedAt);
    if (done.length === 0) return null;
    const totalMs = done.reduce((sum, t) => sum + (new Date(t.updatedAt) - new Date(t.createdAt)), 0);
    return Math.max(0, Math.round(totalMs / done.length / 60000));
  }, [tickets]);

  const recentTickets = [...tickets].reverse().slice(0, 8);

  /* Répartition par établissement */
  const serviceStats = Object.entries(
    tickets.reduce((acc, t) => {
      const key = t.service?.entreprise?.nom ?? "Autre";
      if (!acc[key]) acc[key] = { nom: key, traites: 0, enAttente: 0, absents: 0 };
      if (t.statut === "TRAITE")                            acc[key].traites++;
      if (t.statut === "ABSENT")                            acc[key].absents++;
      if (t.statut === "ATTENTE" || t.statut === "APPELE")  acc[key].enAttente++;
      return acc;
    }, {})
  ).map(([, v]) => v);

  /* ── Données horaires réelles depuis les tickets ── */
  const hourlyData = useMemo(() => {
    const counts = {};
    tickets.forEach((t) => {
      const d = new Date(t.createdAt);
      if (!Number.isNaN(d.getTime())) {
        const h = d.getHours();
        counts[h] = (counts[h] || 0) + 1;
      }
    });

    const currentHour = new Date().getHours();
    return Array.from({ length: 12 }, (_, i) => {
      const h = i + 7;
      return {
        heure: `${h}h`,
        val: counts[h] ?? 0,
        projected: h > currentHour,
      };
    });
  }, [tickets]);

  /* Segments donut */
  const donutSegments = [
    { label: "Traités",    value: nbTraites,    color: "#00b06e" },
    { label: "En attente", value: nbEnAttente,  color: "#f59e0b" },
    { label: "Appelés",    value: nbAppeles,    color: "#1a6bff" },
    { label: "Absents",    value: nbAbsents,    color: "#ef4444" },
    { label: "Validation", value: nbValidation, color: "#8b5cf6" },
  ];

  /* ── Export rapport ── */
  const downloadRapport = () => {
    const d = new Date();
    const dateStr  = d.toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });
    const heureStr = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;

    let txt = `╔══════════════════════════════════╗\n`;
    txt    += `║        RAPPORT JELOFT            ║\n`;
    txt    += `╚══════════════════════════════════╝\n\n`;
    txt    += `Date   : ${dateStr}\nHeure  : ${heureStr}\n\n`;
    txt    += `── RÉSUMÉ ─────────────────────────\n`;
    txt    += `Tickets émis    : ${total}\n`;
    txt    += `Traités         : ${nbTraites} (${tauxTraitement}%)\n`;
    txt    += `Absents         : ${nbAbsents} (${tauxAbsence}%)\n`;
    txt    += `En attente      : ${liveCount}\n\n`;

    if (serviceStats.length > 0) {
      txt  += `── PAR SERVICE ────────────────────\n`;
      serviceStats.forEach((s) => {
        txt += `${s.nom.padEnd(22)}: ${s.traites} traités, ${s.enAttente} en att., ${s.absents} absents\n`;
      });
      txt  += `\n`;
    }

    if (tickets.length > 0) {
      txt  += `── JOURNAL DES TICKETS ────────────\n`;
      [...tickets].reverse().forEach((t) => {
        const meta = STATUT_META[t.statut] ?? { text: t.statut };
        const svc  = t.service?.nom ? ` — ${t.service.nom}` : "";
        const ent  = t.service?.entreprise?.nom ? ` @ ${t.service.entreprise.nom}` : "";
        txt += `[${fmtHeure(t.createdAt)}]  ${String(t.numero).padEnd(8)} ${meta.text.padEnd(14)}${svc}${ent}\n`;
      });
    } else {
      txt += `── JOURNAL ────────────────────────\nAucun ticket enregistré.\n`;
    }

    txt += `\n──────────────────────────────────\nGénéré par Jeloft Administration\n`;

    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `rapport-jeloft-${d.toISOString().slice(0,10)}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  const navItems = [
    { id: "overview",   label: "Vue d'ensemble" },
    { id: "analytics",  label: "Analytics" },
    { id: "historique", label: "Historique" },
  ];

  return (
    <div ref={vantaRef} className="ad-vanta-wrapper">
      <div className="navbar-overlay"><Navbar /></div>

      <div className="ad-root">
        {/* ── Sous-nav ── */}
        <nav className="ad-subnav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`ad-subnav-btn ${activeSection === item.id ? "ad-subnav-btn--active" : ""}`}
              onClick={() => setActiveSection(item.id)}
            >
              {item.label}
            </button>
          ))}
          <div className="ad-header__right">
            <div className="ad-live-badge">
              <span className="ad-live-dot" />{liveCount} en attente
            </div>
            <div className="ad-date-chip">{now}</div>
            <Link to="/Service2" className="ad-rapport-btn" title="Choisir un service et prendre un ticket comme un client">
              🎫 Prendre un ticket
            </Link>
            <button className="ad-rapport-btn" onClick={downloadRapport} title="Télécharger le rapport">
              ⬇ Rapport
            </button>
          </div>
        </nav>

        <main className="ad-main">

          {/* ── VUE D'ENSEMBLE ── */}
          {activeSection === "overview" && (
            <div className="ad-section" key="overview">
              <div className="ad-kpi-row">
                <KpiCard value={nbTraites}  label="Tickets traités"      delta={`${total} émis au total`}   deltaType="up"      accentColor="#e8460a" />
                <KpiCard value={avgWaitMin != null ? `${avgWaitMin} min` : "—"} label="Attente moyenne" delta={avgWaitMin != null ? `sur ${nbTraites} traités` : "Aucun ticket traité"} deltaType="neutral" accentColor="#1a6bff" />
                <KpiCard value={nbAbsents}  label="Absents"               delta={`${tauxAbsence}% du total`} deltaType="down"    accentColor="#ef4444" />
                <KpiCard value={liveCount}  label="En attente maintenant" delta="Temps réel"                 deltaType="neutral" accentColor="#f59e0b" />
              </div>

              <div className="ad-mid-grid">
                <div className="ad-panel">
                  <div className="ad-panel__title">Tickets / heure — Aujourd'hui</div>
                  <BarChart data={hourlyData} />
                </div>
                <div className="ad-panel">
                  <div className="ad-panel__title">Répartition par service</div>
                  {serviceStats.length === 0 ? (
                    <div style={{ color:"rgba(255,255,255,.35)", fontSize:".82rem", paddingTop:"8px" }}>
                      Aucun ticket émis pour le moment.
                    </div>
                  ) : (
                    <div className="ad-svc-list">
                      {serviceStats.map((svc, i) => {
                        const maxT = Math.max(...serviceStats.map((s) => s.traites), 1);
                        const pct  = Math.round((svc.traites / maxT) * 100);
                        const colors = ["#e8460a","#1a6bff","#00b06e","#f59e0b","#8b7cf8","#f07ab0","#5de0d8"];
                        const col = colors[i % colors.length];
                        return (
                          <div key={svc.nom} className="ad-svc-row">
                            <div className="ad-svc-row__left">
                              <span className="ad-svc-dot" style={{ background: col }} />
                              <div>
                                <div className="ad-svc-name">{svc.nom}</div>
                                <div className="ad-svc-bar-wrap">
                                  <div className="ad-svc-bar" style={{ width:`${pct}%`, background: col }} />
                                </div>
                              </div>
                            </div>
                            <div className="ad-svc-row__stats">
                              <div className="ad-svc-stat"><span className="ad-svc-stat__val">{svc.enAttente}</span><span className="ad-svc-stat__label">En att.</span></div>
                              <div className="ad-svc-stat"><span className="ad-svc-stat__val">{svc.traites}</span><span className="ad-svc-stat__label">Traités</span></div>
                              <div className="ad-svc-stat"><span className="ad-svc-stat__val ad-svc-stat__val--muted">{svc.absents}</span><span className="ad-svc-stat__label">Absents</span></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="ad-panel">
                <div className="ad-panel__title">Activité récente — tous services</div>
                {recentTickets.length === 0 ? (
                  <div style={{ color:"rgba(255,255,255,.35)", fontSize:".82rem" }}>
                    Aucun ticket enregistré. Les tickets apparaîtront ici dès qu'un client en prendra un.
                  </div>
                ) : (
                  <>
                    <div className="ad-tickets-list-header">
                      <span>Numéro</span><span>Service</span><span>Source</span><span>Statut</span><span>Heure</span>
                    </div>
                    <div className="ad-tickets-list">
                      {recentTickets.map((t) => <TicketRow key={t.id} ticket={t} />)}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {activeSection === "analytics" && (
            <div className="ad-section" key="analytics">

              {/* KPI analytics */}
              <div className="ad-kpi-row" style={{ marginBottom: 20 }}>
                <KpiCard value={total}              label="Total tickets émis"     delta="Depuis le début"              deltaType="neutral" accentColor="#8b5cf6" />
                <KpiCard value={`${tauxTraitement}%`} label="Taux de traitement"   delta={`${nbTraites} traités`}       deltaType="up"      accentColor="#00b06e" />
                <KpiCard value={`${tauxAbsence}%`}  label="Taux d'absence"         delta={`${nbAbsents} absents`}       deltaType="down"    accentColor="#ef4444" />
                <KpiCard value={liveCount}           label="Actifs maintenant"      delta={`${nbValidation} en attente validation`} deltaType="neutral" accentColor="#f59e0b" />
              </div>

              {/* Donut + Taux */}
              <div className="ad-analytics-top">
                <div className="ad-panel">
                  <div className="ad-panel__title">Distribution des statuts</div>
                  <DonutChart segments={donutSegments} />
                </div>

                <div className="ad-panel">
                  <div className="ad-panel__title">Indicateurs de performance</div>
                  <div className="ad-gauges">
                    <RateGauge label="Taux de traitement"  value={tauxTraitement} color="#00b06e" />
                    <RateGauge label="Taux d'absence"      value={tauxAbsence}    color="#ef4444" />
                    <RateGauge
                      label="Tickets actifs"
                      value={total > 0 ? Math.round((liveCount / total) * 100) : 0}
                      color="#f59e0b"
                    />
                    <RateGauge
                      label="En attente de validation"
                      value={total > 0 ? Math.round((nbValidation / total) * 100) : 0}
                      color="#8b5cf6"
                    />
                  </div>

                  <div className="ad-perf-summary">
                    <div className="ad-perf-row">
                      <span className="ad-perf-label">Tickets traités aujourd'hui</span>
                      <span className="ad-perf-val" style={{ color:"#00b06e" }}>{nbTraites}</span>
                    </div>
                    <div className="ad-perf-row">
                      <span className="ad-perf-label">Temps d'attente estimé</span>
                      <span className="ad-perf-val">~{liveCount > 0 ? liveCount * 7 : 0} min</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bar chart horaire réel */}
              <div className="ad-panel">
                <div className="ad-panel__title">
                  Distribution horaire des tickets — données réelles
                  <span className="ad-panel__subtitle"> (basé sur les tickets émis)</span>
                </div>
                <BarChart data={hourlyData} />
              </div>

              {/* Tableau performance par service */}
              <div className="ad-panel">
                <div className="ad-panel__title">Performance par service</div>
                {serviceStats.length === 0 ? (
                  <div style={{ color:"rgba(255,255,255,.35)", fontSize:".82rem" }}>
                    Aucune donnée de service disponible.
                  </div>
                ) : (
                  <div className="ad-perf-table">
                    <div className="ad-perf-table__head">
                      <span>Service</span>
                      <span>Total</span>
                      <span>Traités</span>
                      <span>Absents</span>
                      <span>En attente</span>
                      <span>Taux traitement</span>
                    </div>
                    {serviceStats.map((svc) => {
                      const svcTotal = svc.traites + svc.absents + svc.enAttente;
                      const taux = svcTotal > 0 ? Math.round((svc.traites / svcTotal) * 100) : 0;
                      return (
                        <div key={svc.nom} className="ad-perf-table__row">
                          <span className="ad-perf-table__name">{svc.nom}</span>
                          <span>{svcTotal}</span>
                          <span style={{ color:"#00b06e", fontWeight:600 }}>{svc.traites}</span>
                          <span style={{ color:"#ef4444" }}>{svc.absents}</span>
                          <span style={{ color:"#f59e0b" }}>{svc.enAttente}</span>
                          <span>
                            <div className="ad-taux-wrap">
                              <div className="ad-taux-bar" style={{ width:`${taux}%` }} />
                              <span className="ad-taux-val">{taux}%</span>
                            </div>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ── HISTORIQUE ── */}
          {activeSection === "historique" && (
            <div className="ad-section" key="historique">
              <div className="ad-panel">
                <div className="ad-panel__title" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span>Historique complet — Tous services ({tickets.length} tickets)</span>
                  <button
                    className="ad-rapport-btn"
                    onClick={refresh}
                    style={{ fontSize:".72rem", padding:"5px 12px" }}
                  >
                    ↻ Rafraîchir
                  </button>
                </div>
                {tickets.length === 0 ? (
                  <div style={{ color:"rgba(255,255,255,.35)", fontSize:".82rem" }}>
                    Aucun ticket enregistré pour le moment.
                  </div>
                ) : (
                  <>
                    <div className="ad-tickets-list-header">
                      <span>Numéro</span><span>Service</span><span>Source</span><span>Statut</span><span>Heure</span>
                    </div>
                    <div className="ad-tickets-list">
                      {[...tickets].reverse().map((t) => <TicketRow key={t.id} ticket={t} />)}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
