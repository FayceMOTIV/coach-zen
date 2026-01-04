'use client';

import React, { useState, useEffect, useMemo } from 'react';

const formatDate = (d) => d.toISOString().split('T')[0];
const getDayName = (d) => ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()];
const getMonthName = (d) => ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][d.getMonth()];
const loadData = (k, def) => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : def; } catch { return def; }};
const saveData = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const getDefaultDay = () => ({ habits: { breakfast: false, lunch: false, snack: false, dinner: false, plannedTreat: false }, sleep: 7, nap: 0, energy: 3, movement: { workout: false, walk: false }});
const calcScore = (d) => { let s = 0; if(d?.habits) Object.values(d.habits).forEach(c => { if(c) s += 20; }); if(d?.sleep >= 6.5) s += 10; if(d?.nap >= 60) s += 5; if(d?.movement?.workout) s += 5; if(d?.movement?.walk) s += 5; return Math.min(s, 100); };

// Calcul métabolisme (Mifflin-St Jeor)
const calcBMR = (profile) => {
  if (!profile.poids || !profile.taille || !profile.age) return 0;
  if (profile.sexe === 'homme') {
    return Math.round(10 * profile.poids + 6.25 * profile.taille - 5 * profile.age + 5);
  } else {
    return Math.round(10 * profile.poids + 6.25 * profile.taille - 5 * profile.age - 161);
  }
};

const calcTDEE = (bmr, activity) => {
  const factors = { sedentaire: 1.2, leger: 1.375, modere: 1.55, actif: 1.725, intense: 1.9 };
  return Math.round(bmr * (factors[activity] || 1.55));
};

const MEALS = {
  breakfast: { title: 'Petit-déjeuner', time: 'Matin', items: ['6 oeufs', 'Café', 'Eau + sel'], emoji: '🍳', colors: ['#f97316', '#f59e0b'], points: 20, kcal: 450 },
  lunch: { title: 'Déjeuner', time: 'Midi', items: ['250g riz', '300g protéine', 'Légumes'], emoji: '🥗', colors: ['#10b981', '#14b8a6'], points: 20, kcal: 850 },
  snack: { title: 'Collation', time: 'Pré-sieste', items: ['Yaourt grec', 'ou oeuf + amandes'], emoji: '🥜', colors: ['#8b5cf6', '#a855f7'], points: 20, kcal: 200 },
  dinner: { title: 'Dîner', time: '< 20h30', items: ['250g riz', '300g protéine', 'Légumes'], emoji: '🍲', colors: ['#3b82f6', '#6366f1'], points: 20, kcal: 850 },
  plannedTreat: { title: 'Craquage', time: '21h-22h', items: ['Autorisé', 'Zéro culpabilité'], emoji: '🍫', colors: ['#ec4899', '#f43f5e'], points: 20, kcal: 300 },
};

const CircularProgress = ({ progress, size = 130 }) => {
  const sw = 12, r = (size - sw) / 2, c = r * 2 * Math.PI, o = c - (progress / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs><linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ec4899" /><stop offset="50%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#10b981" /></linearGradient></defs>
        <circle cx={size/2} cy={size/2} r={r} fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="transparent" stroke="url(#pg)" strokeWidth={sw} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={o} style={{ transition: 'stroke-dashoffset 1s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 40, fontWeight: 'bold', background: 'linear-gradient(to right, #f472b6, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{Math.round(progress)}</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>/100</span>
      </div>
    </div>
  );
};

const KcalProgress = ({ consumed, target }) => {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const remaining = target - consumed;
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 14, marginBottom: 14, border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>🔥 Calories</span>
        <span style={{ fontSize: 15, fontWeight: 'bold', color: remaining >= 0 ? '#10b981' : '#ef4444' }}>{consumed} / {target} kcal</span>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 4, background: remaining >= 0 ? 'linear-gradient(to right, #10b981, #14b8a6)' : 'linear-gradient(to right, #ef4444, #f97316)', width: `${pct}%`, transition: 'width 0.5s' }} />
      </div>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 8, textAlign: 'center' }}>
        {remaining > 0 ? `${remaining} kcal restantes` : remaining < 0 ? `${Math.abs(remaining)} kcal en surplus` : 'Objectif atteint !'}
      </p>
    </div>
  );
};

const HabitCard = ({ meal, checked, onChange }) => (
  <button onClick={() => onChange(!checked)} style={{ width: '100%', padding: 3, borderRadius: 18, background: `linear-gradient(135deg, ${meal.colors[0]}, ${meal.colors[1]})`, border: 'none', cursor: 'pointer', marginBottom: 10, transform: checked ? 'scale(0.98)' : 'scale(1)', transition: 'all 0.3s' }}>
    <div style={{ background: checked ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.95)', borderRadius: 15, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: checked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{checked ? '✓' : meal.emoji}</div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <p style={{ fontSize: 15, fontWeight: 'bold', color: 'white', margin: 0 }}>{meal.title}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0' }}>{meal.time} • {meal.kcal} kcal</p>
        </div>
        <div style={{ padding: '5px 10px', borderRadius: 12, background: checked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: 12, fontWeight: 'bold', color: 'white' }}>{checked ? '✓' : `+${meal.points}`}</span>
        </div>
      </div>
    </div>
  </button>
);

const EnergySelector = ({ value, onChange }) => {
  const levels = [{ v: 1, e: '😴', l: 'KO', c: ['#ef4444', '#f97316'] }, { v: 2, e: '😔', l: 'Dur', c: ['#f97316', '#f59e0b'] }, { v: 3, e: '😐', l: 'OK', c: ['#eab308', '#84cc16'] }, { v: 4, e: '🙂', l: 'Bien', c: ['#84cc16', '#22c55e'] }, { v: 5, e: '💪', l: 'Top', c: ['#22c55e', '#14b8a6'] }];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
      {levels.map(l => (
        <button key={l.v} onClick={() => onChange(l.v)} style={{ padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: value === l.v ? `linear-gradient(135deg, ${l.c[0]}, ${l.c[1]})` : 'rgba(255,255,255,0.05)', transform: value === l.v ? 'scale(1.05)' : 'scale(1)', transition: 'all 0.3s' }}>
          <span style={{ fontSize: 20 }}>{l.e}</span>
          <span style={{ fontSize: 9, fontWeight: 'bold', color: value === l.v ? 'white' : 'rgba(255,255,255,0.4)' }}>{l.l}</span>
        </button>
      ))}
    </div>
  );
};

const Slider = ({ value, onChange, min, max, step, label, unit, color, icon }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{icon} {label}</span>
        <span style={{ fontSize: 15, fontWeight: 'bold', color: 'white' }}>{value}{unit}</span>
      </div>
      <div style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
        <div style={{ height: '100%', borderRadius: 4, background: color, width: `${pct}%`, transition: 'width 0.3s' }} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
      </div>
    </div>
  );
};

const CoachBubble = ({ message, onDismiss }) => {
  if (!message) return null;
  return (
    <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', padding: 2, borderRadius: 16, marginBottom: 14 }}>
      <div style={{ background: 'rgba(15,23,42,0.95)', borderRadius: 14, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>Z</span></div>
          <p style={{ flex: 1, fontSize: 13, color: 'white', margin: 0, lineHeight: 1.4 }}>{message}</p>
          <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16, padding: 0 }}>×</button>
        </div>
      </div>
    </div>
  );
};

const ProfileInput = ({ label, value, onChange, type = 'number', options }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 6 }}>{label}</label>
    {options ? (
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 14 }}>
        {options.map(o => <option key={o.value} value={o.value} style={{ background: '#1e293b' }}>{o.label}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 14, boxSizing: 'border-box' }} />
    )}
  </div>
);

export default function CoachZen() {
  const today = formatDate(new Date());
  const [allData, setAllData] = useState({});
  const [tab, setTab] = useState('today');
  const [dayData, setDayData] = useState(getDefaultDay());
  const [coachMessage, setCoachMessage] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState({ poids: 75, taille: 175, age: 30, sexe: 'homme', activite: 'modere' });

  useEffect(() => {
    const saved = loadData('cz_data', {});
    const savedProfile = loadData('cz_profile', { poids: 75, taille: 175, age: 30, sexe: 'homme', activite: 'modere' });
    setAllData(saved);
    setProfile(savedProfile);
    setDayData(saved[today] || getDefaultDay());
    setLoaded(true);
    
    const fetchCoach = async () => {
      try {
        const res = await fetch('/api/coach/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ energy: saved[today]?.energy || 3, score: calcScore(saved[today]), slot: new Date().getHours() >= 21 ? 'treatTime' : new Date().getHours() >= 17 ? 'lateAfternoon' : 'morning' })
        });
        const data = await res.json();
        if (data.message) setCoachMessage(data.message);
        else setCoachMessage("Le plan commence.");
      } catch { setCoachMessage("Le plan commence."); }
    };
    fetchCoach();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const newAll = { ...allData, [today]: dayData };
    setAllData(newAll);
    saveData('cz_data', newAll);
  }, [dayData, loaded]);

  useEffect(() => {
    if (!loaded) return;
    saveData('cz_profile', profile);
  }, [profile, loaded]);

  const score = calcScore(dayData);
  const totalKcal = Object.entries(MEALS).reduce((sum, [k, m]) => dayData.habits[k] ? sum + m.kcal : sum, 0);
  const bmr = calcBMR(profile);
  const tdee = calcTDEE(bmr, profile.activite);
  const updateHabit = (k, v) => setDayData(p => ({ ...p, habits: { ...p.habits, [k]: v } }));
  const updateMovement = (k, v) => setDayData(p => ({ ...p, movement: { ...p.movement, [k]: v } }));
  const updateProfile = (k, v) => setProfile(p => ({ ...p, [k]: v }));

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
  const content = { maxWidth: 420, margin: '0 auto', padding: '50px 14px 20px', position: 'relative', zIndex: 10 };
  const card = { background: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 14, marginBottom: 12, border: '1px solid rgba(255,255,255,0.1)' };
  const nav = { position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(15,23,42,0.98)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-around', padding: '8px 0', paddingBottom: 'max(18px, env(safe-area-inset-bottom))', zIndex: 9999 };

  if (!loaded) return <div style={container}><div style={content}><p>Chargement...</p></div></div>;

  return (
    <div style={container}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -200, left: '20%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)', borderRadius: '50%' }} />
      </div>

      <div style={content}>
        <header style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 16 }}>🌿</span></div>
          <span style={{ fontSize: 17, fontWeight: 'bold', background: 'linear-gradient(to right, #c4b5fd, #f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Coach Zen</span>
        </header>

        {tab === 'today' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>{getDayName(new Date())}</p>
              <h1 style={{ fontSize: 26, fontWeight: 'bold', margin: '4px 0', background: 'linear-gradient(to right, white, #e9d5ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{new Date().getDate()} {getMonthName(new Date())}</h1>
            </div>

            <CoachBubble message={coachMessage} onDismiss={() => setCoachMessage(null)} />

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>Score du jour</h2>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '4px 0' }}>{score >= 80 ? '🔥 On fire!' : score >= 60 ? '💪 Solide' : score >= 40 ? '👍 En route' : '🌱 Ça pousse'}</p>
                </div>
                <CircularProgress progress={score} size={110} />
              </div>
            </div>

            <KcalProgress consumed={totalKcal} target={tdee} />

            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold', marginBottom: 8 }}>🍽️ PLAN</p>
            {Object.entries(MEALS).map(([k, m]) => <HabitCard key={k} meal={m} checked={dayData.habits[k]} onChange={v => updateHabit(k, v)} />)}

            <div style={card}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 10 }}>⚡ Énergie</p>
              <EnergySelector value={dayData.energy} onChange={v => setDayData(p => ({ ...p, energy: v }))} />
            </div>

            <div style={card}>
              <Slider value={dayData.sleep} onChange={v => setDayData(p => ({ ...p, sleep: v }))} min={0} max={9} step={0.5} label="Sommeil" unit="h" color="linear-gradient(to right, #818cf8, #ec4899)" icon="🌙" />
              <Slider value={dayData.nap} onChange={v => setDayData(p => ({ ...p, nap: v }))} min={0} max={120} step={15} label="Sieste" unit="min" color="linear-gradient(to right, #f59e0b, #ef4444)" icon="☀️" />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => updateMovement('workout', !dayData.movement?.workout)} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', cursor: 'pointer', background: dayData.movement?.workout ? 'linear-gradient(135deg, #ec4899, #f43f5e)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>🏋️</span><span style={{ color: dayData.movement?.workout ? 'white' : 'rgba(255,255,255,0.5)', fontSize: 13 }}>Muscu</span>{dayData.movement?.workout && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>+5</span>}
              </button>
              <button onClick={() => updateMovement('walk', !dayData.movement?.walk)} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', cursor: 'pointer', background: dayData.movement?.walk ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>🚶</span><span style={{ color: dayData.movement?.walk ? 'white' : 'rgba(255,255,255,0.5)', fontSize: 13 }}>Marche</span>{dayData.movement?.walk && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>+5</span>}
              </button>
            </div>
          </>
        )}

        {tab === 'week' && (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, background: 'linear-gradient(to right, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Semaine</h1>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', borderRadius: 18, padding: 14, textAlign: 'center' }}><p style={{ fontSize: 36, fontWeight: 'bold', margin: 0 }}>{streak}</p><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>🔥 jours</p></div>
              <div style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', borderRadius: 18, padding: 14, textAlign: 'center' }}><p style={{ fontSize: 36, fontWeight: 'bold', margin: 0 }}>{weekDays.map(d => allData[formatDate(d)]).filter(Boolean).length > 0 ? Math.round(weekDays.map(d => allData[formatDate(d)]).filter(Boolean).map(calcScore).reduce((a,b) => a+b, 0) / weekDays.filter(d => allData[formatDate(d)]).length) : 0}</p><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>moyenne</p></div>
            </div>
            <div style={card}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {weekDays.map(d => { const k = formatDate(d), data = allData[k], s = data ? calcScore(data) : 0, isT = k === today; return (
                  <div key={k} style={{ textAlign: 'center', padding: 4, borderRadius: 10, background: isT ? 'linear-gradient(135deg, #8b5cf6, #a855f7)' : 'transparent' }}>
                    <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{getDayName(d)}</p>
                    <p style={{ fontSize: 11, margin: '3px 0', fontWeight: '500', color: isT ? 'white' : 'rgba(255,255,255,0.7)' }}>{d.getDate()}</p>
                    <div style={{ width: 28, height: 28, margin: '0 auto', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 'bold', background: !data ? 'rgba(255,255,255,0.05)' : s >= 80 ? 'linear-gradient(135deg, #10b981, #14b8a6)' : s >= 50 ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'rgba(255,255,255,0.1)', color: !data ? 'rgba(255,255,255,0.3)' : 'white' }}>{data ? s : '–'}</div>
                  </div>
                ); })}
              </div>
            </div>
          </>
        )}

        {tab === 'plan' && (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, background: 'linear-gradient(to right, #fbbf24, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Mon Plan</h1>
            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))' }}><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: 0 }}>🧠 Total: <strong style={{ color: '#10b981' }}>{Object.values(MEALS).reduce((s,m) => s + m.kcal, 0)} kcal</strong> • TDEE: <strong style={{ color: '#06b6d4' }}>{tdee} kcal</strong></p></div>
            {Object.entries(MEALS).map(([k, m]) => (
              <div key={k} style={{ background: `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})`, borderRadius: 18, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{m.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><p style={{ fontSize: 14, fontWeight: 'bold', margin: 0 }}>{m.title}</p><span style={{ fontSize: 10, background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: 10 }}>{m.kcal} kcal</span></div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>{m.items.map((i, x) => <span key={x} style={{ fontSize: 10, background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: 8 }}>{i}</span>)}</div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'stats' && (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, background: 'linear-gradient(to right, #10b981, #14b8a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Stats & Profil</h1>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)', borderRadius: 18, padding: 14, textAlign: 'center' }}><p style={{ fontSize: 32, fontWeight: 'bold', margin: 0 }}>{Object.keys(allData).length}</p><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>jours</p></div>
              <div style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)', borderRadius: 18, padding: 14, textAlign: 'center' }}><p style={{ fontSize: 32, fontWeight: 'bold', margin: 0 }}>{streak}</p><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>🔥 streak</p></div>
            </div>

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(59,130,246,0.1))', border: '1px solid rgba(6,182,212,0.2)' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 12, fontWeight: 'bold' }}>⚙️ MON PROFIL</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ProfileInput label="Poids (kg)" value={profile.poids} onChange={v => updateProfile('poids', v)} />
                <ProfileInput label="Taille (cm)" value={profile.taille} onChange={v => updateProfile('taille', v)} />
                <ProfileInput label="Âge" value={profile.age} onChange={v => updateProfile('age', v)} />
                <ProfileInput label="Sexe" value={profile.sexe} onChange={v => updateProfile('sexe', v)} options={[{ value: 'homme', label: 'Homme' }, { value: 'femme', label: 'Femme' }]} />
              </div>
              <ProfileInput label="Niveau d'activité" value={profile.activite} onChange={v => updateProfile('activite', v)} options={[{ value: 'sedentaire', label: 'Sédentaire' }, { value: 'leger', label: 'Légèrement actif' }, { value: 'modere', label: 'Modérément actif' }, { value: 'actif', label: 'Très actif' }, { value: 'intense', label: 'Extrêmement actif' }]} />
            </div>

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 10, fontWeight: 'bold' }}>🔥 MÉTABOLISME</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 'bold', margin: 0, color: '#a78bfa' }}>{bmr}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>BMR (repos)</p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 'bold', margin: 0, color: '#10b981' }}>{tdee}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>TDEE (total)</p>
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 10, textAlign: 'center' }}>Consomme ~{tdee} kcal/jour pour maintenir ton poids</p>
            </div>
          </>
        )}
      </div>

      <nav style={nav}>
        {[{ id: 'today', icon: '🏠', label: "Aujourd'hui", c: ['#8b5cf6', '#a855f7'] }, { id: 'week', icon: '📅', label: 'Semaine', c: ['#06b6d4', '#3b82f6'] }, { id: 'plan', icon: '📖', label: 'Plan', c: ['#f59e0b', '#f97316'] }, { id: 'stats', icon: '⚙️', label: 'Profil', c: ['#10b981', '#14b8a6'] }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tab === t.id ? `linear-gradient(135deg, ${t.c[0]}, ${t.c[1]})` : 'transparent', transform: tab === t.id ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.3s' }}><span style={{ fontSize: 16 }}>{t.icon}</span></div>
            <span style={{ fontSize: 9, fontWeight: '500', color: tab === t.id ? 'white' : 'rgba(255,255,255,0.4)' }}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
