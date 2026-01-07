'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { saveToFirebase, loadFromFirebase } from '../lib/firebase';

const formatDate = (d) => d.toISOString().split('T')[0];
const getDayName = (d) => ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()];
const getMonthName = (d) => ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][d.getMonth()];

const loadLocal = (k, def) => { 
  if (typeof window === 'undefined') return def;
  try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : def; } catch { return def; }
};
const saveLocal = (k, v) => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.error('Save error:', e); }
};

const getDefaultDay = () => ({ 
  habits: { breakfast: false, fasting: false, lunch: false, snack: false, dinner: false, plannedTreat: false }, 
  sleep: 7, nap: 0, energy: 3, 
  movement: { workout: false, walk: false, run: false }, 
  ecarts: { petit: 0, moyen: 0, gros: 0 },
  customMeals: []
});

const getDefaultProfile = () => ({ poids: 75, taille: 175, age: 30, sexe: 'homme', activite: 'modere' });

const getEcartsCount = (e) => !e ? 0 : (e.petit || 0) + (e.moyen || 0) + (e.gros || 0);
const getEcartsKcal = (e) => !e ? 0 : ((e.petit || 0) * 300) + ((e.moyen || 0) * 600) + ((e.gros || 0) * 1000);
const getCustomMealsKcal = (meals) => (!meals || !Array.isArray(meals)) ? 0 : meals.reduce((sum, m) => sum + (m.kcal || 0), 0);
const getCustomMealsPoints = (meals) => (!meals || !Array.isArray(meals)) ? 0 : meals.reduce((sum, m) => sum + (m.points || 0), 0);

const calcScore = (d) => { 
  if (!d) return 0;
  let s = 0; 
  if (d.habits) { 
    if (d.habits.breakfast) s += 20;
    if (d.habits.fasting) s += 20;
    if (d.habits.lunch) s += 20; 
    if (d.habits.snack) s += 20; 
    if (d.habits.dinner) s += 20; 
    if (d.habits.plannedTreat) s += 20; 
  }
  s += getCustomMealsPoints(d.customMeals);
  if (d.sleep >= 6.5) s += 10; 
  if (d.nap >= 60) s += 5; 
  if (d.movement) { if (d.movement.workout) s += 5; if (d.movement.walk) s += 5; if (d.movement.run) s += 5; }
  s -= getEcartsCount(d.ecarts) * 10;
  return Math.max(0, Math.min(s, 100)); 
};

const calcBMR = (p) => {
  if (!p) return 1800;
  const poids = p.poids || 75, taille = p.taille || 175, age = p.age || 30;
  return p.sexe === 'homme' ? Math.round(10 * poids + 6.25 * taille - 5 * age + 5) : Math.round(10 * poids + 6.25 * taille - 5 * age - 161);
};

const calcTDEE = (bmr, act) => {
  const f = { sedentaire: 1.2, leger: 1.375, modere: 1.55, actif: 1.725, intense: 1.9 };
  return Math.round(bmr * (f[act] || 1.55));
};

const MEALS = {
  breakfast: { title: 'Petit-déj', time: 'Matin', emoji: '🍳', colors: ['#f97316', '#f59e0b'], points: 20, kcal: 450, items: ['6 oeufs', 'Café', 'Eau + sel'] },
  fasting: { title: 'Jeûne', time: 'Matin', emoji: '⏱️', colors: ['#06b6d4', '#0891b2'], points: 20, kcal: 0, items: ['Jeûne intermittent', 'Eau/Café noir'] },
  lunch: { title: 'Déjeuner', time: 'Midi', emoji: '🥗', colors: ['#10b981', '#14b8a6'], points: 20, kcal: 850, items: ['250g riz', '300g protéine', 'Légumes'] },
  snack: { title: 'Collation', time: 'Pré-sieste', emoji: '🥜', colors: ['#8b5cf6', '#a855f7'], points: 20, kcal: 200, items: ['Yaourt grec', 'ou oeuf + amandes'] },
  dinner: { title: 'Dîner', time: '< 20h30', emoji: '🍲', colors: ['#3b82f6', '#6366f1'], points: 20, kcal: 850, items: ['250g riz', '300g protéine', 'Légumes'] },
  plannedTreat: { title: 'Craquage', time: '21h-22h', emoji: '🍫', colors: ['#ec4899', '#f43f5e'], points: 20, kcal: 300, items: ['Autorisé', 'Zéro culpabilité'] },
};

const ECARTS = [
  { id: 'petit', emoji: '🍪', label: 'Petit', kcal: 300, color: '#f59e0b' },
  { id: 'moyen', emoji: '🍔', label: 'Moyen', kcal: 600, color: '#f97316' },
  { id: 'gros', emoji: '🍕', label: 'Gros', kcal: 1000, color: '#ef4444' },
];

export default function CoachZen() {
  const [mounted, setMounted] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [allData, setAllData] = useState({});
  const [tab, setTab] = useState('today');
  const [dayData, setDayData] = useState(getDefaultDay());
  const [coachMessage, setCoachMessage] = useState(null);
  const [profile, setProfile] = useState(getDefaultProfile());
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisPeriod, setAnalysisPeriod] = useState('week');
  const [weightHistory, setWeightHistory] = useState([]);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [modalWeight, setModalWeight] = useState(75);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [foodDescription, setFoodDescription] = useState('');
  const [foodLoading, setFoodLoading] = useState(false);
  const [foodResult, setFoodResult] = useState(null);

  const realToday = useMemo(() => formatDate(new Date()), []);
  const isToday = selectedDate === realToday;

  useEffect(() => {
    const loadAllData = async () => {
      const today = formatDate(new Date());
      setSelectedDate(today);
      
      const localData = loadLocal('cz_data', {});
      const localProfile = loadLocal('cz_profile', getDefaultProfile());
      const localWeight = loadLocal('cz_weight', []);
      
      setAllData(localData);
      setProfile(localProfile);
      setWeightHistory(Array.isArray(localWeight) ? localWeight : []);
      setDayData(localData[today] || getDefaultDay());
      setMounted(true);
      
      try {
        setSyncing(true);
        const [fbData, fbProfile, fbWeight] = await Promise.all([
          loadFromFirebase('allData', localData),
          loadFromFirebase('profile', localProfile),
          loadFromFirebase('weightHistory', localWeight)
        ]);
        
        setAllData(fbData || localData);
        setProfile(fbProfile || localProfile);
        setWeightHistory(Array.isArray(fbWeight) ? fbWeight : localWeight);
        setDayData((fbData && fbData[today]) ? fbData[today] : getDefaultDay());
        
        saveLocal('cz_data', fbData || localData);
        saveLocal('cz_profile', fbProfile || localProfile);
        saveLocal('cz_weight', fbWeight || localWeight);
        setSyncing(false);
      } catch (e) {
        console.error('Firebase load error:', e);
        setSyncing(false);
      }
      
      fetch('/api/coach/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ energy: 3, score: 0, slot: 'morning' }) })
        .then(r => r.json()).then(d => setCoachMessage(d.message || "Le plan commence.")).catch(() => setCoachMessage("Le plan commence."));
    };
    loadAllData();
  }, []);

  useEffect(() => { 
    if (mounted && selectedDate) {
      setDayData(allData[selectedDate] || getDefaultDay());
    }
  }, [selectedDate, mounted, allData]);

  useEffect(() => { 
    if (!mounted || !selectedDate) return;
    const timer = setTimeout(() => {
      const newAll = { ...allData, [selectedDate]: dayData };
      setAllData(newAll);
      saveLocal('cz_data', newAll);
      saveToFirebase('allData', newAll);
    }, 500);
    return () => clearTimeout(timer);
  }, [dayData, mounted, selectedDate]);

  useEffect(() => { 
    if (mounted) {
      saveLocal('cz_profile', profile);
      saveToFirebase('profile', profile);
    }
  }, [profile, mounted]);
  
  useEffect(() => { 
    if (mounted) {
      saveLocal('cz_weight', weightHistory);
      saveToFirebase('weightHistory', weightHistory);
    }
  }, [weightHistory, mounted]);

  const saveWeight = useCallback((w) => { 
    const today = formatDate(new Date()); 
    setWeightHistory(prev => [...prev.filter(x => x.date !== today), { date: today, weight: Number(w) }]); 
    setProfile(p => ({ ...p, poids: Number(w) })); 
    setShowWeightModal(false); 
  }, []);

  const analyzeFood = useCallback(async () => {
    if (!foodDescription.trim()) return;
    setFoodLoading(true); setFoodResult(null);
    try {
      const res = await fetch('/api/coach/food', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: foodDescription }) });
      const data = await res.json();
      setFoodResult(data);
    } catch { setFoodResult({ success: false, error: "Erreur" }); }
    setFoodLoading(false);
  }, [foodDescription]);

  const addCustomMeal = useCallback(() => {
    if (!foodResult || !foodResult.success) return;
    setDayData(p => ({ ...p, customMeals: [...(p.customMeals || []), { id: Date.now(), name: foodResult.name, kcal: foodResult.kcal, points: foodResult.points, isHealthy: foodResult.isHealthy, details: foodResult.details }] }));
    setShowFoodModal(false); setFoodDescription(''); setFoodResult(null);
  }, [foodResult]);

  const removeCustomMeal = useCallback((id) => setDayData(p => ({ ...p, customMeals: (p.customMeals || []).filter(m => m.id !== id) })), []);

  const fetchAnalysis = useCallback(async (period) => {
    setAnalysisLoading(true); setAnalysisPeriod(period);
    try { const res = await fetch('/api/coach/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ allData, profile, period, weightHistory }) }); const data = await res.json(); setAnalysis(data.analysis || 'Analyse indisponible.'); } catch { setAnalysis("Erreur."); }
    setAnalysisLoading(false);
  }, [allData, profile, weightHistory]);

  const score = calcScore(dayData);
  const planKcal = useMemo(() => Object.entries(MEALS).reduce((s, [k, m]) => (dayData?.habits?.[k]) ? s + m.kcal : s, 0), [dayData?.habits]);
  const customKcal = getCustomMealsKcal(dayData.customMeals);
  const ecartsKcal = getEcartsKcal(dayData.ecarts);
  const totalKcal = planKcal + customKcal + ecartsKcal;
  const bmr = calcBMR(profile);
  const tdee = calcTDEE(bmr, profile?.activite);

  const updateHabit = useCallback((k, v) => {
    setDayData(p => {
      const newHabits = { ...(p.habits || {}), [k]: v };
      if (k === 'breakfast' && v) newHabits.fasting = false;
      if (k === 'fasting' && v) newHabits.breakfast = false;
      return { ...p, habits: newHabits };
    });
  }, []);
  
  const updateMovement = useCallback((k, v) => setDayData(p => ({ ...p, movement: { ...(p.movement || {}), [k]: v } })), []);

  const streak = useMemo(() => { let s = 0; for (let i = 1; i <= 30; i++) { const d = new Date(); d.setDate(d.getDate() - i); if (allData?.[formatDate(d)] && calcScore(allData[formatDate(d)]) >= 50) s++; else break; } return s; }, [allData]);
  const last14Days = useMemo(() => { const days = []; for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); } return days; }, []);
  const last7Days = useMemo(() => { const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = formatDate(d); days.push({ date: k, score: allData?.[k] ? calcScore(allData[k]) : 0, label: d.getDate().toString() }); } return days; }, [allData]);
  const monthAvg = useMemo(() => { const vals = Object.values(allData || {}); const scores = vals.slice(-30).map(d => calcScore(d)).filter(s => s > 0); return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0; }, [allData]);
  const totalDays = useMemo(() => Object.keys(allData || {}).length, [allData]);
  const selectedDateObj = useMemo(() => selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date(), [selectedDate]);

  const container = { minHeight: '100dvh', background: '#0f172a', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', paddingBottom: 90 };
  const content = { maxWidth: 500, margin: '0 auto', padding: '12px 16px 20px' };
  const card = { background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 14, marginBottom: 12, border: '1px solid rgba(255,255,255,0.1)' };

  if (!mounted) return <div style={container}><div style={content}><p style={{ textAlign: 'center', paddingTop: 100 }}>Chargement...</p></div></div>;

  return (
    <div style={container}>
      <div style={content}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 16 }}>🌿</span></div>
            <span style={{ fontSize: 18, fontWeight: 'bold', background: 'linear-gradient(to right, #c4b5fd, #f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Coach Zen</span>
            {syncing && <span style={{ fontSize: 10, color: '#22c55e' }}>☁️</span>}
          </div>
          <button onClick={() => { setShowAnalysis(true); fetchAnalysis('week'); }} style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer' }}><span style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>🤖 Analyse</span></button>
        </header>

        {tab === 'today' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              {!isToday && <button onClick={() => setSelectedDate(realToday)} style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, padding: '6px 14px', marginBottom: 8, cursor: 'pointer' }}><span style={{ color: '#a78bfa', fontSize: 12 }}>← Retour à aujourd'hui</span></button>}
              <p style={{ color: isToday ? 'rgba(255,255,255,0.4)' : '#f59e0b', fontSize: 12, margin: 0 }}>{isToday ? getDayName(selectedDateObj) : '⚠️ Édition'}</p>
              <h1 style={{ fontSize: 26, fontWeight: 'bold', margin: '4px 0', color: 'white' }}>{selectedDateObj.getDate()} {getMonthName(selectedDateObj)}</h1>
            </div>

            {isToday && coachMessage && (
              <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', padding: 2, borderRadius: 16, marginBottom: 12 }}>
                <div style={{ background: 'rgba(15,23,42,0.95)', borderRadius: 14, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Z</span></div>
                    <p style={{ flex: 1, fontSize: 14, color: 'white', margin: 0, lineHeight: 1.5 }}>{coachMessage}</p>
                    <button onClick={() => setCoachMessage(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18, padding: 0 }}>×</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
              <div><h2 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>Score</h2><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '4px 0' }}>{score >= 80 ? '🔥 On fire!' : score >= 60 ? '💪 Solide' : score >= 40 ? '👍 En route' : '🌱 Ça pousse'}</p></div>
              <div style={{ width: 80, height: 80, borderRadius: 40, border: '6px solid #8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 28, fontWeight: 'bold', color: 'white' }}>{score}</span></div>
            </div>

            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>🔥 Calories</span><span style={{ fontSize: 16, fontWeight: 'bold', color: totalKcal > tdee ? '#ef4444' : '#10b981' }}>{totalKcal} / {tdee}</span></div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}><div style={{ height: '100%', background: totalKcal > tdee ? '#ef4444' : '#10b981', width: `${Math.min((totalKcal / tdee) * 100, 100)}%` }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Plan: {planKcal} {customKcal > 0 && <span style={{ color: '#22c55e' }}>+ {customKcal} libre</span>} {ecartsKcal > 0 && <span style={{ color: '#f97316' }}>+ {ecartsKcal} écarts</span>}</span></div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '8px 0 0', textAlign: 'center' }}>{(tdee - totalKcal) > 0 ? `📉 Déficit: −${tdee - totalKcal} kcal` : `📈 Surplus: +${Math.abs(tdee - totalKcal)} kcal`}</p>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button onClick={() => updateHabit('breakfast', !dayData?.habits?.breakfast)} style={{ flex: 1, padding: 2, borderRadius: 14, background: `linear-gradient(135deg, ${MEALS.breakfast.colors[0]}, ${MEALS.breakfast.colors[1]})`, border: 'none', cursor: 'pointer' }}>
                <div style={{ background: dayData?.habits?.breakfast ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.95)', borderRadius: 12, padding: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{dayData?.habits?.breakfast ? '✓' : MEALS.breakfast.emoji}</div>
                    <div style={{ flex: 1, textAlign: 'left' }}><p style={{ fontSize: 13, fontWeight: 'bold', color: 'white', margin: 0 }}>{MEALS.breakfast.title}</p><p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{MEALS.breakfast.kcal} kcal</p></div>
                    <span style={{ fontSize: 12, fontWeight: 'bold', color: 'white', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: 6 }}>{dayData?.habits?.breakfast ? '✓' : '+20'}</span>
                  </div>
                </div>
              </button>
              <button onClick={() => updateHabit('fasting', !dayData?.habits?.fasting)} style={{ flex: 1, padding: 2, borderRadius: 14, background: `linear-gradient(135deg, ${MEALS.fasting.colors[0]}, ${MEALS.fasting.colors[1]})`, border: 'none', cursor: 'pointer' }}>
                <div style={{ background: dayData?.habits?.fasting ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.95)', borderRadius: 12, padding: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{dayData?.habits?.fasting ? '✓' : MEALS.fasting.emoji}</div>
                    <div style={{ flex: 1, textAlign: 'left' }}><p style={{ fontSize: 13, fontWeight: 'bold', color: 'white', margin: 0 }}>{MEALS.fasting.title}</p><p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', margin: 0 }}>0 kcal</p></div>
                    <span style={{ fontSize: 12, fontWeight: 'bold', color: 'white', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: 6 }}>{dayData?.habits?.fasting ? '✓' : '+20'}</span>
                  </div>
                </div>
              </button>
            </div>

            {Object.entries(MEALS).filter(([k]) => k !== 'breakfast' && k !== 'fasting').map(([k, m]) => {
              const checked = dayData?.habits?.[k];
              return (
                <button key={k} onClick={() => updateHabit(k, !checked)} style={{ width: '100%', padding: 3, borderRadius: 18, background: `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})`, border: 'none', cursor: 'pointer', marginBottom: 10 }}>
                  <div style={{ background: checked ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.95)', borderRadius: 15, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{checked ? '✓' : m.emoji}</div>
                      <div style={{ flex: 1, textAlign: 'left' }}><p style={{ fontSize: 16, fontWeight: 'bold', color: 'white', margin: 0 }}>{m.title}</p><p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{m.time} • {m.kcal} kcal</p></div>
                      <div style={{ padding: '6px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.1)' }}><span style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>{checked ? '✓' : '+20'}</span></div>
                    </div>
                  </div>
                </button>
              );
            })}

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.1))', border: '1px solid rgba(34,197,94,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div><p style={{ fontSize: 14, fontWeight: 'bold', color: 'white', margin: 0 }}>🥗 Repas libres</p><p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0' }}>Analysé par IA</p></div>
                <button onClick={() => setShowFoodModal(true)} style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer' }}><span style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>+ Ajouter</span></button>
              </div>
              {dayData.customMeals && dayData.customMeals.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dayData.customMeals.map(meal => (
                    <div key={meal.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 16 }}>{meal.isHealthy ? '✅' : '⚠️'}</span><span style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>{meal.name}</span></div>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>{meal.details}</p>
                          <div style={{ display: 'flex', gap: 12, marginTop: 6 }}><span style={{ fontSize: 12, color: '#22c55e' }}>{meal.kcal} kcal</span><span style={{ fontSize: 12, color: meal.points >= 10 ? '#22c55e' : '#f59e0b' }}>+{meal.points} pts</span></div>
                        </div>
                        <button onClick={() => removeCustomMeal(meal.id)} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: '#ef4444', fontSize: 14 }}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', margin: 0 }}>Aucun repas libre ajouté</p>
              )}
            </div>

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(249,115,22,0.1))', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p style={{ fontSize: 14, fontWeight: 'bold', color: 'white', margin: '0 0 12px' }}>🍔 Écarts (-10 pts)</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {ECARTS.map(e => {
                  const count = dayData?.ecarts?.[e.id] || 0;
                  return (
                    <div key={e.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 10, textAlign: 'center' }}>
                      <span style={{ fontSize: 24 }}>{e.emoji}</span>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '4px 0' }}>{e.kcal} kcal</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <button onClick={() => setDayData(p => ({ ...p, ecarts: { ...(p.ecarts || {}), [e.id]: Math.max(0, count - 1) } }))} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 16, cursor: 'pointer' }}>−</button>
                        <span style={{ fontSize: 18, fontWeight: 'bold', color: count > 0 ? e.color : 'white' }}>{count}</span>
                        <button onClick={() => setDayData(p => ({ ...p, ecarts: { ...(p.ecarts || {}), [e.id]: count + 1 } }))} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: `${e.color}40`, color: 'white', fontSize: 16, cursor: 'pointer' }}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={card}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 10 }}>⚡ Énergie</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {[{ v: 1, e: '😴', c: '#ef4444' }, { v: 2, e: '😔', c: '#f97316' }, { v: 3, e: '😐', c: '#eab308' }, { v: 4, e: '🙂', c: '#22c55e' }, { v: 5, e: '💪', c: '#14b8a6' }].map(l => (
                  <button key={l.v} onClick={() => setDayData(p => ({ ...p, energy: l.v }))} style={{ padding: 12, borderRadius: 12, border: 'none', cursor: 'pointer', background: dayData.energy === l.v ? l.c : 'rgba(255,255,255,0.05)', fontSize: 24 }}>{l.e}</button>
                ))}
              </div>
            </div>

            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ color: 'rgba(255,255,255,0.6)' }}>🌙 Sommeil</span><span style={{ fontWeight: 'bold' }}>{dayData.sleep || 7}h</span></div>
              <input type="range" min={0} max={9} step={0.5} value={dayData.sleep || 7} onChange={e => setDayData(p => ({ ...p, sleep: Number(e.target.value) }))} style={{ width: '100%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, marginTop: 14 }}><span style={{ color: 'rgba(255,255,255,0.6)' }}>☀️ Sieste</span><span style={{ fontWeight: 'bold' }}>{dayData.nap || 0} min</span></div>
              <input type="range" min={0} max={120} step={15} value={dayData.nap || 0} onChange={e => setDayData(p => ({ ...p, nap: Number(e.target.value) }))} style={{ width: '100%' }} />
            </div>

            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 8 }}>🏃 Activité (+5 pts)</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              {[{ key: 'workout', emoji: '🏋️', label: 'Muscu', color: '#ec4899' }, { key: 'run', emoji: '🏃', label: 'Course', color: '#f59e0b' }, { key: 'walk', emoji: '🚶', label: 'Marche', color: '#06b6d4' }].map(m => {
                const active = dayData?.movement?.[m.key];
                return <button key={m.key} onClick={() => updateMovement(m.key, !active)} style={{ padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', background: active ? m.color : 'rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 24 }}>{m.emoji}</span><span style={{ color: active ? 'white' : 'rgba(255,255,255,0.5)', fontSize: 12 }}>{m.label}</span></button>;
              })}
            </div>
          </>
        )}

        {tab === 'week' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 14, color: 'white' }}>Semaine</h1>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div style={{ background: '#8b5cf6', borderRadius: 16, padding: 16, textAlign: 'center' }}><p style={{ fontSize: 32, fontWeight: 'bold', margin: 0 }}>{streak}</p><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>🔥 streak</p></div>
              <div style={{ background: '#06b6d4', borderRadius: 16, padding: 16, textAlign: 'center' }}><p style={{ fontSize: 32, fontWeight: 'bold', margin: 0 }}>{monthAvg}</p><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>moy/30j</p></div>
            </div>
            <div style={card}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 10 }}>📅 Clique pour éditer</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {last14Days.map((d, i) => { const k = formatDate(d); const data = allData?.[k]; const s = data ? calcScore(data) : 0; return (
                  <button key={i} onClick={() => { setSelectedDate(k); setTab('today'); }} style={{ textAlign: 'center', padding: 6, borderRadius: 10, background: k === selectedDate ? '#8b5cf6' : 'transparent', border: 'none', cursor: 'pointer' }}>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{getDayName(d)}</p>
                    <p style={{ fontSize: 12, margin: '3px 0', color: 'white' }}>{d.getDate()}</p>
                    <div style={{ width: 26, height: 26, margin: '0 auto', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 'bold', background: !data ? 'rgba(255,255,255,0.05)' : s >= 80 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444', color: 'white' }}>{data ? s : '–'}</div>
                  </button>
                ); })}
              </div>
            </div>
          </>
        )}

        {tab === 'plan' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 14, color: 'white' }}>Mon Plan</h1>
            <div style={card}><p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>Total: <strong style={{ color: '#10b981' }}>2650 kcal</strong> • TDEE: <strong style={{ color: '#06b6d4' }}>{tdee} kcal</strong></p></div>
            {Object.entries(MEALS).filter(([k]) => k !== 'fasting').map(([k, m]) => (
              <div key={k} style={{ background: `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})`, borderRadius: 16, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 50, height: 50, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 26 }}>{m.emoji}</span></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><p style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>{m.title}</p><span style={{ fontSize: 12, background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 8 }}>{m.kcal} kcal</span></div>
                    <p style={{ fontSize: 11, margin: '4px 0 0', opacity: 0.8 }}>{m.time}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>{m.items.map((item, i) => (<span key={i} style={{ fontSize: 10, background: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: 6 }}>{item}</span>))}</div>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ background: `linear-gradient(135deg, ${MEALS.fasting.colors[0]}, ${MEALS.fasting.colors[1]})`, borderRadius: 16, padding: 14, marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 50, height: 50, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 26 }}>{MEALS.fasting.emoji}</span></div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><p style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>Jeûne Intermittent</p><span style={{ fontSize: 12, background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 8 }}>0 kcal</span></div>
                  <p style={{ fontSize: 11, margin: '4px 0 0', opacity: 0.8 }}>Alternative au petit-déjeuner</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>{MEALS.fasting.items.map((item, i) => (<span key={i} style={{ fontSize: 10, background: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: 6 }}>{item}</span>))}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'stats' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 14, color: 'white' }}>Profil</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
              <div style={{ background: '#10b981', borderRadius: 14, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 26, fontWeight: 'bold', margin: 0 }}>{totalDays}</p><p style={{ fontSize: 11, margin: 0, opacity: 0.8 }}>jours</p></div>
              <div style={{ background: '#8b5cf6', borderRadius: 14, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 26, fontWeight: 'bold', margin: 0 }}>{streak}</p><p style={{ fontSize: 11, margin: 0, opacity: 0.8 }}>🔥 streak</p></div>
              <div style={{ background: '#f59e0b', borderRadius: 14, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 26, fontWeight: 'bold', margin: 0 }}>{monthAvg}</p><p style={{ fontSize: 11, margin: 0, opacity: 0.8 }}>moy</p></div>
            </div>
            <div style={card}><p style={{ fontSize: 12, fontWeight: 'bold', color: 'rgba(255,255,255,0.6)', margin: '0 0 10px' }}>⚖️ POIDS</p>{weightHistory.length > 0 ? <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 24, fontWeight: 'bold' }}>{weightHistory[weightHistory.length - 1].weight} kg</span><span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{weightHistory.length} pesée(s)</span></div> : <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>Aucune pesée</p>}</div>
            <button onClick={() => { setModalWeight(profile.poids || 75); setShowWeightModal(true); }} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', background: '#06b6d4', marginBottom: 14 }}><span style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>⚖️ Enregistrer mon poids</span></button>
            <div style={card}><p style={{ fontSize: 12, fontWeight: 'bold', color: 'rgba(255,255,255,0.6)', margin: '0 0 10px' }}>📈 7 DERNIERS JOURS</p><div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>{last7Days.map((d, i) => <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><div style={{ width: '100%', height: Math.max(4, d.score * 0.5), background: d.score >= 80 ? '#10b981' : d.score >= 50 ? '#f59e0b' : d.score > 0 ? '#ef4444' : 'rgba(255,255,255,0.1)', borderRadius: 4 }} /><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{d.label}</span></div>)}</div></div>
            <div style={card}>
              <p style={{ fontSize: 12, fontWeight: 'bold', color: 'rgba(255,255,255,0.6)', margin: '0 0 10px' }}>⚙️ PROFIL</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Poids</label><input type="number" value={profile.poids || 75} onChange={e => setProfile(p => ({ ...p, poids: Number(e.target.value) || 75 }))} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', marginTop: 4, boxSizing: 'border-box' }} /></div>
                <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Taille</label><input type="number" value={profile.taille || 175} onChange={e => setProfile(p => ({ ...p, taille: Number(e.target.value) || 175 }))} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', marginTop: 4, boxSizing: 'border-box' }} /></div>
                <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Âge</label><input type="number" value={profile.age || 30} onChange={e => setProfile(p => ({ ...p, age: Number(e.target.value) || 30 }))} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', marginTop: 4, boxSizing: 'border-box' }} /></div>
                <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Sexe</label><select value={profile.sexe || 'homme'} onChange={e => setProfile(p => ({ ...p, sexe: e.target.value }))} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', marginTop: 4 }}><option value="homme">Homme</option><option value="femme">Femme</option></select></div>
              </div>
              <div style={{ marginTop: 10 }}><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Activité</label><select value={profile.activite || 'modere'} onChange={e => setProfile(p => ({ ...p, activite: e.target.value }))} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', marginTop: 4 }}><option value="sedentaire">Sédentaire</option><option value="leger">Léger</option><option value="modere">Modéré</option><option value="actif">Actif</option><option value="intense">Intense</option></select></div>
            </div>
            <div style={card}><p style={{ fontSize: 12, fontWeight: 'bold', color: 'rgba(255,255,255,0.6)', margin: '0 0 10px' }}>🔥 MÉTABOLISME</p><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 24, fontWeight: 'bold', margin: 0, color: '#a78bfa' }}>{bmr}</p><p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>BMR</p></div><div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 24, fontWeight: 'bold', margin: 0, color: '#10b981' }}>{tdee}</p><p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>TDEE</p></div></div></div>
          </>
        )}
      </div>

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(15,23,42,0.98)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-around', padding: '8px 0 24px', zIndex: 9999 }}>
        {[{ id: 'today', icon: '🏠', label: "Aujourd'hui" }, { id: 'week', icon: '📅', label: 'Semaine' }, { id: 'plan', icon: '📖', label: 'Plan' }, { id: 'stats', icon: '⚙️', label: 'Profil' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}><div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tab === t.id ? '#8b5cf6' : 'transparent' }}><span style={{ fontSize: 18 }}>{t.icon}</span></div><span style={{ fontSize: 10, color: tab === t.id ? 'white' : 'rgba(255,255,255,0.4)' }}>{t.label}</span></button>
        ))}
      </nav>

      {showWeightModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowWeightModal(false)}>
          <div style={{ background: '#1e293b', borderRadius: 20, padding: 20, maxWidth: 320, width: '100%' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: '0 0 16px', textAlign: 'center', color: 'white' }}>⚖️ Pesée</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
              <button onClick={() => setModalWeight(w => Math.max(40, Math.round((w - 0.1) * 10) / 10))} style={{ width: 50, height: 50, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 24, cursor: 'pointer' }}>−</button>
              <div style={{ textAlign: 'center' }}><span style={{ fontSize: 40, fontWeight: 'bold', color: 'white' }}>{modalWeight.toFixed(1)}</span><span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>kg</span></div>
              <button onClick={() => setModalWeight(w => Math.min(200, Math.round((w + 0.1) * 10) / 10))} style={{ width: 50, height: 50, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 24, cursor: 'pointer' }}>+</button>
            </div>
            <div style={{ display: 'flex', gap: 10 }}><button onClick={() => setShowWeightModal(false)} style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 14, cursor: 'pointer' }}>Annuler</button><button onClick={() => saveWeight(modalWeight)} style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', background: '#06b6d4', color: 'white', fontSize: 14, fontWeight: 'bold', cursor: 'pointer' }}>Enregistrer</button></div>
          </div>
        </div>
      )}

      {showFoodModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => { setShowFoodModal(false); setFoodResult(null); setFoodDescription(''); }}>
          <div style={{ background: '#1e293b', borderRadius: 20, padding: 20, maxWidth: 380, width: '100%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: '0 0 16px', textAlign: 'center', color: 'white' }}>🥗 Ajouter un repas</h2>
            <div style={{ marginBottom: 16 }}><label style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>Décris ton repas</label><textarea value={foodDescription} onChange={e => setFoodDescription(e.target.value)} placeholder="Ex: Salade Caesar avec poulet grillé..." style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 14, minHeight: 80, resize: 'none', boxSizing: 'border-box' }} /></div>
            {!foodResult && <button onClick={analyzeFood} disabled={foodLoading || !foodDescription.trim()} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: foodLoading ? 'wait' : 'pointer', background: foodLoading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: 'white', fontSize: 14, fontWeight: 'bold', marginBottom: 12 }}>{foodLoading ? '🤖 Analyse en cours...' : '🤖 Analyser avec IA'}</button>}
            {foodResult && (
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><span style={{ fontSize: 20 }}>{foodResult.isHealthy ? '✅' : '⚠️'}</span><span style={{ fontSize: 16, fontWeight: 'bold', color: 'white' }}>{foodResult.name}</span></div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>{foodResult.details}</p>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flex: 1, background: 'rgba(34,197,94,0.1)', borderRadius: 8, padding: 10, textAlign: 'center' }}><p style={{ fontSize: 20, fontWeight: 'bold', color: '#22c55e', margin: 0 }}>{foodResult.kcal}</p><p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', margin: 0 }}>kcal</p></div>
                  <div style={{ flex: 1, background: foodResult.points >= 10 ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', borderRadius: 8, padding: 10, textAlign: 'center' }}><p style={{ fontSize: 20, fontWeight: 'bold', color: foodResult.points >= 10 ? '#22c55e' : '#f59e0b', margin: 0 }}>+{foodResult.points}</p><p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', margin: 0 }}>points</p></div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}><button onClick={() => { setShowFoodModal(false); setFoodResult(null); setFoodDescription(''); }} style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 14, cursor: 'pointer' }}>Annuler</button>{foodResult && <button onClick={addCustomMeal} style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', background: '#22c55e', color: 'white', fontSize: 14, fontWeight: 'bold', cursor: 'pointer' }}>Ajouter</button>}</div>
          </div>
        </div>
      )}

      {showAnalysis && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowAnalysis(false)}>
          <div style={{ background: '#1e293b', borderRadius: 20, padding: 20, maxWidth: 380, width: '100%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><h2 style={{ fontSize: 20, fontWeight: 'bold', margin: 0, color: 'white' }}>🤖 Analyse IA</h2><button onClick={() => setShowAnalysis(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 24, cursor: 'pointer' }}>×</button></div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}><button onClick={() => fetchAnalysis('week')} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', background: analysisPeriod === 'week' ? '#8b5cf6' : 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 'bold' }}>7 jours</button><button onClick={() => fetchAnalysis('month')} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', background: analysisPeriod === 'month' ? '#8b5cf6' : 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 'bold' }}>30 jours</button></div>
            {analysisLoading ? <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Analyse en cours...</p> : <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{analysis || 'Aucune analyse.'}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
