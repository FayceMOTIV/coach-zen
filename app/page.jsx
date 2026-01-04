'use client';

import React, { useState, useEffect, useMemo } from 'react';

const formatDate = (d) => d.toISOString().split('T')[0];
const getDayName = (d) => ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()];
const getMonthName = (d) => ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][d.getMonth()];
const loadData = (k, def) => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : def; } catch { return def; }};
const saveData = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const getDefaultDay = () => ({ habits: { breakfast: false, lunch: false, snack: false, dinner: false, plannedTreat: false }, sleep: 7, nap: 0, energy: 3, movement: { workout: false, walk: false }});
const calcScore = (d) => { let s = 0; if(d?.habits) Object.values(d.habits).forEach(c => { if(c) s += 20; }); if(d?.sleep >= 6.5) s += 10; if(d?.nap >= 60) s += 5; if(d?.movement?.workout) s += 5; if(d?.movement?.walk) s += 5; return Math.min(s, 100); };

const MEALS = {
  breakfast: { title: 'Petit-déjeuner', time: 'Matin', items: ['6 oeufs', 'Café OK', 'Eau + sel'], emoji: '🍳', colors: ['#f97316', '#f59e0b'], points: 20 },
  lunch: { title: 'Déjeuner', time: 'Midi', items: ['250g riz', '300g protéine', 'Légumes'], emoji: '🥗', colors: ['#10b981', '#14b8a6'], points: 20 },
  snack: { title: 'Collation', time: 'Pré-sieste', items: ['Yaourt grec', 'ou oeuf + amandes'], emoji: '🥜', colors: ['#8b5cf6', '#a855f7'], points: 20 },
  dinner: { title: 'Dîner', time: '< 20h30', items: ['250g riz', '300g protéine', 'Légumes'], emoji: '🍲', colors: ['#3b82f6', '#6366f1'], points: 20 },
  plannedTreat: { title: 'Craquage planifié', time: '21h-22h', items: ['Autorisé', 'Zéro culpabilité'], emoji: '🍫', colors: ['#ec4899', '#f43f5e'], points: 20 },
};

const COACH = {
  morning: ["Les oeufs posent les bases.", "Matin solide, journée stable.", "Le plan commence."],
  lateAfternoon: ["Zone sensible. Tiens.", "C'est maintenant que ça se joue."],
  treatTime: ["Craquage autorisé. Profite.", "Prévu = contrôlé."],
};

const CircularProgress = ({ progress, size = 160 }) => {
  const sw = 14, r = (size - sw) / 2, c = r * 2 * Math.PI, o = c - (progress / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" /><stop offset="50%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="transparent" stroke="url(#pg)" strokeWidth={sw} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={o} style={{ transition: 'stroke-dashoffset 1s', filter: 'drop-shadow(0 0 10px rgba(139,92,246,0.5))' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 48, fontWeight: 'bold', background: 'linear-gradient(to right, #f472b6, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{Math.round(progress)}</span>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>/100</span>
      </div>
    </div>
  );
};

const HabitCard = ({ meal, checked, onChange }) => (
  <button onClick={() => onChange(!checked)} style={{ width: '100%', padding: 3, borderRadius: 20, background: `linear-gradient(135deg, ${meal.colors[0]}, ${meal.colors[1]})`, border: 'none', cursor: 'pointer', marginBottom: 12, transform: checked ? 'scale(0.98)' : 'scale(1)', transition: 'all 0.3s', boxShadow: checked ? `0 10px 30px -10px ${meal.colors[0]}80` : 'none' }}>
    <div style={{ background: checked ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.95)', borderRadius: 17, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: checked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{checked ? '✓' : meal.emoji}</div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <p style={{ fontSize: 18, fontWeight: 'bold', color: 'white', margin: 0 }}>{meal.title}</p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>{meal.time}</p>
        </div>
        <div style={{ padding: '8px 14px', borderRadius: 20, background: checked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>{checked ? '✓' : `+${meal.points}`}</span>
        </div>
      </div>
      {!checked && <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>{meal.items.map((item, i) => <span key={i} style={{ fontSize: 12, background: 'rgba(255,255,255,0.15)', color: 'white', padding: '6px 12px', borderRadius: 20 }}>{item}</span>)}</div>}
    </div>
  </button>
);

const EnergySelector = ({ value, onChange }) => {
  const levels = [
    { v: 1, e: '😴', l: 'KO', c: ['#ef4444', '#f97316'] },
    { v: 2, e: '😔', l: 'Dur', c: ['#f97316', '#f59e0b'] },
    { v: 3, e: '😐', l: 'OK', c: ['#eab308', '#84cc16'] },
    { v: 4, e: '🙂', l: 'Bien', c: ['#84cc16', '#22c55e'] },
    { v: 5, e: '💪', l: 'Top', c: ['#22c55e', '#14b8a6'] },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
      {levels.map(l => (
        <button key={l.v} onClick={() => onChange(l.v)} style={{ padding: '16px 0', borderRadius: 16, border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: value === l.v ? `linear-gradient(135deg, ${l.c[0]}, ${l.c[1]})` : 'rgba(255,255,255,0.05)', transform: value === l.v ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.3s', boxShadow: value === l.v ? `0 8px 20px -5px ${l.c[0]}60` : 'none' }}>
          <span style={{ fontSize: 24 }}>{l.e}</span>
          <span style={{ fontSize: 10, fontWeight: 'bold', color: value === l.v ? 'white' : 'rgba(255,255,255,0.4)' }}>{l.l}</span>
        </button>
      ))}
    </div>
  );
};

const Slider = ({ value, onChange, min, max, step, label, unit, color, icon }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{icon} {label}</span>
        <span style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>{value}{unit}</span>
      </div>
      <div style={{ position: 'relative', height: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 6 }}>
        <div style={{ height: '100%', borderRadius: 6, background: color, width: `${pct}%`, transition: 'width 0.3s' }} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
      </div>
    </div>
  );
};

const CoachBubble = ({ message, onDismiss }) => {
  if (!message) return null;
  return (
    <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', padding: 2, borderRadius: 20, marginBottom: 16 }}>
      <div style={{ background: 'rgba(15,23,42,0.95)', borderRadius: 18, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ color: 'white', fontWeight: 'bold' }}>Z</span></div>
          <p style={{ flex: 1, fontSize: 15, color: 'white', margin: 0, lineHeight: 1.5 }}>{message}</p>
          <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      </div>
    </div>
  );
};

export default function CoachZen() {
  const today = formatDate(new Date());
  const [allData, setAllData] = useState({});
  const [tab, setTab] = useState('today');
  const [dayData, setDayData] = useState(getDefaultDay());
  const [coachMessage, setCoachMessage] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = loadData('cz_data', {});
    setAllData(saved);
    setDayData(saved[today] || getDefaultDay());
    setLoaded(true);
    const h = new Date().getHours();
    const msgs = h >= 21 ? COACH.treatTime : h >= 17 ? COACH.lateAfternoon : COACH.morning;
    setCoachMessage(msgs[Math.floor(Math.random() * msgs.length)]);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const newAll = { ...allData, [today]: dayData };
    setAllData(newAll);
    saveData('cz_data', newAll);
  }, [dayData, loaded]);

  const score = calcScore(dayData);
  const updateHabit = (k, v) => setDayData(p => ({ ...p, habits: { ...p.habits, [k]: v } }));
  const updateMovement = (k, v) => setDayData(p => ({ ...p, movement: { ...p.movement, [k]: v } }));

  const streak = useMemo(() => {
    let s = 0;
    for (let i = 1; i <= 30; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (allData[formatDate(d)] && calcScore(allData[formatDate(d)]) >= 50) s++; else break;
    }
    return s;
  }, [allData]);

  const weekDays = useMemo(() => {
    const now = new Date(), start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, []);

  const container = { minHeight: '100vh', background: '#0f172a', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', paddingBottom: 100 };
  const content = { maxWidth: 480, margin: '0 auto', padding: '60px 20px 20px', position: 'relative', zIndex: 10 };
  const card = { background: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 20, marginBottom: 16, border: '1px solid rgba(255,255,255,0.1)' };
  const nav = { position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(15,23,42,0.98)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-around', padding: '12px 0', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', zIndex: 9999 };

  if (!loaded) return <div style={container}><div style={content}><p>Chargement...</p></div></div>;

  return (
    <div style={container}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -200, left: '20%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(139,92,246,0.2), transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -100, right: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(236,72,153,0.15), transparent 70%)', borderRadius: '50%' }} />
      </div>

      <div style={content}>
        <header style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 14, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 20 }}>🌿</span></div>
          <span style={{ fontSize: 20, fontWeight: 'bold', background: 'linear-gradient(to right, #c4b5fd, #f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Coach Zen</span>
        </header>

        {tab === 'today' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>{getDayName(new Date())}</p>
              <h1 style={{ fontSize: 32, fontWeight: 'bold', margin: '8px 0', background: 'linear-gradient(to right, white, #e9d5ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{new Date().getDate()} {getMonthName(new Date())}</h1>
            </div>

            <CoachBubble message={coachMessage} onDismiss={() => setCoachMessage(null)} />

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 150, height: 150, background: 'radial-gradient(circle, rgba(139,92,246,0.2), transparent 70%)', borderRadius: '50%' }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>Score du jour</h2>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '8px 0' }}>{score >= 80 ? '🔥 On fire!' : score >= 60 ? '💪 Solide' : score >= 40 ? '👍 En route' : '🌱 Ça pousse'}</p>
                  {score >= 80 && <div style={{ display: 'inline-block', background: 'linear-gradient(to right, #10b981, #14b8a6)', padding: '6px 14px', borderRadius: 20 }}><span style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>OBJECTIF</span></div>}
                </div>
                <CircularProgress progress={score} />
              </div>
            </div>

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))', border: '1px solid rgba(139,92,246,0.2)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px 16px', fontSize: 14 }}>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Habitude cochée</span><span style={{ color: '#10b981', fontWeight: 'bold' }}>+20</span>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Craquage coché</span><span style={{ color: '#ec4899', fontWeight: 'bold' }}>+20 ✓</span>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Sommeil ≥6h30</span><span style={{ color: '#818cf8', fontWeight: 'bold' }}>+10</span>
              </div>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 'bold', marginBottom: 12 }}>🍽️ PLAN</p>
            {Object.entries(MEALS).map(([k, m]) => <HabitCard key={k} meal={m} checked={dayData.habits[k]} onChange={v => updateHabit(k, v)} />)}

            <div style={card}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 16 }}>⚡ Énergie</p>
              <EnergySelector value={dayData.energy} onChange={v => setDayData(p => ({ ...p, energy: v }))} />
            </div>

            <div style={card}>
              <Slider value={dayData.sleep} onChange={v => setDayData(p => ({ ...p, sleep: v }))} min={0} max={9} step={0.5} label="Sommeil" unit="h" color="linear-gradient(to right, #818cf8, #ec4899)" icon="🌙" />
              <Slider value={dayData.nap} onChange={v => setDayData(p => ({ ...p, nap: v }))} min={0} max={120} step={15} label="Sieste" unit="min" color="linear-gradient(to right, #f59e0b, #ef4444)" icon="☀️" />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => updateMovement('workout', !dayData.movement?.workout)} style={{ flex: 1, padding: 16, borderRadius: 16, border: 'none', cursor: 'pointer', background: dayData.movement?.workout ? 'linear-gradient(135deg, #ec4899, #f43f5e)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🏋️</span><span style={{ color: dayData.movement?.workout ? 'white' : 'rgba(255,255,255,0.5)' }}>Muscu</span>
              </button>
              <button onClick={() => updateMovement('walk', !dayData.movement?.walk)} style={{ flex: 1, padding: 16, borderRadius: 16, border: 'none', cursor: 'pointer', background: dayData.movement?.walk ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🚶</span><span style={{ color: dayData.movement?.walk ? 'white' : 'rgba(255,255,255,0.5)' }}>Marche</span>
              </button>
            </div>
          </>
        )}

        {tab === 'week' && (
          <>
            <h1 style={{ fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, background: 'linear-gradient(to right, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Semaine</h1>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', borderRadius: 24, padding: 20, textAlign: 'center' }}><p style={{ fontSize: 48, fontWeight: 'bold', margin: 0 }}>{streak}</p><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>🔥 jours</p></div>
              <div style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', borderRadius: 24, padding: 20, textAlign: 'center' }}><p style={{ fontSize: 48, fontWeight: 'bold', margin: 0 }}>{weekDays.map(d => allData[formatDate(d)]).filter(Boolean).length > 0 ? Math.round(weekDays.map(d => allData[formatDate(d)]).filter(Boolean).map(calcScore).reduce((a,b) => a+b, 0) / weekDays.filter(d => allData[formatDate(d)]).length) : 0}</p><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>moyenne</p></div>
            </div>
            <div style={card}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                {weekDays.map(d => { const k = formatDate(d), data = allData[k], s = data ? calcScore(data) : 0, isT = k === today; return (
                  <div key={k} style={{ textAlign: 'center', padding: 8, borderRadius: 16, background: isT ? 'linear-gradient(135deg, #8b5cf6, #a855f7)' : 'transparent' }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{getDayName(d)}</p>
                    <p style={{ fontSize: 14, margin: '6px 0', fontWeight: '500', color: isT ? 'white' : 'rgba(255,255,255,0.7)' }}>{d.getDate()}</p>
                    <div style={{ width: 40, height: 40, margin: '0 auto', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 'bold', background: !data ? 'rgba(255,255,255,0.05)' : s >= 80 ? 'linear-gradient(135deg, #10b981, #14b8a6)' : s >= 50 ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'rgba(255,255,255,0.1)', color: !data ? 'rgba(255,255,255,0.3)' : 'white' }}>{data ? s : '–'}</div>
                  </div>
                ); })}
              </div>
            </div>
          </>
        )}

        {tab === 'plan' && (
          <>
            <h1 style={{ fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, background: 'linear-gradient(to right, #fbbf24, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Mon Plan</h1>
            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))' }}><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>🧠 Plan <strong style={{ color: 'white' }}>simple et fixe</strong>. Pas de décisions.</p></div>
            {Object.entries(MEALS).map(([k, m]) => (
              <div key={k} style={{ background: `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})`, borderRadius: 24, padding: 20, marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{m.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><p style={{ fontSize: 18, fontWeight: 'bold', margin: 0 }}>{m.title}</p><span style={{ fontSize: 12, background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 20 }}>{m.time}</span></div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>{m.items.map((i, x) => <span key={x} style={{ fontSize: 12, background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: 20 }}>{i}</span>)}</div>
                    <p style={{ marginTop: 12, fontWeight: 'bold' }}>+{m.points} points</p>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'stats' && (
          <>
            <h1 style={{ fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, background: 'linear-gradient(to right, #10b981, #14b8a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Stats</h1>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)', borderRadius: 24, padding: 20, textAlign: 'center' }}><p style={{ fontSize: 40, fontWeight: 'bold', margin: 0 }}>{Object.keys(allData).length}</p><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>jours</p></div>
              <div style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)', borderRadius: 24, padding: 20, textAlign: 'center' }}><p style={{ fontSize: 40, fontWeight: 'bold', margin: 0 }}>{streak}</p><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>🔥 streak</p></div>
            </div>
            <div style={card}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 16 }}>📈 7 derniers jours</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
                {Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const data = allData[formatDate(d)], s = data ? calcScore(data) : 0; return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: '100%', height: s, background: s >= 80 ? 'linear-gradient(to top, #10b981, #34d399)' : s >= 50 ? 'linear-gradient(to top, #f59e0b, #fbbf24)' : 'rgba(255,255,255,0.1)', borderRadius: 6 }} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{d.getDate()}</span>
                  </div>
                ); })}
              </div>
            </div>
          </>
        )}
      </div>

      <nav style={nav}>
        {[{ id: 'today', icon: '🏠', label: "Aujourd'hui", c: ['#8b5cf6', '#a855f7'] }, { id: 'week', icon: '📅', label: 'Semaine', c: ['#06b6d4', '#3b82f6'] }, { id: 'plan', icon: '📖', label: 'Plan', c: ['#f59e0b', '#f97316'] }, { id: 'stats', icon: '📊', label: 'Stats', c: ['#10b981', '#14b8a6'] }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tab === t.id ? `linear-gradient(135deg, ${t.c[0]}, ${t.c[1]})` : 'transparent', transform: tab === t.id ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.3s' }}><span style={{ fontSize: 20 }}>{t.icon}</span></div>
            <span style={{ fontSize: 10, fontWeight: '500', color: tab === t.id ? 'white' : 'rgba(255,255,255,0.4)' }}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
