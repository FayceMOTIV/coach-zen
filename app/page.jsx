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
  breakfast: { title: 'Petit-déjeuner', time: 'Matin', items: ['6 oeufs', 'Café', 'Eau + sel'], emoji: '🍳', colors: ['#f97316', '#f59e0b'], points: 20, kcal: 450 },
  lunch: { title: 'Déjeuner', time: 'Midi', items: ['250g riz', '300g protéine', 'Légumes'], emoji: '🥗', colors: ['#10b981', '#14b8a6'], points: 20, kcal: 850 },
  snack: { title: 'Collation', time: 'Pré-sieste', items: ['Yaourt grec', 'ou oeuf + amandes'], emoji: '🥜', colors: ['#8b5cf6', '#a855f7'], points: 20, kcal: 200 },
  dinner: { title: 'Dîner', time: '< 20h30', items: ['250g riz', '300g protéine', 'Légumes'], emoji: '🍲', colors: ['#3b82f6', '#6366f1'], points: 20, kcal: 850 },
  plannedTreat: { title: 'Craquage', time: '21h-22h', items: ['Autorisé', 'Zéro culpabilité'], emoji: '🍫', colors: ['#ec4899', '#f43f5e'], points: 20, kcal: 300 },
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 50, height: 50, borderRadius: 14, background: checked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{checked ? '✓' : meal.emoji}</div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <p style={{ fontSize: 16, fontWeight: 'bold', color: 'white', margin: 0 }}>{meal.title}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0' }}>{meal.time} • {meal.kcal} kcal</p>
        </div>
        <div style={{ padding: '6px 12px', borderRadius: 16, background: checked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: 13, fontWeight: 'bold', color: 'white' }}>{checked ? '✓' : `+${meal.points}`}</span>
        </div>
      </div>
      {!checked && <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>{meal.items.map((item, i) => <span key={i} style={{ fontSize: 11, background: 'rgba(255,255,255,0.15)', color: 'white', padding: '4px 10px', borderRadius: 12 }}>{item}</span>)}</div>}
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
      {levels.map(l => (
        <button key={l.v} onClick={() => onChange(l.v)} style={{ padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: value === l.v ? `linear-gradient(135deg, ${l.c[0]}, ${l.c[1]})` : 'rgba(255,255,255,0.05)', transform: value === l.v ? 'scale(1.08)' : 'scale(1)', transition: 'all 0.3s', boxShadow: value === l.v ? `0 6px 15px -5px ${l.c[0]}60` : 'none' }}>
          <span style={{ fontSize: 22 }}>{l.e}</span>
          <span style={{ fontSize: 9, fontWeight: 'bold', color: value === l.v ? 'white' : 'rgba(255,255,255,0.4)' }}>{l.l}</span>
        </button>
      ))}
    </div>
  );
};

const Slider = ({ value, onChange, min, max, step, label, unit, color, icon }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{icon} {label}</span>
        <span style={{ fontSize: 16, fontWeight: 'bold', color: 'white' }}>{value}{unit}</span>
      </div>
      <div style={{ position: 'relative', height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 5 }}>
        <div style={{ height: '100%', borderRadius: 5, background: color, width: `${pct}%`, transition: 'width 0.3s' }} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
      </div>
    </div>
  );
};

const CoachBubble = ({ message, onDismiss }) => {
  if (!message) return null;
  return (
    <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', padding: 2, borderRadius: 18, marginBottom: 16 }}>
      <div style={{ background: 'rgba(15,23,42,0.95)', borderRadius: 16, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Z</span></div>
          <p style={{ flex: 1, fontSize: 14, color: 'white', margin: 0, lineHeight: 1.4 }}>{message}</p>
          <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16, padding: 0 }}>×</button>
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
    
    // Fetch AI message
    const fetchCoach = async () => {
      try {
        const res = await fetch('/api/coach/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ energy: saved[today]?.energy || 3, score: calcScore(saved[today]), slot: new Date().getHours() >= 21 ? 'treatTime' : new Date().getHours() >= 17 ? 'lateAfternoon' : 'morning' })
        });
        const data = await res.json();
        if (data.message) setCoachMessage(data.message);
        else {
          const fallback = ["Les oeufs posent les bases.", "Le plan commence.", "Tiens le cap."];
          setCoachMessage(fallback[Math.floor(Math.random() * fallback.length)]);
        }
      } catch {
        const fallback = ["Les oeufs posent les bases.", "Le plan commence.", "Tiens le cap."];
        setCoachMessage(fallback[Math.floor(Math.random() * fallback.length)]);
      }
    };
    fetchCoach();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const newAll = { ...allData, [today]: dayData };
    setAllData(newAll);
    saveData('cz_data', newAll);
  }, [dayData, loaded]);

  const score = calcScore(dayData);
  const totalKcal = Object.entries(MEALS).reduce((sum, [k, m]) => dayData.habits[k] ? sum + m.kcal : sum, 0);
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
  const content = { maxWidth: 430, margin: '0 auto', padding: '50px 16px 20px', position: 'relative', zIndex: 10 };
  const card = { background: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 16, marginBottom: 14, border: '1px solid rgba(255,255,255,0.1)' };
  const nav = { position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(15,23,42,0.98)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-around', padding: '10px 0', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', zIndex: 9999 };

  if (!loaded) return <div style={container}><div style={content}><p>Chargement...</p></div></div>;

  return (
    <div style={container}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -200, left: '20%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(139,92,246,0.2), transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -100, right: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(236,72,153,0.15), transparent 70%)', borderRadius: '50%' }} />
      </div>

      <div style={content}>
        <header style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 18 }}>🌿</span></div>
          <span style={{ fontSize: 18, fontWeight: 'bold', background: 'linear-gradient(to right, #c4b5fd, #f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Coach Zen</span>
        </header>

        {tab === 'today' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>{getDayName(new Date())}</p>
              <h1 style={{ fontSize: 28, fontWeight: 'bold', margin: '6px 0', background: 'linear-gradient(to right, white, #e9d5ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{new Date().getDate()} {getMonthName(new Date())}</h1>
            </div>

            <CoachBubble message={coachMessage} onDismiss={() => setCoachMessage(null)} />

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, background: 'radial-gradient(circle, rgba(139,92,246,0.2), transparent 70%)', borderRadius: '50%' }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 'bold', margin: 0 }}>Score du jour</h2>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '6px 0' }}>{score >= 80 ? '🔥 On fire!' : score >= 60 ? '💪 Solide' : score >= 40 ? '👍 En route' : '🌱 Ça pousse'}</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '4px 0' }}>{totalKcal} kcal consommées</p>
                  {score >= 80 && <div style={{ display: 'inline-block', background: 'linear-gradient(to right, #10b981, #14b8a6)', padding: '5px 12px', borderRadius: 14, marginTop: 4 }}><span style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>OBJECTIF</span></div>}
                </div>
                <CircularProgress progress={score} size={130} />
              </div>
            </div>

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))', border: '1px solid rgba(139,92,246,0.2)', padding: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px 12px', fontSize: 13 }}>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Habitude</span><span style={{ color: '#10b981', fontWeight: 'bold' }}>+20</span>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Sommeil ≥6h30</span><span style={{ color: '#818cf8', fontWeight: 'bold' }}>+10</span>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Sieste ≥60min</span><span style={{ color: '#f59e0b', fontWeight: 'bold' }}>+5</span>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Muscu / Marche</span><span style={{ color: '#06b6d4', fontWeight: 'bold' }}>+5</span>
              </div>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 'bold', marginBottom: 10, letterSpacing: 0.5 }}>🍽️ PLAN • {Object.values(MEALS).reduce((s,m) => s + m.kcal, 0)} kcal total</p>
            {Object.entries(MEALS).map(([k, m]) => <HabitCard key={k} meal={m} checked={dayData.habits[k]} onChange={v => updateHabit(k, v)} />)}

            <div style={card}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 12 }}>⚡ Énergie</p>
              <EnergySelector value={dayData.energy} onChange={v => setDayData(p => ({ ...p, energy: v }))} />
            </div>

            <div style={card}>
              <Slider value={dayData.sleep} onChange={v => setDayData(p => ({ ...p, sleep: v }))} min={0} max={9} step={0.5} label="Sommeil" unit="h" color="linear-gradient(to right, #818cf8, #ec4899)" icon="🌙" />
              <Slider value={dayData.nap} onChange={v => setDayData(p => ({ ...p, nap: v }))} min={0} max={120} step={15} label="Sieste" unit="min" color="linear-gradient(to right, #f59e0b, #ef4444)" icon="☀️" />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => updateMovement('workout', !dayData.movement?.workout)} style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', cursor: 'pointer', background: dayData.movement?.workout ? 'linear-gradient(135deg, #ec4899, #f43f5e)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span style={{ fontSize: 18 }}>🏋️</span><span style={{ color: dayData.movement?.workout ? 'white' : 'rgba(255,255,255,0.5)', fontSize: 14 }}>Muscu</span>{dayData.movement?.workout && <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>+5</span>}
              </button>
              <button onClick={() => updateMovement('walk', !dayData.movement?.walk)} style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', cursor: 'pointer', background: dayData.movement?.walk ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span style={{ fontSize: 18 }}>🚶</span><span style={{ color: dayData.movement?.walk ? 'white' : 'rgba(255,255,255,0.5)', fontSize: 14 }}>Marche</span>{dayData.movement?.walk && <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>+5</span>}
              </button>
            </div>
          </>
        )}

        {tab === 'week' && (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, background: 'linear-gradient(to right, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Semaine</h1>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', borderRadius: 20, padding: 16, textAlign: 'center' }}><p style={{ fontSize: 40, fontWeight: 'bold', margin: 0 }}>{streak}</p><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>🔥 jours</p></div>
              <div style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', borderRadius: 20, padding: 16, textAlign: 'center' }}><p style={{ fontSize: 40, fontWeight: 'bold', margin: 0 }}>{weekDays.map(d => allData[formatDate(d)]).filter(Boolean).length > 0 ? Math.round(weekDays.map(d => allData[formatDate(d)]).filter(Boolean).map(calcScore).reduce((a,b) => a+b, 0) / weekDays.filter(d => allData[formatDate(d)]).length) : 0}</p><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>moyenne</p></div>
            </div>
            <div style={card}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {weekDays.map(d => { const k = formatDate(d), data = allData[k], s = data ? calcScore(data) : 0, isT = k === today; return (
                  <div key={k} style={{ textAlign: 'center', padding: 6, borderRadius: 12, background: isT ? 'linear-gradient(135deg, #8b5cf6, #a855f7)' : 'transparent' }}>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{getDayName(d)}</p>
                    <p style={{ fontSize: 12, margin: '4px 0', fontWeight: '500', color: isT ? 'white' : 'rgba(255,255,255,0.7)' }}>{d.getDate()}</p>
                    <div style={{ width: 32, height: 32, margin: '0 auto', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 'bold', background: !data ? 'rgba(255,255,255,0.05)' : s >= 80 ? 'linear-gradient(135deg, #10b981, #14b8a6)' : s >= 50 ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'rgba(255,255,255,0.1)', color: !data ? 'rgba(255,255,255,0.3)' : 'white' }}>{data ? s : '–'}</div>
                  </div>
                ); })}
              </div>
            </div>
          </>
        )}

        {tab === 'plan' && (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, background: 'linear-gradient(to right, #fbbf24, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Mon Plan</h1>
            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))' }}><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>🧠 Plan <strong style={{ color: 'white' }}>simple et fixe</strong>. Total: <strong style={{ color: '#10b981' }}>{Object.values(MEALS).reduce((s,m) => s + m.kcal, 0)} kcal</strong></p></div>
            {Object.entries(MEALS).map(([k, m]) => (
              <div key={k} style={{ background: `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})`, borderRadius: 20, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{m.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><p style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>{m.title}</p><span style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: 12 }}>{m.time}</span></div>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: '4px 0' }}>{m.kcal} kcal</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>{m.items.map((i, x) => <span key={x} style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 10 }}>{i}</span>)}</div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'stats' && (
          <>
            <h1 style={{ fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, background: 'linear-gradient(to right, #10b981, #14b8a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Stats</h1>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)', borderRadius: 20, padding: 16, textAlign: 'center' }}><p style={{ fontSize: 36, fontWeight: 'bold', margin: 0 }}>{Object.keys(allData).length}</p><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>jours</p></div>
              <div style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)', borderRadius: 20, padding: 16, textAlign: 'center' }}><p style={{ fontSize: 36, fontWeight: 'bold', margin: 0 }}>{streak}</p><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>🔥 streak</p></div>
            </div>
            <div style={card}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 12 }}>📈 7 derniers jours</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
                {Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const data = allData[formatDate(d)], s = data ? calcScore(data) : 0; return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: '100%', height: s * 0.8, background: s >= 80 ? 'linear-gradient(to top, #10b981, #34d399)' : s >= 50 ? 'linear-gradient(to top, #f59e0b, #fbbf24)' : 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{d.getDate()}</span>
                  </div>
                ); })}
              </div>
            </div>
          </>
        )}
      </div>

      <nav style={nav}>
        {[{ id: 'today', icon: '🏠', label: "Aujourd'hui", c: ['#8b5cf6', '#a855f7'] }, { id: 'week', icon: '📅', label: 'Semaine', c: ['#06b6d4', '#3b82f6'] }, { id: 'plan', icon: '📖', label: 'Plan', c: ['#f59e0b', '#f97316'] }, { id: 'stats', icon: '📊', label: 'Stats', c: ['#10b981', '#14b8a6'] }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tab === t.id ? `linear-gradient(135deg, ${t.c[0]}, ${t.c[1]})` : 'transparent', transform: tab === t.id ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.3s' }}><span style={{ fontSize: 18 }}>{t.icon}</span></div>
            <span style={{ fontSize: 9, fontWeight: '500', color: tab === t.id ? 'white' : 'rgba(255,255,255,0.4)' }}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
