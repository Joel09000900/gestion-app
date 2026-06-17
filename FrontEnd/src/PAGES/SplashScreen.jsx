import { useEffect, useRef, useState } from "react";

export default function SplashScreen({ onEnter }) {
  const canvasRef = useRef(null);
  const [pct, setPct]           = useState(0);
  const [btnVisible, setBtnVisible] = useState(false);
  const [exiting, setExiting]   = useState(false);

  useEffect(() => {
    const cv  = canvasRef.current;
    const ctx = cv.getContext("2d");
    let animId;

    const pts = Array.from({ length: 90 }, () => ({
      x:  Math.random() * window.innerWidth,
      y:  Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
    }));

    function resize() {
      cv.width  = window.innerWidth;
      cv.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      const W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#12125e";
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(255,255,255,${(1 - d / 130) * 0.18})`;
            ctx.lineWidth   = 0.7;
            ctx.stroke();
          }
        }
      }

      pts.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      });

      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    let current = 0;
    const iv = setInterval(() => {
      current = Math.min(current + 2, 100);
      setPct(current);
      if (current >= 100) {
        clearInterval(iv);
        setTimeout(() => setBtnVisible(true), 200);
      }
    }, 50);
    return () => clearInterval(iv);
  }, []);

  function handleEnter() {
    setExiting(true);
    setTimeout(() => onEnter?.(), 800);
  }

  return (
    <div style={s.wrap}>
      <canvas ref={canvasRef} style={s.canvas} />

      <div style={{ ...s.content, ...(exiting ? s.exiting : {}) }}>

        <div style={s.logoWrap}>
          <div style={s.logoIcon}>
            <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
              <rect x="7"  y="10" width="5" height="18" rx="2.5" fill="white"/>
              <rect x="16" y="6"  width="5" height="26" rx="2.5" fill="white" opacity=".85"/>
              <rect x="25" y="13" width="5" height="13" rx="2.5" fill="white" opacity=".7"/>
              <circle cx="29.5" cy="10" r="3" fill="#4fc3f7"/>
            </svg>
          </div>
          <div style={s.brandName}>
            Jel<span style={s.brandAccent}>oft</span>
          </div>
        </div>

        <p style={s.tagline}>
          <strong style={s.taglineStrong}>Simplifiez l'attente</strong>, améliorez l'expérience<br />
          Optimisez chaque minute de votre temps
        </p>

        <div style={s.divider}>
          <div style={s.divLine}/>
          <div style={s.divDot}/>
          <div style={{ ...s.divLine, ...s.divLineR }}/>
        </div>

        <div style={s.cards}>
          {FEATURES.map((f) => (
            <div key={f.title} style={s.card}>
              <div style={{ ...s.cardIcon, background: f.bg }}>
                {f.icon}
              </div>
              <div>
                <div style={s.cardTitle}>{f.title}</div>
                <div style={s.cardSub}>{f.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={s.progWrap}>
          <div style={s.progRow}>
            <span style={s.progLabel}>INITIALISATION</span>
            <span style={s.progPct}>{pct}%</span>
          </div>
          <div style={s.progTrack}>
            <div style={{ ...s.progFill, width: `${pct}%` }}/>
          </div>
        </div>

        {btnVisible && (
          <button style={s.btn} onClick={handleEnter}
            onMouseEnter={e => Object.assign(e.currentTarget.style, s.btnHover)}
            onMouseLeave={e => Object.assign(e.currentTarget.style, s.btn)}>
            Accéder à Jeloft →
          </button>
        )}
      </div>

      <div style={s.versionBadge}>GESTION DE FILE D'ATTENTE &nbsp;·&nbsp; v1.0</div>

      <style>{KEYFRAMES}</style>
    </div>
  );
}

const FEATURES = [
  {
    title: "Espace Client",
    sub: "Suivi en temps réel",
    bg: "linear-gradient(135deg,#6c63ff,#4fc3f7)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    title: "Entreprise",
    sub: "Gestion des services",
    bg: "linear-gradient(135deg,#4fc3f7,#26c6da)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
  },
  {
    title: "Administration",
    sub: "Analytics & config",
    bg: "linear-gradient(135deg,#ab47bc,#6c63ff)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
      </svg>
    ),
  },
];

const s = {
  wrap:       { position:"relative", width:"100%", height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#12125e", overflow:"hidden", fontFamily:"'Poppins', sans-serif" },
  canvas:     { position:"absolute", inset:0, width:"100%", height:"100%" },
  content:    { position:"relative", zIndex:10, display:"flex", flexDirection:"column", alignItems:"center", gap:16, textAlign:"center", padding:20 },
  exiting:    { animation:"exitAnim .8s ease forwards" },
  logoWrap:   { display:"flex", flexDirection:"column", alignItems:"center", gap:10, opacity:0, animation:"riseIn .7s ease forwards .4s" },
  logoIcon:   { width:80, height:80, borderRadius:"50%", background:"linear-gradient(135deg,#6c63ff,#4fc3f7)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 0 10px rgba(108,99,255,.15),0 0 0 20px rgba(108,99,255,.07)", animation:"iconPulse 3s ease-in-out infinite 1s" },
  brandName:  { fontSize:"clamp(38px,7vw,64px)", fontWeight:800, color:"#fff", letterSpacing:2, lineHeight:1 },
  brandAccent:{ background:"linear-gradient(90deg,#6c63ff,#4fc3f7)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" },
  tagline:    { fontSize:"clamp(13px,2vw,16px)", fontWeight:300, color:"rgba(255,255,255,.65)", letterSpacing:.5, lineHeight:1.7, maxWidth:420, opacity:0, animation:"riseIn .7s ease forwards .8s" },
  taglineStrong:{ color:"rgba(255,255,255,.9)", fontWeight:600 },
  divider:    { display:"flex", alignItems:"center", gap:12, opacity:0, animation:"fadeIn .6s ease forwards 1.2s" },
  divLine:    { width:60, height:1, background:"linear-gradient(90deg,transparent,rgba(108,99,255,.7))" },
  divLineR:   { background:"linear-gradient(90deg,rgba(79,195,247,.7),transparent)" },
  divDot:     { width:6, height:6, borderRadius:"50%", background:"linear-gradient(135deg,#6c63ff,#4fc3f7)" },
  cards:      { display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center", opacity:0, animation:"riseIn .7s ease forwards 1.4s" },
  card:       { background:"linear-gradient(135deg,rgba(79,195,247,.12),rgba(108,99,255,.12))", border:"1px solid rgba(108,99,255,.3)", borderRadius:12, padding:"14px 18px", display:"flex", alignItems:"center", gap:10, backdropFilter:"blur(4px)", minWidth:130 },
  cardIcon:   { width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  cardTitle:  { fontSize:12, fontWeight:600, color:"#fff", letterSpacing:.3 },
  cardSub:    { fontSize:10, color:"rgba(255,255,255,.5)", marginTop:1 },
  progWrap:   { width:280, display:"flex", flexDirection:"column", gap:7, opacity:0, animation:"fadeIn .5s ease forwards 1.9s" },
  progRow:    { display:"flex", justifyContent:"space-between", alignItems:"center" },
  progLabel:  { fontFamily:"'Orbitron', sans-serif", fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.3)" },
  progPct:    { fontFamily:"'Orbitron', sans-serif", fontSize:9, color:"rgba(79,195,247,.8)" },
  progTrack:  { height:3, background:"rgba(255,255,255,.1)", borderRadius:3, overflow:"hidden" },
  progFill:   { height:"100%", background:"linear-gradient(90deg,#6c63ff,#4fc3f7,#26c6da)", borderRadius:3, transition:"width .05s linear" },
  btn:        { padding:"14px 48px", background:"linear-gradient(135deg,#6c63ff,#4fc3f7)", border:"none", borderRadius:30, color:"#fff", fontFamily:"'Poppins', sans-serif", fontSize:14, fontWeight:600, letterSpacing:1, cursor:"pointer", boxShadow:"0 4px 20px rgba(108,99,255,.4)", transition:"all .3s", transform:"translateY(0)", animation:"riseIn .6s ease forwards" },
  btnHover:   { padding:"14px 48px", background:"linear-gradient(135deg,#6c63ff,#4fc3f7)", border:"none", borderRadius:30, color:"#fff", fontFamily:"'Poppins', sans-serif", fontSize:14, fontWeight:600, letterSpacing:1, cursor:"pointer", boxShadow:"0 8px 32px rgba(108,99,255,.6)", transform:"translateY(-2px)", transition:"all .3s" },
  versionBadge:{ position:"absolute", bottom:22, fontFamily:"'Orbitron', sans-serif", fontSize:9, letterSpacing:3, color:"rgba(255,255,255,.15)", zIndex:10 },
};

const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800&family=Orbitron:wght@400;700&display=swap');
  @keyframes riseIn    { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes iconPulse { 0%,100%{box-shadow:0 0 0 10px rgba(108,99,255,.15),0 0 0 20px rgba(108,99,255,.07)} 50%{box-shadow:0 0 0 14px rgba(108,99,255,.22),0 0 0 28px rgba(108,99,255,.1)} }
  @keyframes exitAnim  { 0%{opacity:1;transform:scale(1)} 60%{opacity:1;transform:scale(1.03)} 100%{opacity:0;transform:scale(.96)} }
`;
