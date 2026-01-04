'use client';

import React, { useState, useEffect, useMemo } from 'react';

const formatDate = (d) => d.toISOString().split('T')[0];
const getDayName = (d) => ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()];
const getMonthName = (d) => ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][d.getMonth()];
const loadData = (k, def) => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : def; } catch { return def; }};
const saveData = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const getDefaultDay = () => ({ habits: { breakfast: false, lunch: false, snack: false, dinner: false, plannedTreat: false }, sleep: 7, nap: 0, energy: 3, movement: { workout: false, walk: false, run: false }, ecarts: { petit: 0, moyen: 0, gros: 0 } });
const getEcartsCount = (e) => (e?.petit || 0) + (e?.moyen || 0) + (e?.gros || 0);
const getEcartsKcal = (e) => ((e?.petit || 0) * 300) + ((e?.moyen || 0) * 600) + ((e?.gros || 0) * 1000);
const calcScore = (d) => { 
  let s = 0; 
  if(d?.habits) Object.values(d.habits).forEach(c => { if(c) s += 20; }); 
  if(d?.sleep >= 6.5) s += 10; 
  if(d?.nap >= 60) s += 5; 
  if(d?.movement?.workout) s += 5; 
  if(d?.movement?.walk) s += 5; 
  if(d?.movement?.run) s += 5;
  s -= getEcartsCount(d?.ecarts) * 10;
  return Math.max(0, Math.min(s, 100)); 
};

const calcBMR = (profile) => {
  if (!profile.poids || !profile.taille || !profile.age) return 0;
  if (profile.sexe === 'homme') return Math.round(10 * profile.poids + 6.25 * profile.taille - 5 * profile.age + 5);
  return Math.round(10 * profile.poids + 6.25 * profile.taille - 5 * profile.age - 161);
};

const calcTDEE = (bmr, activity) => {
  const factors = { sedentaire: 1.2, leger: 1.375, modere: 1.55, actif: 1.725, intense: 1.9 };
  return Math.round(bmr * (factors[activity] || 1.55));
};

const isMonday = () => new Date().getDay() === 1;
const getWeekNumber = (d) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

const MEALS = {
  breakfast: { title: 'Petit-déjeuner', time: 'Matin', items: ['6 oeufs', 'Café', 'Eau + sel'], emoji: '🍳', colors: ['#f97316', '#f59e0b'], points: 20, kcal: 450 },
  lunch: { title: 'Déjeuner', time: 'Midi', items: ['250g riz', '300g protéine', 'Légumes'], emoji: '🥗', colors: ['#10b981', '#14b8a6'], points: 20, kcal: 850 },
  snack: { title: 'Collation', time: 'Pré-sieste', items: ['Yaourt grec', 'ou oeuf + amandes'], emoji: '🥜', colors: ['#8b5cf6', '#a855f7'], points: 20, kcal: 200 },
  dinner: { title: 'Dîner', time: '< 20h30', items: ['250g riz', '300g protéine', 'Légumes'], emoji: '🍲', colors: ['#3b82f6', '#6366f1'], points: 20, kcal: 850 },
  plannedTreat: { title: 'Craquage', time: '21h-22h', items: ['Autorisé', 'Zéro culpabilité'], emoji: '🍫', colors: ['#ec4899', '#f43f5e'], points: 20, kcal: 300 },
};

const ECARTS = [
  { id: 'petit', emoji: '🍪', label: 'Petit', desc: 'Snack, grignotage', kcal: 300, color: '#f59e0b' },
  { id: 'moyen', emoji: '🍔', label: 'Moyen', desc: 'Fast food, resto', kcal: 600, color: '#f97316' },
  { id: 'gros', emoji: '🍕', label: 'Gros', desc: 'Grosse bouffe', kcal: 1000, color: '#ef4444' },
];

const CircularProgress = ({ progress, size = 100 }) => {
  const sw = 10, r = (size - sw) / 2, c = r * 2 * Math.PI, o = c - (progress / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs><linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ec4899" /><stop offset="50%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#10b981" /></linearGradient></defs>
        <circle cx={size/2} cy={size/2} r={r} fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="transparent" stroke="url(#pg)" strokeWidth={sw} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={o} style={{ transition: 'stroke-dashoffset 0.5s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 36, fontWeight: 'bold', background: 'linear-gradient(to right, #f472b6, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{Math.round(progress)}</span>
      </div>
    </div>
  );
};

const KcalProgress = ({ consumed, target, ecarts }) => {
  const ecartsKcal = getEcartsKcal(ecarts);
  const total = consumed + ecartsKcal;
  const pct = target > 0 ? Math.min((total / target) * 100, 120) : 0;
  const diff = target - total;
  const isDeficit = diff > 0;
  const isMaintenance = Math.abs(diff) <= 100;
  
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 14, marginBottom: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>🔥 Calories</span>
          <div style={{ 
            padding: '4px 10px', 
            borderRadius: 20, 
            background: isMaintenance ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : isDeficit ? 'linear-gradient(135deg, #10b981, #14b8a6)' : 'linear-gradient(135deg, #ef4444, #f97316)',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <span style={{ fontSize: 12 }}>{isMaintenance ? '⚖️' : isDeficit ? '📉' : '📈'}</span>
            <span style={{ fontSize: 11, fontWeight: 'bold', color: 'white' }}>
              {isMaintenance ? 'Maintien' : isDeficit ? 'Déficit' : 'Surplus'}
            </span>
          </div>
        </div>
        <span style={{ fontSize: 16, fontWeight: 'bold', color: isDeficit ? '#10b981' : '#ef4444' }}>{total} / {target}</span>
      </div>
      
      <div style={{ height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', left: `${Math.min(100, (target / (target * 1.2)) * 100)}%`, top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,0.5)', zIndex: 2 }} />
        <div style={{ display: 'flex', height: '100%' }}>
          <div style={{ height: '100%', background: 'linear-gradient(to right, #10b981, #14b8a6)', width: `${Math.min((consumed / (target * 1.2)) * 100, 100)}%`, transition: 'width 0.5s' }} />
          {ecartsKcal > 0 && <div style={{ height: '100%', background: 'linear-gradient(to right, #f97316, #ef4444)', width: `${Math.min((ecartsKcal / (target * 1.2)) * 100, 100)}%`, transition: 'width 0.5s' }} />}
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
          Plan: {consumed} {ecartsKcal > 0 && <span style={{ color: '#f97316' }}>+ {ecartsKcal} écarts</span>}
        </span>
        <span style={{ fontSize: 11, fontWeight: 'bold', color: isMaintenance ? '#3b82f6' : isDeficit ? '#10b981' : '#ef4444' }}>
          {isMaintenance ? '≈ Équilibre' : isDeficit ? `−${diff} kcal` : `+${Math.abs(diff)} kcal`}
        </span>
      </div>
      
      <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: isMaintenance ? 'rgba(59,130,246,0.1)' : isDeficit ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
        <p style={{ fontSize: 11, color: isMaintenance ? '#60a5fa' : isDeficit ? '#34d399' : '#fca5a5', margin: 0, textAlign: 'center' }}>
          {isMaintenance 
            ? '⚖️ Tu maintiens ton poids actuel' 
            : isDeficit 
              ? `📉 Tu perds environ ${Math.round(diff / 7700 * 100) / 100} kg cette semaine à ce rythme`
              : `📈 Tu prends environ ${Math.round(Math.abs(diff) / 7700 * 100) / 100} kg cette semaine à ce rythme`
          }
        </p>
      </div>
    </div>
  );
};

const WeighInReminder = ({ onWeighIn, lastWeighIn }) => {
  const today = formatDate(new Date());
  const alreadyWeighedThisWeek = lastWeighIn && getWeekNumber(lastWeighIn) === getWeekNumber(today);
  
  if (!isMonday() || alreadyWeighedThisWeek) return null;
  
  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(59,130,246,0.2))', borderRadius: 16, padding: 14, marginBottom: 12, border: '1px solid rgba(6,182,212,0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 20 }}>⚖️</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 'bold', color: 'white', margin: 0 }}>Pesée du lundi</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0' }}>C'est le moment de te peser !</p>
        </div>
        <button onClick={onWeighIn} style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>
          <span style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Peser</span>
        </button>
      </div>
    </div>
  );
};

const WeightModal = ({ isOpen, onClose, onSave, currentWeight }) => {
  const [weight, setWeight] = useState(currentWeight || 75);
  
  if (!isOpen) return null;
  
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#1e293b', borderRadius: 20, padding: 20, maxWidth: 320, width: '100%' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: '0 0 16px', textAlign: 'center', background: 'linear-gradient(to right, #06b6d4, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>⚖️ Pesée</h2>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>Ton poids aujourd'hui</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setWeight(w => Math.max(40, w - 0.1))} style={{ width: 44, height: 44, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 20 }}>−</button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: 36, fontWeight: 'bold', color: 'white' }}>{weight.toFixed(1)}</span>
              <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>kg</span>
            </div>
            <button onClick={() => setWeight(w => Math.min(200, w + 0.1))} style={{ width: 44, height: 44, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 20 }}>+</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 14 }}>Annuler</button>
          <button onClick={() => { onSave(weight); onClose(); }} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: 'white', fontSize: 14, fontWeight: 'bold' }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
};

const WeightChart = ({ weightHistory }) => {
  if (!weightHistory || weightHistory.length === 0) return null;
  
  const sorted = [...weightHistory].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-12);
  const weights = sorted.map(w => w.weight);
  const min = Math.min(...weights) - 1;
  const max = Math.max(...weights) + 1;
  const range = max - min || 1;
  
  const first = weights[0];
  const last = weights[weights.length - 1];
  const diff = last - first;
  
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 14, marginBottom: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0, fontWeight: 'bold' }}>⚖️ ÉVOLUTION POIDS</p>
        {weights.length >= 2 && (
          <div style={{ padding: '4px 10px', borderRadius: 8, background: diff <= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)' }}>
            <span style={{ fontSize: 12, fontWeight: 'bold', color: diff <= 0 ? '#10b981' : '#ef4444' }}>
              {diff <= 0 ? '📉' : '📈'} {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
            </span>
          </div>
        )}
      </div>
      
      <div style={{ height: 80, display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 8 }}>
        {sorted.map((w, i) => {
          const height = ((w.weight - min) / range) * 60 + 10;
          const isLast = i === sorted.length - 1;
          return (
            <div key={w.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>{w.weight}</span>
              <div style={{ 
                width: '100%', 
                height, 
                background: isLast ? 'linear-gradient(to top, #06b6d4, #3b82f6)' : 'linear-gradient(to top, rgba(6,182,212,0.3), rgba(59,130,246,0.3))', 
                borderRadius: 4 
              }} />
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>S{getWeekNumber(w.date)}</span>
            </div>
          );
        })}
      </div>
      
      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0, textAlign: 'center' }}>
        {sorted.length} pesée{sorted.length > 1 ? 's' : ''} • {sorted[0]?.weight}kg → {sorted[sorted.length - 1]?.weight}kg
      </p>
    </div>
  );
};

const HabitCard = ({ meal, checked, onChange }) => (
  <button onClick={() => onChange(!checked)} style={{ width: '100%', padding: 3, borderRadius: 18, background: `linear-gradient(135deg, ${meal.colors[0]}, ${meal.colors[1]})`, border: 'none', cursor: 'pointer', marginBottom: 10, transform: checked ? 'scale(0.98)' : 'scale(1)', transition: 'all 0.2s' }}>
    <div style={{ background: checked ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.95)', borderRadius: 15, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: checked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{checked ? '✓' : meal.emoji}</div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <p style={{ fontSize: 16, fontWeight: 'bold', color: 'white', margin: 0 }}>{meal.title}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0' }}>{meal.time} • {meal.kcal} kcal</p>
        </div>
        <div style={{ padding: '6px 12px', borderRadius: 10, background: checked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>{checked ? '✓' : `+${meal.points}`}</span>
        </div>
      </div>
    </div>
  </button>
);

const EcartsSection = ({ ecarts, onChange }) => {
  const updateEcart = (type, delta) => {
    const current = ecarts?.[type] || 0;
    const newVal = Math.max(0, current + delta);
    onChange({ ...ecarts, [type]: newVal });
  };
  const totalKcal = getEcartsKcal(ecarts);
  const totalCount = getEcartsCount(ecarts);
  
  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(249,115,22,0.1))', borderRadius: 16, padding: 12, marginBottom: 12, border: '1px solid rgba(239,68,68,0.2)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 'bold', color: 'white', margin: 0 }}>🍔 Écarts</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0' }}>-10 pts par écart</p>
        </div>
        {totalCount > 0 && (
          <div style={{ background: 'rgba(239,68,68,0.3)', padding: '4px 10px', borderRadius: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 'bold', color: '#fca5a5' }}>{totalCount}x = +{totalKcal} kcal</span>
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {ECARTS.map(e => {
          const count = ecarts?.[e.id] || 0;
          return (
            <div key={e.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 10 }}>
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{e.emoji}</span>
                <p style={{ fontSize: 12, fontWeight: 'bold', color: 'white', margin: '4px 0 0' }}>{e.label}</p>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>{e.kcal} kcal</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <button onClick={() => updateEcart(e.id, -1)} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 16 }}>−</button>
                <span style={{ fontSize: 18, fontWeight: 'bold', color: count > 0 ? e.color : 'white', minWidth: 24, textAlign: 'center' }}>{count}</span>
                <button onClick={() => updateEcart(e.id, 1)} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer', background: `${e.color}40`, color: 'white', fontSize: 16 }}>+</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const EnergySelector = ({ value, onChange }) => {
  const levels = [{ v: 1, e: '😴', l: 'KO', c: ['#ef4444', '#f97316'] }, { v: 2, e: '😔', l: 'Dur', c: ['#f97316', '#f59e0b'] }, { v: 3, e: '😐', l: 'OK', c: ['#eab308', '#84cc16'] }, { v: 4, e: '🙂', l: 'Bien', c: ['#84cc16', '#22c55e'] }, { v: 5, e: '💪', l: 'Top', c: ['#22c55e', '#14b8a6'] }];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
      {levels.map(l => (
        <button key={l.v} onClick={() => onChange(l.v)} style={{ padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: value === l.v ? `linear-gradient(135deg, ${l.c[0]}, ${l.c[1]})` : 'rgba(255,255,255,0.05)', transform: value === l.v ? 'scale(1.05)' : 'scale(1)', transition: 'all 0.2s' }}>
          <span style={{ fontSize: 24 }}>{l.e}</span>
          <span style={{ fontSize: 10, fontWeight: 'bold', color: value === l.v ? 'white' : 'rgba(255,255,255,0.4)' }}>{l.l}</span>
        </button>
      ))}
    </div>
  );
};

const Slider = ({ value, onChange, min, max, step, label, unit, color, icon }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{icon} {label}</span>
      <span style={{ fontSize: 16, fontWeight: 'bold', color: 'white' }}>{value}{unit}</span>
    </div>
    <div style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
      <div style={{ height: '100%', borderRadius: 4, background: color, width: `${((value - min) / (max - min)) * 100}%` }} />
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
    </div>
  </div>
);

const CoachBubble = ({ message, onDismiss }) => {
  if (!message) return null;
  return (
    <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', padding: 2, borderRadius: 16, marginBottom: 12 }}>
      <div style={{ background: 'rgba(15,23,42,0.95)', borderRadius: 14, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Z</span></div>
          <p style={{ flex: 1, fontSize: 14, color: 'white', margin: 0, lineHeight: 1.5 }}>{message}</p>
          <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18, padding: 0 }}>×</button>
        </div>
      </div>
    </div>
  );
};

const ProfileInput = ({ label, value, onChange, type = 'number', options }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 6 }}>{label}</label>
    {options ? (
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 14 }}>
        {options.map(o => <option key={o.value} value={o.value} style={{ background: '#1e293b' }}>{o.label}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 14, boxSizing: 'border-box' }} />
    )}
  </div>
);

const MiniChart = ({ data, height = 60 }) => {
  const max = Math.max(...data.map(d => d.score), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ width: '100%', height: Math.max(4, (d.score / max) * height * 0.8), background: d.score >= 80 ? 'linear-gradient(to top, #10b981, #34d399)' : d.score >= 50 ? 'linear-gradient(to top, #f59e0b, #fbbf24)' : d.score > 0 ? 'linear-gradient(to top, #ef4444, #f87171)' : 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
};

const AnalysisModal = ({ isOpen, onClose, analysis, loading, period, onChangePeriod }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#1e293b', borderRadius: 20, padding: 20, maxWidth: 380, width: '100%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: 0, background: 'linear-gradient(to right, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🤖 Analyse IA</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={() => onChangePeriod('week')} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', background: period === 'week' ? 'linear-gradient(135deg, #8b5cf6, #a855f7)' : 'rgba(255,255,255,0.1)', color: 'white', fontSize: 14, fontWeight: 'bold' }}>7 jours</button>
          <button onClick={() => onChangePeriod('month')} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', background: period === 'month' ? 'linear-gradient(135deg, #8b5cf6, #a855f7)' : 'rgba(255,255,255,0.1)', color: 'white', fontSize: 14, fontWeight: 'bold' }}>30 jours</button>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(139,92,246,0.3)', borderTopColor: '#8b5cf6', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Analyse en cours...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{analysis}</div>
        )}
      </div>
    </div>
  );
};

export default function CoachZen() {
  const realToday = formatDate(new Date());
  const [selectedDate, setSelectedDate] = useState(realToday);
  const [allData, setAllData] = useState({});
  const [tab, setTab] = useState('today');
  const [dayData, setDayData] = useState(getDefaultDay());
  const [coachMessage, setCoachMessage] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState({ poids: 75, taille: 175, age: 30, sexe: 'homme', activite: 'modere' });
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisPeriod, setAnalysisPeriod] = useState('week');
  const [weightHistory, setWeightHistory] = useState([]);
  const [showWeightModal, setShowWeightModal] = useState(false);

  const isToday = selectedDate === realToday;

  useEffect(() => {
    const saved = loadData('cz_data', {});
    const savedProfile = loadData('cz_profile', { poids: 75, taille: 175, age: 30, sexe: 'homme', activite: 'modere' });
    const savedWeight = loadData('cz_weight', []);
    setAllData(saved);
    setProfile(savedProfile);
    setWeightHistory(savedWeight);
    setDayData(saved[realToday] || getDefaultDay());
    setLoaded(true);
    
    const fetchCoach = async () => {
      try {
        const res = await fetch('/api/coach/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ energy: saved[realToday]?.energy || 3, score: calcScore(saved[realToday]), slot: new Date().getHours() >= 21 ? 'treatTime' : new Date().getHours() >= 17 ? 'lateAfternoon' : 'morning' }) });
        const data = await res.json();
        setCoachMessage(data.message || "Le plan commence.");
      } catch { setCoachMessage("Le plan commence."); }
    };
    fetchCoach();
  }, []);

  useEffect(() => {
    if (loaded && allData[selectedDate]) setDayData(allData[selectedDate]);
    else if (loaded) setDayData(getDefaultDay());
  }, [selectedDate, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const newAll = { ...allData, [selectedDate]: dayData };
    setAllData(newAll);
    saveData('cz_data', newAll);
  }, [dayData, loaded]);

  useEffect(() => { if (loaded) saveData('cz_profile', profile); }, [profile, loaded]);
  useEffect(() => { if (loaded) saveData('cz_weight', weightHistory); }, [weightHistory, loaded]);

  const saveWeight = (weight) => {
    const today = formatDate(new Date());
    const newHistory = weightHistory.filter(w => w.date !== today);
    newHistory.push({ date: today, weight });
    setWeightHistory(newHistory);
    setProfile(p => ({ ...p, poids: weight }));
  };

  const lastWeighIn = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1]?.date : null;

  const fetchAnalysis = async (period) => {
    setAnalysisLoading(true);
    setAnalysisPeriod(period);
    try {
      const res = await fetch('/api/coach/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ allData, profile, period, weightHistory }) });
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch { setAnalysis("Erreur lors de l'analyse."); }
    setAnalysisLoading(false);
  };

  const openAnalysis = (period = 'week') => { setShowAnalysis(true); fetchAnalysis(period); };

  const score = calcScore(dayData);
  const totalKcal = Object.entries(MEALS).reduce((sum, [k, m]) => dayData.habits[k] ? sum + m.kcal : sum, 0);
  const bmr = calcBMR(profile);
  const tdee = calcTDEE(bmr, profile.activite);
  const updateHabit = (k, v) => setDayData(p => ({ ...p, habits: { ...p.habits, [k]: v } }));
  const updateMovement = (k, v) => setDayData(p => ({ ...p, movement: { ...p.movement, [k]: v } }));
  const updateProfile = (k, v) => setProfile(p => ({ ...p, [k]: v }));

  const streak = useMemo(() => { let s = 0; for (let i = 1; i <= 30; i++) { const d = new Date(); d.setDate(d.getDate() - i); if (allData[formatDate(d)] && calcScore(allData[formatDate(d)]) >= 50) s++; else break; } return s; }, [allData]);

  const last14Days = useMemo(() => Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (13 - i)); return d; }), []);

  const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return { date: formatDate(d), score: allData[formatDate(d)] ? calcScore(allData[formatDate(d)]) : 0, label: d.getDate().toString() }; }), [allData]);

  const weeklyAvg = useMemo(() => {
    const weeks = [];
    for (let w = 0; w < 4; w++) {
      const weekData = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date();
        date.setDate(date.getDate() - (w * 7 + d));
        const data = allData[formatDate(date)];
        if (data) weekData.push(calcScore(data));
      }
      weeks.unshift({ label: `S-${w}`, score: weekData.length > 0 ? Math.round(weekData.reduce((a, b) => a + b, 0) / weekData.length) : 0 });
    }
    return weeks;
  }, [allData]);

  const monthAvg = useMemo(() => { const scores = Object.entries(allData).slice(-30).map(([,d]) => calcScore(d)).filter(s => s > 0); return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0; }, [allData]);

  const selectedDateObj = new Date(selectedDate + 'T12:00:00');

  const container = { minHeight: '100vh', minHeight: '100dvh', background: '#0f172a', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 90, touchAction: 'pan-x pan-y' };
  const content = { maxWidth: 500, margin: '0 auto', padding: '12px 16px 20px', position: 'relative', zIndex: 10 };
  const card = { background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 14, marginBottom: 12, border: '1px solid rgba(255,255,255,0.1)' };
  const nav = { position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(15,23,42,0.98)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-around', padding: '8px 0', paddingBottom: 'max(16px, env(safe-area-inset-bottom))', zIndex: 9999 };

  if (!loaded) return <div style={container}><div style={content}><p>Chargement...</p></div></div>;

  return (
    <div style={container}>
      <div style={content}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 16 }}>🌿</span></div>
            <span style={{ fontSize: 18, fontWeight: 'bold', background: 'linear-gradient(to right, #c4b5fd, #f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Coach Zen</span>
          </div>
          <button onClick={() => openAnalysis('week')} style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14 }}>🤖</span>
            <span style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Analyse</span>
          </button>
        </header>

        {tab === 'today' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              {!isToday && (
                <button onClick={() => setSelectedDate(realToday)} style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, padding: '6px 14px', marginBottom: 8, cursor: 'pointer' }}>
                  <span style={{ color: '#a78bfa', fontSize: 12 }}>← Retour à aujourd'hui</span>
                </button>
              )}
              <p style={{ color: isToday ? 'rgba(255,255,255,0.4)' : '#f59e0b', fontSize: 12, margin: 0 }}>{isToday ? getDayName(selectedDateObj) : '⚠️ Édition'}</p>
              <h1 style={{ fontSize: 26, fontWeight: 'bold', margin: '4px 0', background: isToday ? 'linear-gradient(to right, white, #e9d5ff)' : 'linear-gradient(to right, #fbbf24, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{selectedDateObj.getDate()} {getMonthName(selectedDateObj)}</h1>
            </div>

            {isToday && <WeighInReminder onWeighIn={() => setShowWeightModal(true)} lastWeighIn={lastWeighIn} />}
            {isToday && <CoachBubble message={coachMessage} onDismiss={() => setCoachMessage(null)} />}

            <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>Score {isToday ? 'du jour' : ''}</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '4px 0' }}>{score >= 80 ? '🔥 On fire!' : score >= 60 ? '💪 Solide' : score >= 40 ? '👍 En route' : '🌱 Ça pousse'}</p>
              </div>
              <CircularProgress progress={score} size={100} />
            </div>

            <KcalProgress consumed={totalKcal} target={tdee} ecarts={dayData.ecarts} />

            {Object.entries(MEALS).map(([k, m]) => <HabitCard key={k} meal={m} checked={dayData.habits[k]} onChange={v => updateHabit(k, v)} />)}

            <EcartsSection ecarts={dayData.ecarts || { petit: 0, moyen: 0, gros: 0 }} onChange={e => setDayData(p => ({ ...p, ecarts: e }))} />

            <div style={card}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 10 }}>⚡ Énergie</p>
              <EnergySelector value={dayData.energy} onChange={v => setDayData(p => ({ ...p, energy: v }))} />
            </div>

            <div style={card}>
              <Slider value={dayData.sleep} onChange={v => setDayData(p => ({ ...p, sleep: v }))} min={0} max={9} step={0.5} label="Sommeil" unit="h" color="linear-gradient(to right, #818cf8, #ec4899)" icon="🌙" />
              <Slider value={dayData.nap} onChange={v => setDayData(p => ({ ...p, nap: v }))} min={0} max={120} step={15} label="Sieste" unit="min" color="linear-gradient(to right, #f59e0b, #ef4444)" icon="☀️" />
            </div>

            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 8 }}>🏃 Activité (+5 pts)</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <button onClick={() => updateMovement('workout', !dayData.movement?.workout)} style={{ padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', background: dayData.movement?.workout ? 'linear-gradient(135deg, #ec4899, #f43f5e)' : 'rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 24 }}>🏋️</span>
                <span style={{ color: dayData.movement?.workout ? 'white' : 'rgba(255,255,255,0.5)', fontSize: 12 }}>Muscu</span>
              </button>
              <button onClick={() => updateMovement('run', !dayData.movement?.run)} style={{ padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', background: dayData.movement?.run ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 24 }}>🏃</span>
                <span style={{ color: dayData.movement?.run ? 'white' : 'rgba(255,255,255,0.5)', fontSize: 12 }}>Course</span>
              </button>
              <button onClick={() => updateMovement('walk', !dayData.movement?.walk)} style={{ padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', background: dayData.movement?.walk ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 24 }}>🚶</span>
                <span style={{ color: dayData.movement?.walk ? 'white' : 'rgba(255,255,255,0.5)', fontSize: 12 }}>Marche</span>
              </button>
            </div>
          </>
        )}

        {tab === 'week' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 14, background: 'linear-gradient(to right, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Semaine</h1>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', borderRadius: 16, padding: 16, textAlign: 'center' }}><p style={{ fontSize: 32, fontWeight: 'bold', margin: 0 }}>{streak}</p><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>🔥 streak</p></div>
              <div style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', borderRadius: 16, padding: 16, textAlign: 'center' }}><p style={{ fontSize: 32, fontWeight: 'bold', margin: 0 }}>{monthAvg}</p><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>moy/30j</p></div>
            </div>
            <div style={card}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 10 }}>📅 Clique pour éditer un jour</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {last14Days.map(d => { const k = formatDate(d), data = allData[k], s = data ? calcScore(data) : 0, isSel = k === selectedDate, isT = k === realToday; return (
                  <button key={k} onClick={() => { setSelectedDate(k); setTab('today'); }} style={{ textAlign: 'center', padding: 6, borderRadius: 10, background: isSel ? 'linear-gradient(135deg, #8b5cf6, #a855f7)' : isT ? 'rgba(139,92,246,0.3)' : 'transparent', border: 'none', cursor: 'pointer' }}>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{getDayName(d)}</p>
                    <p style={{ fontSize: 12, margin: '3px 0', fontWeight: '500', color: isSel || isT ? 'white' : 'rgba(255,255,255,0.7)' }}>{d.getDate()}</p>
                    <div style={{ width: 26, height: 26, margin: '0 auto', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 'bold', background: !data ? 'rgba(255,255,255,0.05)' : s >= 80 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444', color: !data ? 'rgba(255,255,255,0.3)' : 'white' }}>{data ? s : '–'}</div>
                  </button>
                ); })}
              </div>
            </div>
          </>
        )}

        {tab === 'plan' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 14, background: 'linear-gradient(to right, #fbbf24, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Mon Plan</h1>
            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))' }}><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>Total: <strong style={{ color: '#10b981' }}>{Object.values(MEALS).reduce((s,m) => s + m.kcal, 0)} kcal</strong> • TDEE: <strong style={{ color: '#06b6d4' }}>{tdee} kcal</strong></p></div>
            {Object.entries(MEALS).map(([k, m]) => (
              <div key={k} style={{ background: `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})`, borderRadius: 16, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{m.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><p style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>{m.title}</p><span style={{ fontSize: 12, background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 8 }}>{m.kcal} kcal</span></div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>{m.items.map((i, x) => <span key={x} style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: 6 }}>{i}</span>)}</div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'stats' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 14, background: 'linear-gradient(to right, #10b981, #14b8a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Stats & Profil</h1>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
              <div style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)', borderRadius: 14, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 26, fontWeight: 'bold', margin: 0 }}>{Object.keys(allData).length}</p><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>jours</p></div>
              <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', borderRadius: 14, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 26, fontWeight: 'bold', margin: 0 }}>{streak}</p><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>🔥 streak</p></div>
              <div style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: 14, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 26, fontWeight: 'bold', margin: 0 }}>{monthAvg}</p><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>moy</p></div>
            </div>

            <WeightChart weightHistory={weightHistory} />

            <button onClick={() => setShowWeightModal(true)} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>⚖️</span>
              <span style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>Enregistrer mon poids</span>
            </button>

            <div style={card}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 10, fontWeight: 'bold' }}>📈 7 DERNIERS JOURS</p>
              <MiniChart data={last7Days} height={60} />
            </div>

            <div style={card}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 10, fontWeight: 'bold' }}>📊 MOYENNES / SEMAINE</p>
              <MiniChart data={weeklyAvg} height={60} />
            </div>

            <button onClick={() => openAnalysis('week')} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🤖</span>
              <span style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>Générer analyse IA</span>
            </button>

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(59,130,246,0.1))', border: '1px solid rgba(6,182,212,0.2)' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 10, fontWeight: 'bold' }}>⚙️ PROFIL</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ProfileInput label="Poids (kg)" value={profile.poids} onChange={v => updateProfile('poids', v)} />
                <ProfileInput label="Taille (cm)" value={profile.taille} onChange={v => updateProfile('taille', v)} />
                <ProfileInput label="Âge" value={profile.age} onChange={v => updateProfile('age', v)} />
                <ProfileInput label="Sexe" value={profile.sexe} onChange={v => updateProfile('sexe', v)} options={[{ value: 'homme', label: 'Homme' }, { value: 'femme', label: 'Femme' }]} />
              </div>
              <ProfileInput label="Activité" value={profile.activite} onChange={v => updateProfile('activite', v)} options={[{ value: 'sedentaire', label: 'Sédentaire' }, { value: 'leger', label: 'Léger' }, { value: 'modere', label: 'Modéré' }, { value: 'actif', label: 'Actif' }, { value: 'intense', label: 'Intense' }]} />
            </div>

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 10, fontWeight: 'bold' }}>🔥 MÉTABOLISME</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 24, fontWeight: 'bold', margin: 0, color: '#a78bfa' }}>{bmr}</p><p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>BMR</p></div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 24, fontWeight: 'bold', margin: 0, color: '#10b981' }}>{tdee}</p><p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>TDEE</p></div>
              </div>
            </div>
          </>
        )}
      </div>

      <nav style={nav}>
        {[{ id: 'today', icon: '🏠', label: "Aujourd'hui", c: ['#8b5cf6', '#a855f7'] }, { id: 'week', icon: '📅', label: 'Semaine', c: ['#06b6d4', '#3b82f6'] }, { id: 'plan', icon: '📖', label: 'Plan', c: ['#f59e0b', '#f97316'] }, { id: 'stats', icon: '⚙️', label: 'Profil', c: ['#10b981', '#14b8a6'] }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tab === t.id ? `linear-gradient(135deg, ${t.c[0]}, ${t.c[1]})` : 'transparent', transform: tab === t.id ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.2s' }}><span style={{ fontSize: 18 }}>{t.icon}</span></div>
            <span style={{ fontSize: 10, color: tab === t.id ? 'white' : 'rgba(255,255,255,0.4)' }}>{t.label}</span>
          </button>
        ))}
      </nav>

      <WeightModal isOpen={showWeightModal} onClose={() => setShowWeightModal(false)} onSave={saveWeight} currentWeight={profile.poids} />
      <AnalysisModal isOpen={showAnalysis} onClose={() => setShowAnalysis(false)} analysis={analysis} loading={analysisLoading} period={analysisPeriod} onChangePeriod={fetchAnalysis} />
    </div>
  );
}
