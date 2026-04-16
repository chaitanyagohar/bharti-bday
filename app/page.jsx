"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";

// ─── FONTS ───────────────────────────────────────────────────────────────────
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --rose:    #f43f5e;
      --rose-lt: #fb7185;
      --blush:   #fda4af;
      --gold:    #f59e0b;
      --cream:   #fff1f2;
      --ink:     #1a0a10;
      --muted:   #9f6472;
      --bg:      #0d0007;
    }

    body { background: var(--bg); }

    .cormorant { font-family: 'Cormorant Garamond', Georgia, serif; }
    .dm-sans   { font-family: 'DM Sans', system-ui, sans-serif; }

    /* Grain overlay */
    .grain::after {
      content: '';
      position: fixed; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
      pointer-events: none; z-index: 9999;
      opacity: .35;
    }

    /* Particle canvas always behind */
    canvas.particle-canvas { position: fixed; inset: 0; pointer-events: none; }

    /* Scroll snap */
    .snap-container { scroll-snap-type: y mandatory; overflow-y: scroll; height: 100vh; }
    .snap-section   { scroll-snap-align: start; }

    /* Shimmer text */
    @keyframes shimmer {
      0%   { background-position: -200% center; }
      100% { background-position:  200% center; }
    }
    .shimmer-text {
      background: linear-gradient(90deg, #f43f5e 0%, #fda4af 40%, #f59e0b 60%, #f43f5e 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: shimmer 4s linear infinite;
    }

    /* Flame */
    @keyframes flicker {
      0%,100% { transform: scaleY(1) rotate(-2deg); opacity:1; }
      25%     { transform: scaleY(1.1) rotate(2deg); opacity:.9; }
      50%     { transform: scaleY(.95) rotate(-1deg); opacity:.95; }
      75%     { transform: scaleY(1.05) rotate(1.5deg); opacity:1; }
    }
    .flame { animation: flicker 0.4s ease-in-out infinite; transform-origin: bottom center; }

    @keyframes floatUp {
      0%   { transform: translateY(0) scale(1); opacity:1; }
      100% { transform: translateY(-180px) scale(.2); opacity:0; }
    }
    .smoke { animation: floatUp 2s ease-out forwards; }

    /* Slice cut line */
    @keyframes cuttingLine {
      0%   { height: 0; }
      100% { height: 100%; }
    }

    /* Pulse ring */
    @keyframes pulseRing {
      0%   { transform: scale(.95); box-shadow: 0 0 0 0 rgba(244,63,94,.5); }
      70%  { transform: scale(1);   box-shadow: 0 0 0 18px rgba(244,63,94,0); }
      100% { transform: scale(.95); box-shadow: 0 0 0 0 rgba(244,63,94,0); }
    }
    .pulse-ring { animation: pulseRing 2s infinite; }

    @keyframes rise {
      from { opacity:0; transform: translateY(40px); }
      to   { opacity:1; transform: translateY(0); }
    }
    .rise { animation: rise .8s ease forwards; }

    /* Glow */
    .glow { filter: drop-shadow(0 0 14px rgba(244,63,94,.7)); }
  `}</style>
);

const BIRTH = new Date("2001-04-16T00:00:00+05:30"); // important for India time

const pad = (n) => String(n).padStart(2, "0");

const BirthTimer = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // --- CALCULATIONS ---
  let years = now.getFullYear() - BIRTH.getFullYear();

  const thisYearBirthday = new Date(
    now.getFullYear(),
    BIRTH.getMonth(),
    BIRTH.getDate(),
    BIRTH.getHours(),
    BIRTH.getMinutes(),
    BIRTH.getSeconds()
  );

  // adjust if birthday hasn't happened yet this year
  if (now < thisYearBirthday) {
    years--;
  }

  const lastBirthday = new Date(
    now.getFullYear() - (now < thisYearBirthday ? 1 : 0),
    BIRTH.getMonth(),
    BIRTH.getDate(),
    BIRTH.getHours(),
    BIRTH.getMinutes(),
    BIRTH.getSeconds()
  );

  const diff = now - lastBirthday;

  const totalSec = Math.floor(diff / 1000);
  const seconds = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const minutes = totalMin % 60;
  const totalHr = Math.floor(totalMin / 60);
  const hours = totalHr % 24;
  const days = Math.floor(totalHr / 24);

  const units = [
    { label: "Years", value: years },
    { label: "Days", value: days },
    { label: "Hours", value: pad(hours) },
    { label: "Minutes", value: pad(minutes) },
    { label: "Seconds", value: pad(seconds) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9, duration: 0.8 }}
      style={{ marginBottom: 36, textAlign: "center" }}
    >
      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        color: "#9f6472",
        fontSize: 11,
        letterSpacing: 4,
        textTransform: "uppercase",
        marginBottom: 14,
      }}>
        The world got luckier since
      </p>

      <div style={{
        display: "flex",
        gap: 10,
        justifyContent: "center",
        flexWrap: "wrap",
      }}>
        {units.map(({ label, value }) => (
          <div key={label} style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "rgba(244,63,94,.06)",
            border: "1px solid rgba(244,63,94,.18)",
            borderRadius: 14,
            padding: "10px 14px",
            minWidth: 58,
          }}>
            <span style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "1.6rem",
              fontWeight: 300,
              color: "#fff",
            }}>
              {value}
            </span>
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 9,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#9f6472",
              marginTop: 5,
            }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ─── PARTICLES ───────────────────────────────────────────────────────────────
const ParticleCanvas = ({ active }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!active) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width, H = canvas.height;

    const hearts = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: H + 20,
      vx: (Math.random() - .5) * 1.5,
      vy: -(Math.random() * 2 + 1),
      size: Math.random() * 10 + 5,
      alpha: 1,
      color: ["#f43f5e","#fb7185","#fda4af","#f59e0b","#c084fc"][Math.floor(Math.random()*5)],
    }));

    const drawHeart = (ctx, x, y, s, a, col) => {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x - s/2, y - s/2, x - s, y + s/3, x, y + s);
      ctx.bezierCurveTo(x + s, y + s/3, x + s/2, y - s/2, x, y);
      ctx.fill();
      ctx.restore();
    };

    let raf;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      hearts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.alpha -= .004;
        if (p.alpha <= 0) { p.y = H + 20; p.alpha = 1; p.x = Math.random() * W; }
        drawHeart(ctx, p.x, p.y, p.size, p.alpha, p.color);
      });
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return <canvas ref={ref} className="particle-canvas" style={{ zIndex: 1 }} />;
};

// ─── BLOOM ────────────────────────────────────────────────────────────────────
const PetalBloom = ({ onComplete }) => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width, H = canvas.height;
    const N = 900, scale = 18;
    const colors = ["#f43f5e","#fb7185","#fda4af","#f59e0b","#c084fc","#f87171"];

    const petals = Array.from({ length: N }, (_, i) => {
      const t = (i / N) * Math.PI * 2;
      return {
        tx: W/2 + scale * (16 * Math.sin(t) ** 3) * (.5 + Math.random()*.5),
        ty: H/2 + scale * -(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t)) * (.5 + Math.random()*.5),
        x: W/2 + (Math.random()-0.5)*W,
        y: H + Math.random()*200,
        size: Math.random()*5+6,
        color: colors[i % colors.length],
        progress: 0,
        delay: i * 0.004,
        rotation: t,
      };
    });

    const lerp = (a, b, t) => a + (b - a) * t;
    const drawHeart = (ctx, x, y, s, col, rot) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      ctx.fillStyle = col; ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-s/2,-s/2,-s,s/3,0,s);
      ctx.bezierCurveTo(s,s/3,s/2,-s/2,0,0);
      ctx.fill(); ctx.restore();
    };

    let raf;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0d0007"; ctx.fillRect(0, 0, W, H);
      petals.forEach(p => {
        if (p.delay > 0) { p.delay -= .016; return; }
        p.progress = Math.min(1, p.progress + .02);
        const ex = lerp(p.x, p.tx, p.progress);
        const ey = lerp(p.y, p.ty, p.progress);
        drawHeart(ctx, ex, ey, p.size * p.progress, p.color, p.rotation);
      });
      raf = requestAnimationFrame(tick);
    };
    tick();
    const t = setTimeout(onComplete, 6500);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [onComplete]);
  return <canvas ref={ref} style={{ position:"fixed", inset:0, zIndex:50 }} />;
};

const CakeScene = ({ onCut }: { onCut: () => void }) => {
  const [phase, setPhase] = useState<"idle" | "cutting" | "cut">("idle");
  const [candleBlown, setCandleBlown] = useState(false);
  const [cuttingPct, setCuttingPct] = useState(0);
  const [showWish, setShowWish] = useState(false);

  const cutRef = useRef<HTMLDivElement | null>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);

  // 🎂 Blow candle
  const blowCandle = () => {
    if (candleBlown) return;
    setCandleBlown(true);
    setShowWish(true);
    setTimeout(() => setShowWish(false), 2800);
  };

  // 🔪 START CUT
  const startCut = (e: React.PointerEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    setPhase("cutting");
  };

  // 🔪 MOVE CUT (SMOOTH)
  const moveCut = useCallback((e: PointerEvent) => {
    if (!isDragging.current) return;

    const dy = e.clientY - startY.current;

    let pct = (dy / 180) * 100;
    pct = Math.max(0, Math.min(100, pct));

    // smooth interpolation
    setCuttingPct((prev) => prev + (pct - prev) * 0.2);

    if (pct >= 98) {
      isDragging.current = false;
      setPhase("cut");
      setTimeout(onCut, 700);
    }
  }, [onCut]);

  // 🔪 END CUT
  const endCut = () => {
    if (!isDragging.current) return;

    isDragging.current = false;

    if (phase !== "cut") {
      setCuttingPct(0);
      setPhase("idle");
    }
  };

  // 🎯 POINTER EVENTS (WORKS ON MOBILE + DESKTOP)
  useEffect(() => {
    window.addEventListener("pointermove", moveCut);
    window.addEventListener("pointerup", endCut);

    return () => {
      window.removeEventListener("pointermove", moveCut);
      window.removeEventListener("pointerup", endCut);
    };
  }, [moveCut, phase]);

  const isCut = phase === "cut";

  return (
    <div style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>

      {/* Wish popup */}
      <AnimatePresence>
        {showWish && (
          <motion.div
            initial={{ opacity:0, y:10, scale:.9 }}
            animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:-20 }}
            style={{
              position:"absolute", top:-70, left:"50%", transform:"translateX(-50%)",
              background:"linear-gradient(135deg,#f43f5e,#f59e0b)",
              borderRadius:20, padding:"10px 22px",
              fontFamily:"DM Sans", color:"#fff"
            }}
          >
            ✨ Make a wish, Bharti! ✨
          </motion.div>
        )}
      </AnimatePresence>

      {/* CAKE */}
      <svg width="260" height="200" viewBox="0 0 260 200"
        style={{ cursor: candleBlown ? "default" : "pointer" }}
        onClick={blowCandle}
      >
        <rect x="30" y="120" width="200" height="65" rx="10" fill="#be185d" />
        <rect x="55" y="72" width="150" height="55" rx="9" fill="#e11d48" />
        <rect x="90" y="35" width="80" height="44" rx="8" fill="#f43f5e" />

        {/* candle */}
        <rect x="124" y="14" width="12" height="26" rx="3" fill="#fde68a" />

        {!candleBlown && (
          <circle cx="130" cy="6" r="5" fill="#fbbf24" />
        )}

        {isCut && (
          <line x1="130" y1="0" x2="130" y2="185"
            stroke="#fda4af" strokeWidth="2"
          />
        )}
      </svg>

      {/* KNIFE */}
      {candleBlown && !isCut && (
        <motion.div
          initial={{ opacity:0, y:-20 }}
          animate={{ opacity:1, y:0 }}
        >
          <p style={{ color:"#fda4af", fontSize:13 }}>
            drag the knife down ↓
          </p>

          <div
            ref={cutRef}
            onPointerDown={startCut}
            style={{
              touchAction: "none", // 🔥 mobile fix
              cursor:"ns-resize"
            }}
          >
            <svg width="48" height="130"
              style={{
                transform:`translateY(${cuttingPct * 1.4}px)`,
                transition: isDragging.current ? "none" : "transform .2s ease"
              }}
            >
              <rect x="18" y="0" width="12" height="38" rx="6" fill="#7f1d1d" />
              <path d="M22 42 L26 42 L28 128 L20 128 Z" fill="#d1d5db" />
            </svg>
          </div>
        </motion.div>
      )}

      {!candleBlown && (
        <p style={{ color:"#fda4af", fontSize:13 }}>
          tap flame to blow candle 🕯️
        </p>
      )}

      {isCut && (
        <motion.p
          initial={{ opacity:0 }}
          animate={{ opacity:1 }}
          style={{ color:"#fb7185", fontSize:20 }}
        >
          🎂 Happy Birthday Bharti!
        </motion.p>
      )}
    </div>
  );
};
// ─── STORY DATA ───────────────────────────────────────────────────────────────
const story = [
  { title: "Your Beauty",        text: "25 ki ho gayi ho tum… but your beauty is not just something I see, it's something I feel.",                         media1: "/img-1.jpeg",  media2: "/img-2.jpeg",  layout: "left"  },
  { title: "The Woman You Are",  text: "Tumhari maturity and the way you handle things… makes me fall for you more.",                                        media1: "/img-3.jpeg",  media2: "/img-4.jpeg",  layout: "right" },
  { title: "Always With Me",     text: "Tum paas nahi ho, but you're always there in my thoughts.",                                                          media1: "/img-5.jpeg",  media2: "/img-6.jpeg",  layout: "left"  },
  { title: "Us & Our Talks",     text: "Late night calls and random talks are the best part of my day.",                                                     media1: "/img-7.jpeg",  media2: "/img-8.jpeg",  layout: "right" },
  { title: "The Way You Care",   text: "The way you care and understand things… it means a lot.",                                                            media1: "/img-9.jpeg",  media2: "/img-10.jpeg", layout: "left"  },
  { title: "Lucky Me",           text: "Long distance is tough, but with you, it feels worth it.",                                                           media1: "/img-11.jpeg", media2: "/img-12.jpeg", layout: "final" },
];

// ─── CONFETTI COMPONENT ───────────────────────────────────────────────────────
const TinyConfetti = () => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width, H = canvas.height;
    const pieces = Array.from({ length: 80 }, () => ({
      x: Math.random() * W, y: Math.random() * H - H,
      w: Math.random()*8+4, h: Math.random()*4+3,
      vy: Math.random()*2+1, vx: (Math.random()-.5)*1.5,
      rot: Math.random()*360, drot: (Math.random()-.5)*4,
      color:["#f43f5e","#fb7185","#f59e0b","#c084fc","#34d399","#fda4af"][Math.floor(Math.random()*6)],
    }));
    let raf;
    const tick = () => {
      ctx.clearRect(0,0,W,H);
      pieces.forEach(p => {
        p.y+=p.vy; p.x+=p.vx; p.rot+=p.drot;
        if(p.y>H) { p.y=-10; p.x=Math.random()*W; }
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
        ctx.fillStyle=p.color; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
        ctx.restore();
      });
      raf=requestAnimationFrame(tick);
    };
    tick();
    return ()=>cancelAnimationFrame(raf);
  },[]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:2}} />;
};

// ─── STORY SLIDE ──────────────────────────────────────────────────────────────
const StorySlide = ({ slide, index, total, onNext }) => {
  const isRight = slide.layout === "right";
  const isFinal = slide.layout === "final";

  return (
    <motion.div
      key={index}
      initial={{ opacity:0, y:60 }}
      animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, y:-60 }}
      transition={{ duration:.7, ease:[.22,1,.36,1] }}
      style={{
        minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        padding:"40px 24px", position:"relative",
      }}
    >
      {/* BG gradient blob */}
      <div style={{
        position:"absolute", width:500, height:500, borderRadius:"50%",
        background:"radial-gradient(circle, rgba(244,63,94,.12) 0%, transparent 70%)",
        top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        pointerEvents:"none",
      }}/>

      <div style={{
        display:"grid",
        gridTemplateColumns:"1fr 1fr",
        gap:48, maxWidth:1100, width:"100%", alignItems:"center",
      }}
        className="story-grid"
      >
        {/* Images */}
        <div style={{
          position:"relative", height:460,
          order: isRight ? 2 : 1,
        }}>
          {/* large */}
          <motion.div
            initial={{ opacity:0, x: isRight ? 40 : -40 }}
            animate={{ opacity:1, x:0 }}
            transition={{ delay:.2, duration:.8 }}
            style={{
              position:"absolute", top:0, left:0, width:"72%", height:"72%",
              borderRadius:24, overflow:"hidden",
              boxShadow:"0 32px 64px rgba(0,0,0,.6)",
            }}
          >
            <img src={slide.media1} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,rgba(244,63,94,.1),transparent)" }}/>
          </motion.div>
          {/* small */}
          <motion.div
            initial={{ opacity:0, x: isRight ? -30 : 30, y:20 }}
            animate={{ opacity:1, x:0, y:0 }}
            transition={{ delay:.4, duration:.8 }}
            style={{
              position:"absolute", bottom:0, right:0, width:"52%", height:"52%",
              borderRadius:18, overflow:"hidden",
              border:"3px solid #f43f5e",
              boxShadow:"0 16px 40px rgba(244,63,94,.3)",
            }}
          >
            <img src={slide.media2} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          </motion.div>

          {/* Step badge */}
          <div style={{
            position:"absolute", top:-12, right:isRight ? "auto" : -12, left: isRight ? -12 : "auto",
            width:44, height:44, borderRadius:"50%",
            background:"linear-gradient(135deg,#f43f5e,#f59e0b)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"'DM Sans',sans-serif", color:"#fff", fontSize:13, fontWeight:600,
            boxShadow:"0 4px 16px rgba(244,63,94,.5)",
          }}>
            {String(index+1).padStart(2,"0")}
          </div>
        </div>

        {/* Text */}
        <div style={{ order: isRight ? 1 : 2, padding:"0 8px" }}>
          <motion.p
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            transition={{ delay:.3 }}
            style={{ fontFamily:"'DM Sans',sans-serif", color:"#f43f5e", fontSize:12, letterSpacing:4, textTransform:"uppercase", marginBottom:16 }}
          >
            {String(index+1).padStart(2,"0")} / {String(total).padStart(2,"0")}
          </motion.p>

          <motion.h2
            initial={{ opacity:0, y:20 }}
            animate={{ opacity:1, y:0 }}
            transition={{ delay:.35, duration:.7 }}
            style={{
              fontFamily:"'Cormorant Garamond',serif",
              fontSize: "clamp(2.8rem,5vw,5.5rem)",
              fontWeight:300, lineHeight:1.05,
              color:"#fff", marginBottom:28,
              letterSpacing:"-0.02em",
            }}
          >
            {slide.title}
          </motion.h2>

          <motion.div
            initial={{ width:0 }}
            animate={{ width:60 }}
            transition={{ delay:.5, duration:.6 }}
            style={{ height:2, background:"linear-gradient(90deg,#f43f5e,transparent)", marginBottom:28 }}
          />

          <motion.p
            initial={{ opacity:0, y:16 }}
            animate={{ opacity:1, y:0 }}
            transition={{ delay:.55, duration:.7 }}
            style={{
              fontFamily:"'Cormorant Garamond',serif",
              fontSize:"clamp(1.15rem,2vw,1.5rem)",
              fontStyle:"italic", color:"#fda4af",
              lineHeight:1.7, marginBottom:40,
            }}
          >
            "{slide.text}"
          </motion.p>

          {!isFinal ? (
            <motion.button
              initial={{ opacity:0 }}
              animate={{ opacity:1 }}
              transition={{ delay:.7 }}
              whileHover={{ scale:1.04 }}
              whileTap={{ scale:.97 }}
              onClick={onNext}
              style={{
                display:"inline-flex", alignItems:"center", gap:10,
                padding:"14px 32px",
                background:"transparent",
                border:"1.5px solid rgba(244,63,94,.5)",
                borderRadius:50, cursor:"pointer",
                fontFamily:"'DM Sans',sans-serif",
                color:"#fda4af", fontSize:14, letterSpacing:1,
                transition:"all .3s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background="#f43f5e"; e.currentTarget.style.color="#fff"; e.currentTarget.style.borderColor="#f43f5e"; }}
              onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#fda4af"; e.currentTarget.style.borderColor="rgba(244,63,94,.5)"; }}
            >
              Continue <span style={{fontSize:18}}>→</span>
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity:0, scale:.9 }}
              animate={{ opacity:1, scale:1 }}
              transition={{ delay:.7, type:"spring" }}
              style={{
                display:"inline-block",
                padding:"18px 36px",
                background:"linear-gradient(135deg,#f43f5e,#f59e0b)",
                borderRadius:50,
                fontFamily:"'Cormorant Garamond',serif",
                fontSize:"1.6rem", fontStyle:"italic",
                color:"#fff",
                boxShadow:"0 8px 32px rgba(244,63,94,.4)",
              }}
            >
              I love you, Bharti ❤️
            </motion.div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .story-grid { grid-template-columns: 1fr !important; }
          .story-grid > div { order: unset !important; }
        }
      `}</style>
    </motion.div>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function BhartiBirthdaySite() {
  const [phase, setPhase] = useState("start");   // start | bloom | story
  const [step,  setStep]  = useState(0);
  const [cakeDone, setCakeDone] = useState(false);

  return (
    <>
      <FontLoader />
      <div className="grain" style={{ minHeight:"100vh", background:"var(--bg)", color:"#fff" }}>

        {/* ── START ── */}
        {phase === "start" && (
          <div style={{
            minHeight:"100vh", display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            position:"relative", overflow:"hidden", textAlign:"center", padding:"24px 16px",
          }}>
            {/* Ambient orbs */}
            <div style={{ position:"absolute", top:"10%", left:"15%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(244,63,94,.18),transparent 70%)", pointerEvents:"none" }}/>
            <div style={{ position:"absolute", bottom:"10%", right:"10%", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(245,158,11,.1),transparent 70%)", pointerEvents:"none" }}/>

            <ParticleCanvas active />

            <div style={{ position:"relative", zIndex:5 }}>
              {/* Small date badge */}
              <motion.div
                initial={{ opacity:0, y:-12 }}
                animate={{ opacity:1, y:0 }}
                transition={{ delay:.3 }}
                style={{
                  display:"inline-block", marginBottom:20,
                  padding:"6px 18px", borderRadius:50,
                  border:"1px solid rgba(244,63,94,.3)",
                  fontFamily:"'DM Sans',sans-serif",
                  color:"#f43f5e", fontSize:12, letterSpacing:3, textTransform:"uppercase",
                }}
              >
                A special day ✦
              </motion.div>

              <motion.h1
                initial={{ opacity:0, y:20 }}
                animate={{ opacity:1, y:0 }}
                transition={{ delay:.5, duration:.9 }}
                className="cormorant shimmer-text"
                style={{
                  fontSize:"clamp(3.5rem,10vw,8rem)",
                  fontWeight:300, lineHeight:1, letterSpacing:"-0.03em",
                  marginBottom:12,
                }}
              >
                Happy Birthday
              </motion.h1>

              <motion.h2
                initial={{ opacity:0 }}
                animate={{ opacity:1 }}
                transition={{ delay:.8 }}
                className="cormorant"
                style={{
                  fontSize:"clamp(2rem,6vw,4.5rem)",
                  fontWeight:300, fontStyle:"italic",
                  color:"#fda4af", marginBottom:36,
                }}
              >
                Bharti 🌸
              </motion.h2>

              {/* Live birth timer */}
              <BirthTimer />

              {/* Cake */}
              <motion.div
                initial={{ opacity:0, y:30 }}
                animate={{ opacity:1, y:0 }}
                transition={{ delay:1, duration:.8 }}
                style={{ marginBottom:40 }}
              >
                <CakeScene onCut={() => setCakeDone(true)} />
              </motion.div>

              {/* CTA */}
              <AnimatePresence>
                {cakeDone && (
                  <motion.button
                    initial={{ opacity:0, y:20, scale:.9 }}
                    animate={{ opacity:1, y:0, scale:1 }}
                    transition={{ type:"spring", bounce:.4 }}
                    className="pulse-ring"
                    onClick={() => { setPhase("bloom"); }}
                    style={{
                      display:"inline-flex", alignItems:"center", gap:12,
                      padding:"18px 44px",
                      background:"linear-gradient(135deg,#f43f5e 0%,#f59e0b 100%)",
                      border:"none", borderRadius:50, cursor:"pointer",
                      fontFamily:"'Cormorant Garamond',serif",
                      fontSize:"1.3rem", fontStyle:"italic",
                      color:"#fff", letterSpacing:".5px",
                      boxShadow:"0 8px 32px rgba(244,63,94,.45)",
                    }}
                  >
                    Open Your Surprise ✨
                  </motion.button>
                )}
              </AnimatePresence>

              {!cakeDone && (
                <motion.p
                  initial={{ opacity:0 }}
                  animate={{ opacity:1 }}
                  transition={{ delay:1.4 }}
                  style={{ fontFamily:"'DM Sans',sans-serif", color:"#9f6472", fontSize:13, marginTop:8 }}
                >
                  (cut the cake first to unlock your surprise 🎂)
                </motion.p>
              )}
            </div>
          </div>
        )}

        {/* ── BLOOM ── */}
        {phase === "bloom" && (
          <PetalBloom onComplete={() => setPhase("story")} />
        )}

        {/* ── STORY ── */}
        {phase === "story" && (
          <div style={{ position:"relative" }}>
            <TinyConfetti />
            <AnimatePresence mode="wait">
              <StorySlide
                key={step}
                slide={story[step]}
                index={step}
                total={story.length}
                onNext={() => setStep(s => Math.min(s+1, story.length-1))}
              />
            </AnimatePresence>

            {/* Progress dots */}
            <div style={{
              position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
              display:"flex", gap:8, zIndex:10,
            }}>
              {story.map((_, i) => (
                <div key={i} style={{
                  width: i===step ? 24 : 8, height:8,
                  borderRadius:4,
                  background: i===step ? "#f43f5e" : "rgba(244,63,94,.3)",
                  transition:"all .4s ease",
                  cursor:"pointer",
                }} onClick={() => setStep(i)} />
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
