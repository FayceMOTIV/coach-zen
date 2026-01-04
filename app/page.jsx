'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';

// ============================================
// COACH ZEN V4 - VIBRANT COLORS (INLINE STYLES)
// ============================================

// Utilities
const formatDate = (d) => d.toISOString().split('T')[0];
const getDayName = (d) => ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()];
const getMonthName = (d) => ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][d.getMonth()];
const loadData = (k, def) => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : def; } catch { return def; }};
const saveData = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const getDefaultDay = () => ({ habits: { breakfast: false, lunch: false, snack: false, dinner: false, plannedTreat: false }, sleep: 7, nap: 0, energy: 3, movement: { workout: false, walk: false }});
const calcScore = (d) => { 
  let s = 0; 
  if(d?.habits) Object.values(d.habits).forEach(c => { if(c) s += 20; }); 
  if(d?.sleep >= 6.5) s += 10; 
  if(d?.nap >= 60) s += 5; 
  if(d?.movement?.workout) s += 5; 
  if(d?.movement?.walk) s += 5; 
  return Math.min(s, 100); 
};

// Meal data
const MEALS = {
  breakfast: { title: 'Petit-déjeuner', time: 'Matin', items: ['6 oeufs', 'Café OK', 'Eau + sel'], emoji: '🍳', colors: ['#f97316', '#f59e0b'], points: 20 },
  lunch: { title: 'Déjeuner', time: 'Midi', items: ['250g riz', '300g protéine', 'Légumes'], emoji: '🥗', colors: ['#10b981', '#14b8a6'], points: 20 },
  snack: { title: 'Collation', time: 'Pré-sieste', items: ['Yaourt grec', 'ou oeuf + amandes'], emoji: '🥜', colors: ['#8b5cf6', '#a855f7'], points: 20 },
  dinner: { title: 'Dîner', time: '< 20h30', items: ['250g riz', '300g protéine', 'Légumes'], emoji: '🍲', colors: ['#3b82f6', '#6366f1'], points: 20 },
  plannedTreat: { title: 'Craquage planifié', time: '21h-22h', items: ['Autorisé', 'Prévu = +20 pts!'], emoji: '🍫', colors: ['#ec4899', '#f43f5e'], points: 20 },
};

// Coach messages
const COACH_MESSAGES = {
  morning: ["Les oeufs posent les bases.", "Matin solide, journée stable.", "Le plan commence maintenant."],
  lateAfternoon: ["Zone sensible. Le dîner arrive.", "C'est maintenant que ça se joue.", "Tiens. Le repas n'est plus loin."],
  treatTime: ["Craquage autorisé. Profite.", "Prévu = contrôlé. Zéro culpabilité.", "Tu l'as gagné. Savoure."],
  lowEnergy: ["Journée difficile. Fais le minimum.", "Mode survie. Ne lâche pas.", "L'énergie reviendra. Tiens."],
};

// Circular Progress
const CircularProgress = ({ progress, size = 160 }) => {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="25%" stopColor="#a855f7" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="75%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <circle
          cx={size/2} cy={size/2} r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size/2} cy={size/2} r={radius}
          fill="transparent"
          stroke="url(#progressGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out', filter: 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.5))' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 48, fontWeight: 'bold', background: 'linear-gradient(to right, #f472b6, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {Math.round(progress)}
        </span>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>/100</span>
      </div>
    </div>
  );
};

// Habit Card
const HabitCard = ({ meal, id, checked, onChange }) => {
  const gradient = `linear-gradient(135deg, ${meal.colors[0]}, ${meal.colors[1]})`;
  
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: '100%',
        padding: 3,
        borderRadius: 20,
        background: gradient,
        border: 'none',
        cursor: 'pointer',
        marginBottom: 12,
        transform: checked ? 'scale(0.98)' : 'scale(1)',
        transition: 'all 0.3s ease',
        boxShadow: checked ? `0 10px 30px -10px ${meal.colors[0]}80` : 'none',
      }}
    >
      <div style={{
        background: checked ? 'rgba(255,255,255,0.15)' : 'rgba(15, 23, 42, 0.95)',
        borderRadius: 17,
        padding: 16,
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: checked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            transition: 'all 0.3s ease',
          }}>
            {checked ? '✓' : meal.emoji}
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <p style={{ fontSize: 18, fontWeight: 'bold', color: 'white', margin: 0 }}>{meal.title}</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>{meal.time}</p>
          </div>
          <div style={{
            padding: '8px 14px',
            borderRadius: 20,
            background: checked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>
              {checked ? '✓' : `+${meal.points}`}
            </span>
          </div>
        </div>
        {!checked && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {meal.items.map((item, i) => (
              <span key={i} style={{ fontSize: 12, background: 'rgba(255,255,255,0.15)', color: 'white', padding: '6px 12px', borderRadius: 20 }}>
                {item}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
};

// Energy Selector
const EnergySelector = ({ value, onChange }) => {
  const levels = [
    { v: 1, e: '😴', l: 'KO', colors: ['#ef4444', '#f97316'] },
    { v: 2, e: '😔', l: 'Dur', colors: ['#f97316', '#f59e0b'] },
    { v: 3, e: '😐', l: 'OK', colors: ['#eab308', '#84cc16'] },
    { v: 4, e: '🙂', l: 'Bien', colors: ['#84cc16', '#22c55e'] },
    { v: 5, e: '💪', l: 'Top', colors: ['#22c55e', '#14b8a6'] },
  ];
  
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
      {levels.map(l => (
        <button
          key={l.v}
          onClick={() => onChange(l.v)}
          style={{
            padding: '16px 0',
            borderRadius: 16,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            background: value === l.v ? `linear-gradient(135deg, ${l.colors[0]}, ${l.colors[1]})` : 'rgba(255,255,255,0.05)',
            transform: value === l.v ? 'scale(1.1)' : 'scale(1)',
            transition: 'all 0.3s ease',
            boxShadow: value === l.v ? `0 8px 20px -5px ${l.colors[0]}60` : 'none',
          }}
        >
          <span style={{ fontSize: 24 }}>{l.e}</span>
          <span style={{ fontSize: 10, fontWeight: 'bold', color: value === l.v ? 'white' : 'rgba(255,255,255,0.4)' }}>{l.l}</span>
        </button>
      ))}
    </div>
  );
};

// Slider
const Slider = ({ value, onChange, min, max, step, label, unit, color, icon }) => {
  const pct = ((value - min) / (max - min)) * 100;
  
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{icon} {label}</span>
        <span style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>{value}{unit}</span>
      </div>
      <div style={{ position: 'relative', height: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 6 }}>
        <div style={{ height: '100%', borderRadius: 6, background: color, width: `${pct}%`, transition: 'width 0.3s ease' }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
        />
      </div>
    </div>
  );
};

// Coach Bubble
const CoachBubble = ({ message, onDismiss }) => {
  if (!message) return null;
  
  return (
    <div style={{
      background: 'linear-gradient(135deg, #8b5cf6, #a855f7, #ec4899)',
      padding: 2,
      borderRadius: 20,
      marginBottom: 16,
    }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        borderRadius: 18,
        padding: 16,
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: 'white', fontWeight: 'bold' }}>Z</span>
          </div>
          <p style={{ flex: 1, fontSize: 15, color: 'white', margin: 0, lineHeight: 1.5 }}>{message}</p>
          <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      </div>
    </div>
  );
};

// Main App
export default function CoachZen() {
  const today = formatDate(new Date());
  const [allData, setAllData] = useState({});
  const [weightData, setWeightData] = useState({});
  const [tab, setTab] = useState('today');
  const [dayData, setDayData] = useState(getDefaultDay());
  const [coachMessage, setCoachMessage] = useState(null);
  const [loaded, setLoaded] = useState(false);
  
  // Load data on mount
  useEffect(() => {
    const savedAll = loadData('cz_data', {});
    const savedWeight = loadData('cz_weight', {});
    setAllData(savedAll);
    setWeightData(savedWeight);
    setDayData(savedAll[today] || getDefaultDay());
    setLoaded(true);
    
    // Coach message
    const hour = new Date().getHours();
    let messages = COACH_MESSAGES.morning;
    if (hour >= 17 && hour < 21) messages = COACH_MESSAGES.lateAfternoon;
    if (hour >= 21 && hour < 23) messages = COACH_MESSAGES.treatTime;
    setCoachMessage(messages[Math.floor(Math.random() * messages.length)]);
  }, []);
  
  // Save data
  useEffect(() => {
    if (!loaded) return;
    const newAll = { ...allData, [today]: dayData };
    setAllData(newAll);
    saveData('cz_data', newAll);
  }, [dayData, loaded]);
  
  useEffect(() => {
    if (!loaded) return;
    saveData('cz_weight', weightData);
  }, [weightData, loaded]);
  
  const score = calcScore(dayData);
  const updateHabit = (k, v) => setDayData(p => ({ ...p, habits: { ...p.habits, [k]: v } }));
  const updateMovement = (k, v) => setDayData(p => ({ ...p, movement: { ...p.movement, [k]: v } }));
  
  // Styles
  const containerStyle = {
    minHeight: '100vh',
    background: '#0f172a',
    color: 'white',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: 100,
  };
  
  const contentStyle = {
    maxWidth: 480,
    margin: '0 auto',
    padding: '60px 20px 20px',
  };
  
  const headerStyle = {
    textAlign: 'center',
    marginBottom: 24,
  };
  
  const cardStyle = {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    border: '1px solid rgba(255,255,255,0.1)',
  };
  
  const navStyle = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(15, 23, 42, 0.95)',
    backdropFilter: 'blur(20px)',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    justifyContent: 'space-around',
    padding: '12px 0 24px',
  };
  
  const navButtonStyle = (isActive) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 8,
  });

  // Calculate streak
  const streak = useMemo(() => {
    let s = 0;
    const now = new Date();
    for (let i = 1; i <= 30; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const data = allData[formatDate(d)];
      if (data && calcScore(data) >= 50) s++;
      else break;
    }
    return s;
  }, [allData]);

  // Week data
  const weekDays = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, []);
  
  if (!loaded) {
    return <div style={containerStyle}><div style={contentStyle}><p>Chargement...</p></div></div>;
  }
  
  return (
    <div style={containerStyle}>
      {/* Background gradients */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -200, left: '20%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -100, right: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>
      
      <div style={{ ...contentStyle, position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 14, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px -5px rgba(139, 92, 246, 0.4)' }}>
            <span style={{ fontSize: 20 }}>🌿</span>
          </div>
          <span style={{ fontSize: 20, fontWeight: 'bold', background: 'linear-gradient(to right, #c4b5fd, #f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Coach Zen</span>
        </header>
        
        {/* Today Tab */}
        {tab === 'today' && (
          <>
            <div style={headerStyle}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>{getDayName(new Date())}</p>
              <h1 style={{ fontSize: 32, fontWeight: 'bold', margin: '8px 0', background: 'linear-gradient(to right, white, #e9d5ff, #fbcfe8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {new Date().getDate()} {getMonthName(new Date())}
              </h1>
            </div>
            
            <CoachBubble message={coachMessage} onDismiss={() => setCoachMessage(null)} />
            
            {/* Score Card */}
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 150, height: 150, background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)', borderRadius: '50%' }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>Score du jour</h2>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '8px 0' }}>
                    {score >= 80 ? '🔥 On fire!' : score >= 60 ? '💪 Solide' : score >= 40 ? '👍 En route' : '🌱 Ça pousse'}
                  </p>
                  {score >= 80 && (
                    <div style={{ display: 'inline-block', background: 'linear-gradient(to right, #10b981, #14b8a6)', padding: '6px 14px', borderRadius: 20 }}>
                      <span style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>OBJECTIF ATTEINT</span>
                    </div>
                  )}
                </div>
                <CircularProgress progress={score} />
              </div>
            </div>
            
            {/* Scoring Info */}
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1))', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 'bold', marginBottom: 12 }}>SCORING</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px 16px', fontSize: 14 }}>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Chaque habitude</span>
                <span style={{ color: '#10b981', fontWeight: 'bold', textAlign: 'right' }}>+20 pts</span>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Craquage coché</span>
                <span style={{ color: '#ec4899', fontWeight: 'bold', textAlign: 'right' }}>+20 pts ✓</span>
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>Sommeil ≥6h30</span>
                <span style={{ color: '#818cf8', fontWeight: 'bold', textAlign: 'right' }}>+10 pts</span>
              </div>
            </div>
            
            {/* Habits */}
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 'bold', marginBottom: 12, letterSpacing: 1 }}>🍽️ PLAN ALIMENTAIRE</p>
            {Object.entries(MEALS).map(([k, meal]) => (
              <HabitCard key={k} meal={meal} id={k} checked={dayData.habits[k]} onChange={v => updateHabit(k, v)} />
            ))}
            
            {/* Energy */}
            <div style={cardStyle}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 16 }}>⚡ Énergie</p>
              <EnergySelector value={dayData.energy} onChange={v => setDayData(p => ({ ...p, energy: v }))} />
            </div>
            
            {/* Sleep */}
            <div style={cardStyle}>
              <Slider value={dayData.sleep} onChange={v => setDayData(p => ({ ...p, sleep: v }))} min={0} max={9} step={0.5} label="Sommeil" unit="h" color="linear-gradient(to right, #818cf8, #a855f7, #ec4899)" icon="🌙" />
              <Slider value={dayData.nap} onChange={v => setDayData(p => ({ ...p, nap: v }))} min={0} max={120} step={15} label="Sieste" unit="min" color="linear-gradient(to right, #f59e0b, #f97316, #ef4444)" icon="☀️" />
            </div>
            
            {/* Movement */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => updateMovement('workout', !dayData.movement?.workout)}
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 16,
                  border: 'none',
                  cursor: 'pointer',
                  background: dayData.movement?.workout ? 'linear-gradient(135deg, #ec4899, #f43f5e)' : 'rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: dayData.movement?.workout ? '0 8px 20px -5px rgba(236, 72, 153, 0.4)' : 'none',
                }}
              >
                <span style={{ fontSize: 20 }}>🏋️</span>
                <span style={{ color: dayData.movement?.workout ? 'white' : 'rgba(255,255,255,0.5)', fontWeight: '500' }}>Muscu</span>
                {dayData.movement?.workout && <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>+5</span>}
              </button>
              <button
                onClick={() => updateMovement('walk', !dayData.movement?.walk)}
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 16,
                  border: 'none',
                  cursor: 'pointer',
                  background: dayData.movement?.walk ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: dayData.movement?.walk ? '0 8px 20px -5px rgba(6, 182, 212, 0.4)' : 'none',
                }}
              >
                <span style={{ fontSize: 20 }}>🚶</span>
                <span style={{ color: dayData.movement?.walk ? 'white' : 'rgba(255,255,255,0.5)', fontWeight: '500' }}>Marche</span>
                {dayData.movement?.walk && <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>+5</span>}
              </button>
            </div>
          </>
        )}
        
        {/* Week Tab */}
        {tab === 'week' && (
          <>
            <h1 style={{ fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, background: 'linear-gradient(to right, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Semaine</h1>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', borderRadius: 24, padding: 20, textAlign: 'center', boxShadow: '0 10px 30px -10px rgba(139, 92, 246, 0.4)' }}>
                <p style={{ fontSize: 48, fontWeight: 'bold', margin: 0 }}>{streak}</p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: '4px 0 0' }}>🔥 jours</p>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', borderRadius: 24, padding: 20, textAlign: 'center', boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.4)' }}>
                <p style={{ fontSize: 48, fontWeight: 'bold', margin: 0 }}>
                  {weekDays.map(d => allData[formatDate(d)]).filter(Boolean).length > 0 
                    ? Math.round(weekDays.map(d => allData[formatDate(d)]).filter(Boolean).map(calcScore).reduce((a,b) => a+b, 0) / weekDays.map(d => allData[formatDate(d)]).filter(Boolean).length)
                    : 0}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: '4px 0 0' }}>moyenne</p>
              </div>
            </div>
            
            <div style={cardStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                {weekDays.map(d => {
                  const key = formatDate(d);
                  const data = allData[key];
                  const dayScore = data ? calcScore(data) : 0;
                  const isToday = key === today;
                  return (
                    <div key={key} style={{ textAlign: 'center', padding: 8, borderRadius: 16, background: isToday ? 'linear-gradient(135deg, #8b5cf6, #a855f7)' : 'transparent' }}>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{getDayName(d)}</p>
                      <p style={{ fontSize: 14, color: isToday ? 'white' : 'rgba(255,255,255,0.7)', margin: '6px 0', fontWeight: '500' }}>{d.getDate()}</p>
                      <div style={{
                        width: 40,
                        height: 40,
                        margin: '0 auto',
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 'bold',
                        background: !data ? 'rgba(255,255,255,0.05)' : dayScore >= 80 ? 'linear-gradient(135deg, #10b981, #14b8a6)' : dayScore >= 50 ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'rgba(255,255,255,0.1)',
                        color: !data ? 'rgba(255,255,255,0.3)' : 'white',
                        boxShadow: data && dayScore >= 50 ? '0 4px 12px -4px rgba(0,0,0,0.3)' : 'none',
                      }}>
                        {data ? dayScore : '–'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
        
        {/* Plan Tab */}
        {tab === 'plan' && (
          <>
            <h1 style={{ fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, background: 'linear-gradient(to right, #fbbf24, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Mon Plan</h1>
            
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1))', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>
                <span style={{ marginRight: 8 }}>🧠</span>
                Plan <strong style={{ color: 'white' }}>simple et fixe</strong>. Pas de décisions à prendre.
              </p>
            </div>
            
            {Object.entries(MEALS).map(([k, meal]) => (
              <div key={k} style={{ background: `linear-gradient(135deg, ${meal.colors[0]}, ${meal.colors[1]})`, borderRadius: 24, padding: 20, marginBottom: 16, boxShadow: `0 10px 30px -10px ${meal.colors[0]}60` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                    {meal.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: 18, fontWeight: 'bold', margin: 0 }}>{meal.title}</p>
                      <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 20 }}>{meal.time}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                      {meal.items.map((item, i) => (
                        <span key={i} style={{ fontSize: 12, background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: 20 }}>{item}</span>
                      ))}
                    </div>
                    <p style={{ marginTop: 12, fontWeight: 'bold' }}>+{meal.points} points</p>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        
        {/* Stats Tab */}
        {tab === 'stats' && (
          <>
            <h1 style={{ fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, background: 'linear-gradient(to right, #10b981, #14b8a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Stats</h1>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)', borderRadius: 24, padding: 20, textAlign: 'center', boxShadow: '0 10px 30px -10px rgba(16, 185, 129, 0.4)' }}>
                <p style={{ fontSize: 40, fontWeight: 'bold', margin: 0 }}>{Object.keys(allData).length}</p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: '4px 0 0' }}>jours trackés</p>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)', borderRadius: 24, padding: 20, textAlign: 'center', boxShadow: '0 10px 30px -10px rgba(236, 72, 153, 0.4)' }}>
                <p style={{ fontSize: 40, fontWeight: 'bold', margin: 0 }}>{streak}</p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: '4px 0 0' }}>🔥 streak</p>
              </div>
            </div>
            
            <div style={cardStyle}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 16 }}>📈 Derniers jours</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (6 - i));
                  const data = allData[formatDate(d)];
                  const dayScore = data ? calcScore(data) : 0;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: '100%',
                        height: dayScore,
                        background: dayScore >= 80 ? 'linear-gradient(to top, #10b981, #34d399)' : dayScore >= 50 ? 'linear-gradient(to top, #f59e0b, #fbbf24)' : 'rgba(255,255,255,0.1)',
                        borderRadius: 6,
                        transition: 'height 0.5s ease',
                      }} />
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{d.getDate()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Navigation */}
      <nav style={navStyle}>
        {[
          { id: 'today', icon: '🏠', label: "Aujourd'hui", colors: ['#8b5cf6', '#a855f7'] },
          { id: 'week', icon: '📅', label: 'Semaine', colors: ['#06b6d4', '#3b82f6'] },
          { id: 'plan', icon: '📖', label: 'Plan', colors: ['#f59e0b', '#f97316'] },
          { id: 'stats', icon: '📊', label: 'Stats', colors: ['#10b981', '#14b8a6'] },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={navButtonStyle(tab === t.id)}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: tab === t.id ? `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})` : 'transparent',
              boxShadow: tab === t.id ? `0 6px 15px -5px ${t.colors[0]}60` : 'none',
              transform: tab === t.id ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.3s ease',
            }}>
              <span style={{ fontSize: 20 }}>{t.icon}</span>
            </div>
            <span style={{ fontSize: 10, fontWeight: '500', color: tab === t.id ? 'white' : 'rgba(255,255,255,0.4)' }}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
