"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── FONTS ────────────────────────────────────────────────────────────────────
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --rose:#f43f5e; --rose-lt:#fb7185; --blush:#fda4af;
      --gold:#f59e0b; --ink:#1a0a10; --muted:#9f6472; --bg:#0d0007;
    }
    body { background: var(--bg); }
    .cormorant { font-family: 'Cormorant Garamond', Georgia, serif; }
    .dm-sans   { font-family: 'DM Sans', system-ui, sans-serif; }
    .grain::after {
      content:''; position:fixed; inset:0;
      background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
      pointer-events:none; z-index:9999; opacity:.35;
    }
    canvas.particle-canvas { position:fixed; inset:0; pointer-events:none; }
    @keyframes shimmer {
      0%  { background-position:-200% center; }
      100%{ background-position: 200% center; }
    }
    .shimmer-text {
      background:linear-gradient(90deg,#f43f5e 0%,#fda4af 40%,#f59e0b 60%,#f43f5e 100%);
      background-size:200% auto;
      -webkit-background-clip:text; -webkit-text-fill-color:transparent;
      animation:shimmer 4s linear infinite;
    }
    @keyframes flicker {
      0%,100%{ transform:scaleY(1) rotate(-2deg); opacity:1; }
      25%    { transform:scaleY(1.1) rotate(2deg); opacity:.9; }
      50%    { transform:scaleY(.95) rotate(-1deg); opacity:.95; }
      75%    { transform:scaleY(1.05) rotate(1.5deg); opacity:1; }
    }
    .flame { animation:flicker .4s ease-in-out infinite; transform-origin:bottom center; }
    @keyframes floatUp {
      0%  { transform:translateY(0) scale(1); opacity:1; }
      100%{ transform:translateY(-180px) scale(.2); opacity:0; }
    }
    .smoke { animation:floatUp 2s ease-out forwards; }
    @keyframes pulseRing {
      0%  { transform:scale(.95); box-shadow:0 0 0 0 rgba(244,63,94,.5); }
      70% { transform:scale(1);   box-shadow:0 0 0 18px rgba(244,63,94,0); }
      100%{ transform:scale(.95); box-shadow:0 0 0 0 rgba(244,63,94,0); }
    }
    .pulse-ring { animation:pulseRing 2s infinite; }
    @keyframes bar1 { 0%,100%{height:6px}  50%{height:18px} }
    @keyframes bar2 { 0%,100%{height:14px} 50%{height:5px}  }
    @keyframes bar3 { 0%,100%{height:9px}  33%{height:18px} 66%{height:4px} }
    .mbar1 { animation:bar1 .7s ease-in-out infinite; }
    .mbar2 { animation:bar2 .5s ease-in-out infinite; }
    .mbar3 { animation:bar3 .9s ease-in-out infinite; }
    /* CRITICAL: Prevent native scroll on the knife drag element */
    .knife-zone {
      touch-action: none;
      -webkit-user-select: none;
      user-select: none;
    }
  `}</style>
);

// ─── AUDIO ENGINE (Web Audio API — zero external files) ───────────────────────
const Snd = {
  _ctx: null,
  _ambient: false,
  _ambientTimer: null,
  _bgGain: null,

  ctx() {
    if (!this._ctx)
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this._ctx.state === "suspended") this._ctx.resume();
    return this._ctx;
  },

  _reverb(ctx, dur = 1.8) {
    const conv = ctx.createConvolver();
    const len  = ctx.sampleRate * dur;
    const buf  = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.8);
    }
    conv.buffer = buf;
    return conv;
  },

  startAmbient() {
    if (this._ambient) return;
    this._ambient = true;
    const ctx  = this.ctx();
    const gain = ctx.createGain();
    gain.gain.value = 0.07;
    gain.connect(ctx.destination);
    this._bgGain = gain;
    const rev = this._reverb(ctx, 2.2);
    rev.connect(gain);

    const chords = [
      [261.63, 329.63, 392.00],
      [293.66, 349.23, 440.00],
      [349.23, 440.00, 523.25],
      [392.00, 493.88, 587.33],
    ];
    let idx = 0;
    const tick = () => {
      if (!this._ambient) return;
      chords[idx++ % chords.length].forEach(freq => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine"; o.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.6);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.8);
        o.connect(g); g.connect(rev);
        o.start(); o.stop(ctx.currentTime + 3);
      });
      this._ambientTimer = setTimeout(tick, 3000);
    };
    tick();
  },

  stopAmbient() {
    this._ambient = false;
    clearTimeout(this._ambientTimer);
    if (this._bgGain && this._ctx)
      this._bgGain.gain.linearRampToValueAtTime(0, this._ctx.currentTime + 1.2);
  },

  playSlice() {
    try {
      const ctx  = this.ctx();
      const len  = Math.floor(ctx.sampleRate * 0.32);
      const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src  = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type  = "bandpass"; filt.Q.value = 0.7;
      filt.frequency.setValueAtTime(4000, ctx.currentTime);
      filt.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.32);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.4, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
      src.connect(filt); filt.connect(g); g.connect(ctx.destination);
      src.start(); src.stop(ctx.currentTime + 0.33);
    } catch (_) {}
  },

  playCutDone() {
    try {
      const ctx = this.ctx();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 120;
      o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.18);
      g.gain.setValueAtTime(0.55, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.26);
      setTimeout(() => {
        const b = ctx.createOscillator(), bg = ctx.createGain();
        b.type = "sine"; b.frequency.value = 880;
        bg.gain.setValueAtTime(0.22, ctx.currentTime);
        bg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
        b.connect(bg); bg.connect(ctx.destination);
        b.start(); b.stop(ctx.currentTime + 0.91);
      }, 80);
    } catch (_) {}
  },

  playHappyBirthday(onEnd) {
    try {
      const ctx = this.ctx();
      const N = {
        C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392,
        A4:440, B4:493.88, C5:523.25, D5:587.33, A5:880,
      };
      const mel = [
        [N.C4,.30],[N.C4,.15],[N.D4,.45],[N.C4,.45],[N.F4,.45],[N.E4,.90],
        [N.C4,.30],[N.C4,.15],[N.D4,.45],[N.C4,.45],[N.G4,.45],[N.F4,.90],
        [N.C4,.30],[N.C4,.15],[N.C5,.45],[N.A4,.45],[N.F4,.30],[N.E4,.15],[N.D4,.45],
        [N.A4,.30],[N.A4,.15],[N.G4,.45],[N.F4,.45],[N.G4,.30],[N.F4,.90],
      ];
      const rev  = this._reverb(ctx, 1.4);
      const mast = ctx.createGain();
      mast.gain.value = 0.5;
      mast.connect(ctx.destination);
      rev.connect(mast);

      let t = ctx.currentTime + 0.15, total = 0;
      mel.forEach(([freq, dur]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "triangle"; o.frequency.value = freq;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.5, t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.88);
        o.connect(g); g.connect(rev); o.start(t); o.stop(t + dur);
        // soft harmony fifth
        const h = ctx.createOscillator(), hg = ctx.createGain();
        h.type = "sine"; h.frequency.value = freq * 1.5;
        hg.gain.setValueAtTime(0, t);
        hg.gain.linearRampToValueAtTime(0.1, t + 0.05);
        hg.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.82);
        h.connect(hg); hg.connect(rev); h.start(t); h.stop(t + dur);
        t += dur; total += dur;
      });
      if (onEnd) setTimeout(onEnd, (total + 0.6) * 1000);
    } catch (_) { if (onEnd) onEnd(); }
  },
};

// ─── BIRTH TIMER ──────────────────────────────────────────────────────────────
const BIRTH = new Date("2001-04-16T00:00:00+05:30");
const pad   = n => String(n).padStart(2, "0");

const BirthTimer = () => {
  const [elapsed, setElapsed] = useState(() => Date.now() - BIRTH.getTime());
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - BIRTH.getTime()), 1000);
    return () => clearInterval(id);
  }, []);
  const totalSec  = Math.floor(elapsed / 1000);
  const seconds   = totalSec % 60;
  const totalMin  = Math.floor(totalSec / 60);
  const minutes   = totalMin % 60;
  const totalHr   = Math.floor(totalMin / 60);
  const hours     = totalHr % 24;
  const totalDays = Math.floor(totalHr / 24);
  const years     = Math.floor(totalDays / 365.25);
  const months    = Math.floor((totalDays % 365.25) / 30.44);
  const days      = Math.floor(totalDays % 30.44);
  const units = [
    { label:"Years",   value:years },
    { label:"Months",  value:months },
    { label:"Days",    value:days },
    { label:"Hours",   value:pad(hours) },
    { label:"Minutes", value:pad(minutes) },
    { label:"Seconds", value:pad(seconds), hot:true },
  ];
  return (
    <motion.div
      initial={{ opacity:0, y:18 }} animate={{ opacity:1, y:0 }}
      transition={{ delay:.9, duration:.8 }}
      style={{ marginBottom:32, textAlign:"center" }}
    >
      <p style={{ fontFamily:"'DM Sans',sans-serif", color:"#9f6472",
        fontSize:11, letterSpacing:4, textTransform:"uppercase", marginBottom:14 }}>
        The world got luckier since
      </p>
      <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
        {units.map(({ label, value, hot }) => (
          <div key={label} style={{
            display:"flex", flexDirection:"column", alignItems:"center",
            background:"rgba(244,63,94,.06)", border:"1px solid rgba(244,63,94,.18)",
            borderRadius:12, padding:"10px 12px", minWidth:54,
          }}>
            <span style={{
              fontFamily:"'Cormorant Garamond',serif",
              fontSize: hot ? "1.75rem" : "1.5rem",
              fontWeight:300, lineHeight:1,
              color: hot ? "#fb7185" : "#fff",
              letterSpacing:"-0.02em",
            }}>{value}</span>
            <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:9,
              letterSpacing:2, textTransform:"uppercase", color:"#9f6472", marginTop:5 }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ─── PARTICLES ────────────────────────────────────────────────────────────────
const ParticleCanvas = ({ active }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!active) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const W = canvas.width, H = canvas.height;
    const hearts = Array.from({ length:60 }, () => ({
      x:Math.random()*W, y:H+20, vx:(Math.random()-.5)*1.5, vy:-(Math.random()*2+1),
      size:Math.random()*10+5, alpha:1,
      color:["#f43f5e","#fb7185","#fda4af","#f59e0b","#c084fc"][Math.floor(Math.random()*5)],
    }));
    const drawHeart = (ctx,x,y,s,a,col) => {
      ctx.save(); ctx.globalAlpha=a; ctx.fillStyle=col; ctx.beginPath();
      ctx.moveTo(x,y); ctx.bezierCurveTo(x-s/2,y-s/2,x-s,y+s/3,x,y+s);
      ctx.bezierCurveTo(x+s,y+s/3,x+s/2,y-s/2,x,y); ctx.fill(); ctx.restore();
    };
    let raf;
    const tick = () => {
      ctx.clearRect(0,0,W,H);
      hearts.forEach(p => {
        p.x+=p.vx; p.y+=p.vy; p.alpha-=.004;
        if(p.alpha<=0){ p.y=H+20; p.alpha=1; p.x=Math.random()*W; }
        drawHeart(ctx,p.x,p.y,p.size,p.alpha,p.color);
      });
      raf=requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return <canvas ref={ref} className="particle-canvas" style={{ zIndex:1 }} />;
};

// ─── BLOOM ────────────────────────────────────────────────────────────────────
const PetalBloom = ({ onComplete }) => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const W = canvas.width, H = canvas.height, N = 900, sc = 18;
    const cols = ["#f43f5e","#fb7185","#fda4af","#f59e0b","#c084fc","#f87171"];
    const petals = Array.from({ length:N }, (_,i) => {
      const t = (i/N)*Math.PI*2;
      return {
        tx: W/2 + sc*(16*Math.sin(t)**3)*(.5+Math.random()*.5),
        ty: H/2 + sc*(-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t)))*(.5+Math.random()*.5),
        x: W/2+(Math.random()-.5)*W, y:H+Math.random()*200,
        size:Math.random()*5+6, color:cols[i%cols.length],
        progress:0, delay:i*0.004, rotation:t,
      };
    });
    const lerp=(a,b,t)=>a+(b-a)*t;
    const dh=(ctx,x,y,s,col,rot)=>{
      ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.fillStyle=col; ctx.beginPath();
      ctx.moveTo(0,0); ctx.bezierCurveTo(-s/2,-s/2,-s,s/3,0,s);
      ctx.bezierCurveTo(s,s/3,s/2,-s/2,0,0); ctx.fill(); ctx.restore();
    };
    let raf;
    const tick = () => {
      ctx.clearRect(0,0,W,H); ctx.fillStyle="#0d0007"; ctx.fillRect(0,0,W,H);
      petals.forEach(p => {
        if(p.delay>0){ p.delay-=.016; return; }
        p.progress=Math.min(1,p.progress+.02);
        dh(ctx,lerp(p.x,p.tx,p.progress),lerp(p.y,p.ty,p.progress),p.size*p.progress,p.color,p.rotation);
      });
      raf=requestAnimationFrame(tick);
    };
    tick();
    const t=setTimeout(onComplete,6500);
    return ()=>{ cancelAnimationFrame(raf); clearTimeout(t); };
  }, [onComplete]);
  return <canvas ref={ref} style={{ position:"fixed",inset:0,zIndex:50 }} />;
};

// ─── MUSIC BARS ───────────────────────────────────────────────────────────────
const MusicBars = () => (
  <div style={{ display:"inline-flex", alignItems:"flex-end", gap:3, height:20 }}>
    {["mbar1","mbar2","mbar3"].map(cls=>(
      <div key={cls} className={cls} style={{ width:3, background:"#f43f5e", borderRadius:2, minHeight:4 }}/>
    ))}
  </div>
);

// ─── CAKE ─────────────────────────────────────────────────────────────────────
const CakeScene = ({ onCut }) => {
  const [candleBlown, setCandleBlown] = useState(false);
  const [cuttingPct,  setCuttingPct]  = useState(0);
  const [phase,       setPhase]       = useState("idle");   // idle|cutting|cut
  const [showWish,    setShowWish]    = useState(false);

  const isDragging  = useRef(false);
  const startY      = useRef(0);
  const sliceTimer  = useRef(null);

  const blowCandle = () => {
    if (candleBlown) return;
    setCandleBlown(true); setShowWish(true);
    setTimeout(() => setShowWish(false), 2800);
  };

  const onDragStart = useCallback((e) => {
    // Prevent iOS bounce / scroll
    if (e.cancelable) e.preventDefault();
    isDragging.current = true;
    startY.current = e.touches ? e.touches[0].clientY : e.clientY;
    setPhase("cutting");
    // Start intermittent slice sounds
    Snd.playSlice();
    clearInterval(sliceTimer.current);
    sliceTimer.current = setInterval(() => {
      if (isDragging.current) Snd.playSlice();
      else clearInterval(sliceTimer.current);
    }, 200);
  }, []);

  const onDragMove = useCallback((e) => {
    if (!isDragging.current) return;
    // ↓ THIS is the fix — blocks the iOS page-pull-down / scroll during drag
    if (e.cancelable) e.preventDefault();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dy  = clientY - startY.current;
    const pct = Math.min(100, Math.max(0, (dy / 160) * 100));
    setCuttingPct(pct);
    if (pct >= 98) {
      isDragging.current = false;
      clearInterval(sliceTimer.current);
      Snd.playCutDone();
      setPhase("cut");
      setTimeout(onCut, 900);
    }
  }, [onCut]);

  const onDragEnd = useCallback(() => {
    if (phase === "cut") return;
    isDragging.current = false;
    clearInterval(sliceTimer.current);
    setPhase("idle");
    setCuttingPct(0);
  }, [phase]);

  useEffect(() => {
    // passive:false is mandatory so e.preventDefault() actually works on iOS
    const opts = { passive: false };
    window.addEventListener("mousemove",   onDragMove, opts);
    window.addEventListener("mouseup",     onDragEnd);
    window.addEventListener("touchmove",   onDragMove, opts);
    window.addEventListener("touchend",    onDragEnd);
    window.addEventListener("touchcancel", onDragEnd);
    return () => {
      window.removeEventListener("mousemove",   onDragMove, opts);
      window.removeEventListener("mouseup",     onDragEnd);
      window.removeEventListener("touchmove",   onDragMove, opts);
      window.removeEventListener("touchend",    onDragEnd);
      window.removeEventListener("touchcancel", onDragEnd);
      clearInterval(sliceTimer.current);
    };
  }, [onDragMove, onDragEnd]);

  const isCut = phase === "cut";

  return (
    <div style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
      {/* Wish popup */}
      <AnimatePresence>
        {showWish && (
          <motion.div
            initial={{ opacity:0, y:10, scale:.9 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:-20 }}
            style={{
              position:"absolute", top:-70, left:"50%", transform:"translateX(-50%)",
              background:"linear-gradient(135deg,#f43f5e,#f59e0b)", borderRadius:20,
              padding:"10px 22px", whiteSpace:"nowrap",
              fontFamily:"'DM Sans',sans-serif", color:"#fff", fontSize:15, fontWeight:500,
              boxShadow:"0 8px 30px rgba(244,63,94,.4)", zIndex:10,
            }}
          >✨ Make a wish, Bharti! ✨</motion.div>
        )}
      </AnimatePresence>

      {/* CAKE */}
      <svg width="260" height="200" viewBox="0 0 260 200"
        style={{ overflow:"visible", cursor: candleBlown ? "default" : "pointer" }}
        onClick={blowCandle}>
        <ellipse cx="130" cy="185" rx="110" ry="14" fill="#2a0015"/>
        <ellipse cx="130" cy="183" rx="106" ry="11" fill="#3d0020"/>
        <rect x="30" y="120" width="200" height="65" rx="10" fill="#be185d"/>
        <rect x="30" y="120" width="200" height="18" rx="8" fill="#db2777"/>
        {[50,75,100,125,150,175,200].map((x,i)=><ellipse key={i} cx={x} cy={126} rx={9} ry={12} fill="#fbcfe8" opacity=".9"/>)}
        {[55,90,125,160,195].map((x,i)=><rect key={i} x={x} y={138} width={8} height={28} rx={4} fill="#f9a8d4" opacity=".5"/>)}
        <rect x="55" y="72" width="150" height="55" rx="9" fill="#e11d48"/>
        <rect x="55" y="72" width="150" height="16" rx="7" fill="#f43f5e"/>
        {[72,98,124,150,176].map((x,i)=><ellipse key={i} cx={x} cy={77} rx={8} ry={10} fill="#fbcfe8" opacity=".85"/>)}
        {[70,100,130,160,190].map((x,i)=><circle key={i} cx={x} cy={98} r={4} fill="#fda4af" opacity=".6"/>)}
        <rect x="90" y="35" width="80" height="44" rx="8" fill="#f43f5e"/>
        <rect x="90" y="35" width="80" height="14" rx="6" fill="#fb7185"/>
        {[100,120,140,158].map((x,i)=><ellipse key={i} cx={x} cy={39} rx={7} ry={8} fill="#fbcfe8" opacity=".8"/>)}
        <rect x="124" y="14" width="12" height="26" rx="3" fill="#fde68a"/>
        <rect x="124" y="14" width="12" height="8"  rx="3" fill="#fbbf24"/>
        <line x1="130" y1="6" x2="130" y2="14" stroke="#78350f" strokeWidth="2" strokeLinecap="round"/>
        {!candleBlown ? (
          <g className="flame" style={{ transformOrigin:"130px 8px" }}>
            <ellipse cx="130" cy="6" rx="5" ry="8" fill="#fbbf24" opacity=".95"/>
            <ellipse cx="130" cy="7" rx="3" ry="5" fill="#fef3c7"/>
            <ellipse cx="130" cy="3" rx="4" ry="7" fill="#f97316" opacity=".7"/>
          </g>
        ) : (
          <>
            <line x1="130" y1="6" x2="128" y2="-14" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" opacity=".5" className="smoke"/>
            <line x1="130" y1="6" x2="132" y2="-10" stroke="#6b7280" strokeWidth="1"   strokeLinecap="round" opacity=".4" className="smoke"/>
          </>
        )}
        {isCut && <>
          <polygon points="130,35 90,185 130,185" fill="#9f1239" opacity=".85"/>
          <line x1="130" y1="0" x2="130" y2="185" stroke="#fda4af" strokeWidth="2" strokeDasharray="4 3" opacity=".6"/>
        </>}
        <text x="130" y="106" textAnchor="middle" fontFamily="'Cormorant Garamond',serif"
          fontSize="20" fontWeight="600" fill="#fff" opacity=".9">25</text>
      </svg>

      {/* KNIFE */}
      {candleBlown && !isCut && (
        <motion.div
          initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }}
          style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}
        >
          <p style={{ fontFamily:"'DM Sans',sans-serif", color:"#fda4af", fontSize:13, opacity:.8 }}>
            drag the knife down to cut ↓
          </p>
          <div
            className="knife-zone"
            onMouseDown={onDragStart}
            onTouchStart={onDragStart}
            style={{ position:"relative", cursor:"ns-resize", display:"flex", flexDirection:"column", alignItems:"center" }}
          >
            {/* progress track */}
            <div style={{
              position:"absolute", top:44, left:"50%", transform:"translateX(-50%)",
              width:3, height:128, background:"rgba(244,63,94,.12)", borderRadius:2,
            }}>
              <div style={{
                width:"100%", height:`${cuttingPct}%`,
                background:"linear-gradient(to bottom,#f43f5e,#fda4af)", borderRadius:2,
                transition:"height .04s linear",
              }}/>
            </div>
            {/* knife SVG moves down as pct grows — no CSS transition so it feels 1:1 */}
            <svg
              width="48" height="130" viewBox="0 0 48 130"
              style={{
                filter:"drop-shadow(0 4px 14px rgba(244,63,94,.55))",
                transform:`translateY(${cuttingPct * 1.4}px)`,
                transition:"none",
                willChange:"transform",
              }}
            >
              <rect x="18" y="0"  width="12" height="38" rx="6" fill="#7f1d1d"/>
              <rect x="20" y="4"  width="8"  height="30" rx="4" fill="#991b1b" opacity=".6"/>
              <rect x="10" y="36" width="28" height="6"  rx="3" fill="#6b7280"/>
              <path d="M22 42 L26 42 L28 128 L20 128 Z" fill="#d1d5db"/>
              <path d="M24 42 L26 42 L28 128 L24 128 Z" fill="#9ca3af"/>
              <line x1="23" y1="48" x2="25" y2="120" stroke="#fff" strokeWidth="1" opacity=".5"/>
            </svg>
          </div>
        </motion.div>
      )}

      {!candleBlown && (
        <p style={{ fontFamily:"'DM Sans',sans-serif", color:"#fda4af", fontSize:13, marginTop:4, opacity:.75 }}>
          tap the flame to blow the candle 🕯️
        </p>
      )}

      {isCut && (
        <motion.p
          initial={{ opacity:0, scale:.8 }} animate={{ opacity:1, scale:1 }}
          style={{ fontFamily:"'Cormorant Garamond',serif", color:"#fb7185", fontSize:22, fontStyle:"italic", marginTop:4 }}
        >
          🎂 Happy Birthday Bharti! 🎂
        </motion.p>
      )}
    </div>
  );
};

// ─── STORY DATA ───────────────────────────────────────────────────────────────
const story = [
  { title:"Your Beauty",       text:"25 ki ho gayi ho tum… but your beauty is not just something I see, it's something I feel.",   media1:"/img-1.jpeg",  media2:"/img-2.jpeg",  layout:"left"  },
  { title:"The Woman You Are", text:"Tumhari maturity and the way you handle things… makes me fall for you more.",                 media1:"/img-3.jpeg",  media2:"/img-4.jpeg",  layout:"right" },
  { title:"Always With Me",    text:"Tum paas nahi ho, but you're always there in my thoughts.",                                   media1:"/img-5.jpeg",  media2:"/img-6.jpeg",  layout:"left"  },
  { title:"Us & Our Talks",    text:"Late night calls and random talks are the best part of my day.",                              media1:"/img-7.jpeg",  media2:"/img-8.jpeg",  layout:"right" },
  { title:"The Way You Care",  text:"The way you care and understand things… it means a lot.",                                     media1:"/img-9.jpeg",  media2:"/img-10.jpeg", layout:"left"  },
  { title:"Lucky Me",          text:"Long distance is tough, but with you, it feels worth it.",                                    media1:"/img-11.jpeg", media2:"/img-12.jpeg", layout:"final" },
];

// ─── CONFETTI ─────────────────────────────────────────────────────────────────
const TinyConfetti = () => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const W = canvas.width, H = canvas.height;
    const pieces = Array.from({ length:80 }, () => ({
      x:Math.random()*W, y:Math.random()*H-H,
      w:Math.random()*8+4, h:Math.random()*4+3,
      vy:Math.random()*2+1, vx:(Math.random()-.5)*1.5,
      rot:Math.random()*360, drot:(Math.random()-.5)*4,
      color:["#f43f5e","#fb7185","#f59e0b","#c084fc","#34d399","#fda4af"][Math.floor(Math.random()*6)],
    }));
    let raf;
    const tick = () => {
      ctx.clearRect(0,0,W,H);
      pieces.forEach(p => {
        p.y+=p.vy; p.x+=p.vx; p.rot+=p.drot;
        if(p.y>H){ p.y=-10; p.x=Math.random()*W; }
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
        ctx.fillStyle=p.color; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
      });
      raf=requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  },[]);
  return <canvas ref={ref} style={{ position:"fixed",inset:0,pointerEvents:"none",zIndex:2 }}/>;
};

// ─── STORY SLIDE ──────────────────────────────────────────────────────────────
const StorySlide = ({ slide, index, total, onNext, setPhase }) => {
  const isRight = slide.layout === "right";
  const isFinal = slide.layout === "final";
  return (
    <motion.div
      key={index}
      initial={{ opacity:0, y:60 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-60 }}
      transition={{ duration:.7, ease:[.22,1,.36,1] }}
      style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        padding:"40px 24px", position:"relative" }}
    >
      <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%",
        background:"radial-gradient(circle,rgba(244,63,94,.12) 0%,transparent 70%)",
        top:"50%", left:"50%", transform:"translate(-50%,-50%)", pointerEvents:"none" }}/>

      <div className="story-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
        gap:48, maxWidth:1100, width:"100%", alignItems:"center" }}>

        <div style={{ position:"relative", height:460, order: isRight ? 2 : 1 }}>
          <motion.div initial={{ opacity:0, x: isRight?40:-40 }} animate={{ opacity:1, x:0 }} transition={{ delay:.2, duration:.8 }}
            style={{ position:"absolute", top:0, left:0, width:"72%", height:"72%", borderRadius:24,
              overflow:"hidden", boxShadow:"0 32px 64px rgba(0,0,0,.6)" }}>
            <img src={slide.media1} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,rgba(244,63,94,.1),transparent)" }}/>
          </motion.div>
          <motion.div initial={{ opacity:0, x: isRight?-30:30, y:20 }} animate={{ opacity:1, x:0, y:0 }} transition={{ delay:.4, duration:.8 }}
            style={{ position:"absolute", bottom:0, right:0, width:"52%", height:"52%", borderRadius:18,
              overflow:"hidden", border:"3px solid #f43f5e", boxShadow:"0 16px 40px rgba(244,63,94,.3)" }}>
            <img src={slide.media2} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
          </motion.div>
          <div style={{ position:"absolute", top:-12, [isRight?"left":"right"]:-12, width:44, height:44,
            borderRadius:"50%", background:"linear-gradient(135deg,#f43f5e,#f59e0b)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:"'DM Sans',sans-serif", color:"#fff", fontSize:13, fontWeight:600,
            boxShadow:"0 4px 16px rgba(244,63,94,.5)" }}>
            {String(index+1).padStart(2,"0")}
          </div>
        </div>

        <div style={{ order: isRight ? 1 : 2, padding:"0 8px" }}>
          <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.3 }}
            style={{ fontFamily:"'DM Sans',sans-serif", color:"#f43f5e", fontSize:12,
              letterSpacing:4, textTransform:"uppercase", marginBottom:16 }}>
            {String(index+1).padStart(2,"0")} / {String(total).padStart(2,"0")}
          </motion.p>
          <motion.h2 initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:.35, duration:.7 }}
            style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(2.8rem,5vw,5.5rem)",
              fontWeight:300, lineHeight:1.05, color:"#fff", marginBottom:28, letterSpacing:"-0.02em" }}>
            {slide.title}
          </motion.h2>
          <motion.div initial={{ width:0 }} animate={{ width:60 }} transition={{ delay:.5, duration:.6 }}
            style={{ height:2, background:"linear-gradient(90deg,#f43f5e,transparent)", marginBottom:28 }}/>
          <motion.p initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:.55, duration:.7 }}
            style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(1.15rem,2vw,1.5rem)",
              fontStyle:"italic", color:"#fda4af", lineHeight:1.7, marginBottom:40 }}>
            "{slide.text}"
          </motion.p>
          {!isFinal ? (
            <motion.button initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.7 }}
              whileHover={{ scale:1.04 }} whileTap={{ scale:.97 }}
              onClick={onNext}
              style={{ display:"inline-flex", alignItems:"center", gap:10, padding:"14px 32px",
                background:"transparent", border:"1.5px solid rgba(244,63,94,.5)", borderRadius:50,
                cursor:"pointer", fontFamily:"'DM Sans',sans-serif", color:"#fda4af", fontSize:14,
                letterSpacing:1, transition:"all .3s" }}
              onMouseEnter={e=>{ e.currentTarget.style.background="#f43f5e"; e.currentTarget.style.color="#fff"; e.currentTarget.style.borderColor="#f43f5e"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#fda4af"; e.currentTarget.style.borderColor="rgba(244,63,94,.5)"; }}
            >Continue <span style={{fontSize:18}}>→</span></motion.button>
          ) : (
            <motion.div initial={{ opacity:0, scale:.9 }} animate={{ opacity:1, scale:1 }} transition={{ delay:.7, type:"spring" }}
              style={{ display:"inline-block", padding:"18px 36px",
                background:"linear-gradient(135deg,#f43f5e,#f59e0b)", borderRadius:50,
                fontFamily:"'Cormorant Garamond',serif", fontSize:"1.6rem", fontStyle:"italic",
                color:"#fff", boxShadow:"0 8px 32px rgba(244,63,94,.4)" }}>
              I love you, Bharti ❤️
           
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  onClick={() => setPhase("permission")}
  style={{
    marginTop: "20px",
    padding: "12px 28px",
    background: "transparent",
    border: "1px solid #f59e0b",
    color: "#f59e0b",
    borderRadius: "50px",
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    fontSize: "14px",
    letterSpacing: "2px"
  }}
>
  ASK ME? ✦
</motion.button>
            </motion.div>
          )}
        </div>
      </div>
      <style>{`
        @media(max-width:720px){
          .story-grid{ grid-template-columns:1fr !important; }
          .story-grid > div{ order:unset !important; }
        }
      `}</style>
    </motion.div>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function BhartiBirthdaySite() {
  const [phase,    setPhase]    = useState("start");  // start | songBloom | bloom | story
  const [step,     setStep]     = useState(0);
  const [cakeDone, setCakeDone] = useState(false);
  const [audioOn,  setAudioOn]  = useState(false);
  const audioStarted = useRef(false);
 
  const initAudio = useCallback(() => {
    if (audioStarted.current) return;
    audioStarted.current = true;
    Snd.startAmbient();
    setAudioOn(true);
  }, []);

  const openSurprise = () => {
    Snd.stopAmbient();
    setPhase("songBloom");
    // Happy Birthday song → then bloom → then story
    Snd.playHappyBirthday(() => setPhase("bloom"));
  };

  const afterBloom = () => {
    setPhase("story");
    Snd.startAmbient();
    setAudioOn(true);
  };

  return (
    <>
      <FontLoader/>
      <div className="grain" style={{ minHeight:"100vh", background:"var(--bg)", color:"#fff" }}
        onClick={initAudio}>

        {/* ── START ── */}
        {phase === "start" && (
          <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            position:"relative", overflow:"hidden", textAlign:"center", padding:"24px 16px" }}>
            <div style={{ position:"absolute", top:"10%", left:"15%", width:400, height:400, borderRadius:"50%",
              background:"radial-gradient(circle,rgba(244,63,94,.18),transparent 70%)", pointerEvents:"none" }}/>
            <div style={{ position:"absolute", bottom:"10%", right:"10%", width:300, height:300, borderRadius:"50%",
              background:"radial-gradient(circle,rgba(245,158,11,.1),transparent 70%)", pointerEvents:"none" }}/>
            <ParticleCanvas active/>

            <div style={{ position:"relative", zIndex:5 }}>
              {/* music hint */}
              <div style={{ position:"fixed", top:16, right:20,
                fontFamily:"'DM Sans',sans-serif", color:"#9f6472", fontSize:11, letterSpacing:2,
                display:"flex", alignItems:"center", gap:5 }}>
                {audioOn ? <><MusicBars/><span>playing</span></> : <span style={{opacity:.5}}>tap anywhere for music 🎵</span>}
              </div>

              <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} transition={{ delay:.3 }}
                style={{ display:"inline-block", marginBottom:20, padding:"6px 18px", borderRadius:50,
                  border:"1px solid rgba(244,63,94,.3)", fontFamily:"'DM Sans',sans-serif",
                  color:"#f43f5e", fontSize:12, letterSpacing:3, textTransform:"uppercase" }}>
                A special day ✦
              </motion.div>

              <motion.h1 initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:.5, duration:.9 }}
                className="cormorant shimmer-text"
                style={{ fontSize:"clamp(3.5rem,10vw,8rem)", fontWeight:300, lineHeight:1, letterSpacing:"-0.03em", marginBottom:12 }}>
                Happy Birthday
              </motion.h1>

              <motion.h2 initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.8 }}
                className="cormorant"
                style={{ fontSize:"clamp(2rem,6vw,4.5rem)", fontWeight:300, fontStyle:"italic", color:"#fda4af", marginBottom:36 }}>
                Bharti 🌸
              </motion.h2>

              <BirthTimer/>

              <motion.div initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ delay:1, duration:.8 }}
                style={{ marginBottom:36 }}>
                <CakeScene onCut={() => setCakeDone(true)}/>
              </motion.div>

              <AnimatePresence>
                {cakeDone && (
                  <motion.button
                    initial={{ opacity:0, y:20, scale:.9 }} animate={{ opacity:1, y:0, scale:1 }}
                    transition={{ type:"spring", bounce:.4 }}
                    className="pulse-ring"
                    onClick={openSurprise}
                    style={{ display:"inline-flex", alignItems:"center", gap:12, padding:"18px 44px",
                      background:"linear-gradient(135deg,#f43f5e 0%,#f59e0b 100%)",
                      border:"none", borderRadius:50, cursor:"pointer",
                      fontFamily:"'Cormorant Garamond',serif", fontSize:"1.3rem", fontStyle:"italic",
                      color:"#fff", letterSpacing:".5px", boxShadow:"0 8px 32px rgba(244,63,94,.45)" }}>
                    Open Your Surprise ✨
                  </motion.button>
                )}
              </AnimatePresence>

              {!cakeDone && (
                <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1.4 }}
                  style={{ fontFamily:"'DM Sans',sans-serif", color:"#9f6472", fontSize:13, marginTop:8 }}>
                  (cut the cake first to unlock your surprise 🎂)
                </motion.p>
              )}
            </div>
          </div>
        )}

        {/* ── HAPPY BIRTHDAY SONG SCREEN ── */}
        {phase === "songBloom" && (
          <div style={{ position:"fixed", inset:0, zIndex:48, display:"flex", alignItems:"center",
            justifyContent:"center", background:"#0d0007", flexDirection:"column", gap:24 }}>
            <motion.div initial={{ opacity:0, scale:.9 }} animate={{ opacity:1, scale:1 }}
              style={{ textAlign:"center" }}>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:24, gap:6, alignItems:"flex-end", height:40 }}>
                {["mbar1","mbar2","mbar3","mbar2","mbar1"].map((cls,i)=>(
                  <div key={i} className={cls} style={{ width:7, background:"#f43f5e", borderRadius:3, minHeight:4 }}/>
                ))}
              </div>
              <p className="cormorant shimmer-text"
                style={{ fontSize:"clamp(1.8rem,5vw,3.2rem)", fontWeight:300, lineHeight:1.2 }}>
                🎂 Happy Birthday Baby 🎂
              </p>
              <p style={{ fontFamily:"'DM Sans',sans-serif", color:"#9f6472", fontSize:12, marginTop:14, letterSpacing:3 }}>
                ♪ your song is playing…
              </p>
            </motion.div>
          </div>
        )}

        {/* ── BLOOM ── */}
        {phase === "bloom" && <PetalBloom onComplete={afterBloom}/>}

        {/* ── STORY ── */}
        {phase === "story" && (
          <div style={{ position:"relative" }}>
            <TinyConfetti/>
            <div style={{ position:"fixed", top:16, right:20, zIndex:20,
              fontFamily:"'DM Sans',sans-serif", color:"#9f6472", fontSize:11,
              letterSpacing:2, display:"flex", alignItems:"center", gap:5 }}>
              <MusicBars/><span>playing</span>
            </div>
            <AnimatePresence mode="wait">
              <StorySlide key={step} slide={story[step]} index={step} total={story.length}
                onNext={() => setStep(s => Math.min(s+1, story.length-1))} setPhase={setPhase}/>
            </AnimatePresence>
            <div style={{ position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
              display:"flex", gap:8, zIndex:10 }}>
              {story.map((_,i)=>(
                <div key={i} onClick={()=>setStep(i)} style={{
                  width: i===step?24:8, height:8, borderRadius:4, cursor:"pointer",
                  background: i===step?"#f43f5e":"rgba(244,63,94,.3)",
                  transition:"all .4s ease",
                }}/>
              ))}
            </div>
          </div>
        )}
        {/* ── PERMISSION PAGE ── */}
{phase === "permission" && (
  <motion.div 
    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}
  >
    <h2 className="cormorant" style={{ fontSize: "2.5rem", color: "#fff", marginBottom: "30px" }}>
      I need a permission madamji...
    </h2>
    <motion.button
      onClick={() => setPhase("instagram")}
      className="pulse-ring"
      style={{
        padding: "15px 40px",
        background: "#f43f5e",
        border: "none",
        borderRadius: "50px",
        color: "#fff",
        fontFamily: "'DM Sans'",
        cursor: "pointer"
      }}
    >
      Click to see 🫣
    </motion.button>
  </motion.div>
)}

{/* ── INSTAGRAM APPROVAL PAGE ── */}
{phase === "instagram" && (
  <motion.div 
    initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
    style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}
  >
    <p style={{ color: "#9f6472", fontSize: "12px", letterSpacing: "2px", marginBottom: "15px" }}>PROPOSED INSTAGRAM STORY</p>
    
    <div style={{ 
      width: "280px", height: "500px", borderRadius: "20px", overflow: "hidden", 
      border: "4px solid #f43f5e", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", position: "relative" 
    }}>
      <img src="/story-pre.jpeg" alt="Story Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>

    <div style={{ display: "flex", gap: "20px", marginTop: "30px" }}>
      <button 
        onClick={async () => {
          // Trigger Email Confirmation
          await fetch('/api/send-approval', { method: 'POST' }); 
          alert("Permission Granted! ❤️ Check your email, Chaitanya.");
        }}
        style={{ padding: "12px 30px", background: "#22c55e", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold" }}
      >
        APPROVE ✅
      </button>
      
      <button 
        onClick={() => alert("Try again later... 🥲")}
        style={{ padding: "12px 30px", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid #f43f5e", borderRadius: "10px" }}
      >
        REJECT ❌
      </button>
    </div>
  </motion.div>
)}

      </div>
    </>
  );
}
