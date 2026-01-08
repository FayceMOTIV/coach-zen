'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  saveToFirebase,
  loadFromFirebase,
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  logOut,
  onAuthChange
} from '../lib/firebase';

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
  customMeals: [],
  water: 0,
  supplements: { vitaminD: false, omega3: false, magnesium: false, protein: false, creatine: false, multivitamin: false },
  gratitudes: ['', '', ''],
  fastingTimer: { start: null, end: null, goal: 16 }
});

const getDefaultProfile = () => ({ poids: 75, taille: 175, age: 30, sexe: 'homme', activite: 'modere', objectifPoids: 70 });

const getEcartsCount = (e) => !e ? 0 : (e.petit || 0) + (e.moyen || 0) + (e.gros || 0);
const getEcartsKcal = (e) => !e ? 0 : ((e.petit || 0) * 300) + ((e.moyen || 0) * 600) + ((e.gros || 0) * 1000);
const getCustomMealsKcal = (meals) => (!meals || !Array.isArray(meals)) ? 0 : meals.reduce((sum, m) => sum + (m.kcal || 0), 0);
const getCustomMealsPoints = (meals) => (!meals || !Array.isArray(meals)) ? 0 : meals.reduce((sum, m) => sum + (m.points || 0), 0);
const getSupplementsCount = (s) => !s ? 0 : Object.values(s).filter(Boolean).length;

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
  if ((d.water || 0) >= 8) s += 10;
  if (d.movement) { if (d.movement.workout) s += 5; if (d.movement.walk) s += 5; if (d.movement.run) s += 5; }
  if (getSupplementsCount(d.supplements) >= 3) s += 5;
  const gratitudesFilled = (d.gratitudes || []).filter(g => g && g.trim()).length;
  if (gratitudesFilled >= 3) s += 5;
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

const BADGES = [
  { id: 'first_day', emoji: '🌱', name: 'Premier pas', desc: '1er jour complété', check: (stats) => stats.totalDays >= 1 },
  { id: 'week_streak', emoji: '🔥', name: 'Semaine de feu', desc: '7 jours streak', check: (stats) => stats.streak >= 7 },
  { id: 'month_streak', emoji: '⚡', name: 'Inarrêtable', desc: '30 jours streak', check: (stats) => stats.streak >= 30 },
  { id: 'first_kg', emoji: '📉', name: 'Premier kilo', desc: '1kg perdu', check: (stats) => stats.weightLoss >= 1 },
  { id: 'five_kg', emoji: '🏆', name: 'Champion', desc: '5kg perdus', check: (stats) => stats.weightLoss >= 5 },
  { id: 'ten_kg', emoji: '👑', name: 'Légende', desc: '10kg perdus', check: (stats) => stats.weightLoss >= 10 },
  { id: 'hydration_master', emoji: '💧', name: 'Hydraté', desc: '7 jours à 8 verres', check: (stats) => stats.hydrationStreak >= 7 },
  { id: 'supplement_pro', emoji: '💊', name: 'Complété', desc: '7 jours de suppléments', check: (stats) => stats.supplementStreak >= 7 },
  { id: 'gratitude_zen', emoji: '🙏', name: 'Zen Master', desc: '7 jours de gratitude', check: (stats) => stats.gratitudeStreak >= 7 },
  { id: 'perfect_score', emoji: '💯', name: 'Perfectionniste', desc: 'Score de 100', check: (stats) => stats.maxScore >= 100 },
  { id: 'fifty_days', emoji: '🎯', name: 'Déterminé', desc: '50 jours suivis', check: (stats) => stats.totalDays >= 50 },
  { id: 'hundred_days', emoji: '🌟', name: 'Centurion', desc: '100 jours suivis', check: (stats) => stats.totalDays >= 100 },
];

const MEALS = {
  breakfast: { title: 'Petit-déj', time: 'Matin', emoji: '🍳', colors: ['#f97316', '#f59e0b'], points: 20, kcal: 450, items: ['6 oeufs', 'Café', 'Eau + sel'] },
  fasting: { title: 'Jeûne', time: 'Matin', emoji: '⏱️', colors: ['#06b6d4', '#0891b2'], points: 20, kcal: 0, items: ['Jeûne intermittent', 'Eau/Café noir'] },
  lunch: { title: 'Déjeuner', time: 'Midi', emoji: '🥗', colors: ['#10b981', '#14b8a6'], points: 20, kcal: 850, items: ['250g riz', '300g protéine', 'Légumes'] },
  snack: { title: 'Collation', time: 'Pré-sieste', emoji: '🥜', colors: ['#8b5cf6', '#a855f7'], points: 20, kcal: 200, items: ['Yaourt grec', 'ou oeuf + amandes'] },
  dinner: { title: 'Dîner', time: '< 20h30', emoji: '🍲', colors: ['#3b82f6', '#6366f1'], points: 20, kcal: 850, items: ['250g riz', '300g protéine', 'Légumes'] },
  plannedTreat: { title: 'Craquage', time: '21h-22h', emoji: '🍫', colors: ['#ec4899', '#f43f5e'], points: 20, kcal: 300, items: ['Autorisé', 'Zéro culpabilité'] },
};

const SUPPLEMENTS = [
  { id: 'vitaminD', emoji: '☀️', name: 'Vit D' },
  { id: 'omega3', emoji: '🐟', name: 'Oméga 3' },
  { id: 'magnesium', emoji: '🧲', name: 'Magnésium' },
  { id: 'protein', emoji: '💪', name: 'Protéine' },
  { id: 'creatine', emoji: '⚡', name: 'Créatine' },
  { id: 'multivitamin', emoji: '💊', name: 'Multi-vit' },
];

const ECARTS = [
  { id: 'petit', emoji: '🍪', label: 'Petit', kcal: 300, color: '#f59e0b' },
  { id: 'moyen', emoji: '🍔', label: 'Moyen', kcal: 600, color: '#f97316' },
  { id: 'gros', emoji: '🍕', label: 'Gros', kcal: 1000, color: '#ef4444' },
];

// LOGIN COMPONENT - Simplified
function LoginScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    
    try {
      if (mode === 'reset') {
        const result = await resetPassword(email);
        if (result.success) {
          setMessage('Email envoyé ! Vérifie ta boîte mail.');
          setMode('login');
        } else {
          setError(result.error);
        }
        setLoading(false);
        return;
      }
      
      const result = mode === 'login' 
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password);
      
      if (!result.success) {
        setError(result.error);
        setLoading(false);
      }
      // Si success: onAuthStateChanged va changer l'écran
      setTimeout(() => setLoading(false), 5000);
    } catch (err) {
      setError('Une erreur est survenue');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#0f172a', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 360, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <span style={{ fontSize: 40 }}>🌿</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 'bold', margin: 0, background: 'linear-gradient(to right, #c4b5fd, #f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Coach Zen</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>Ton coach nutrition personnel</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="Email" 
            required 
            style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 16, marginBottom: 12, boxSizing: 'border-box' }} 
          />
          
          {mode !== 'reset' && (
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Mot de passe (min 6 car.)" 
              required 
              minLength={6} 
              style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 16, marginBottom: 12, boxSizing: 'border-box' }} 
            />
          )}

          {error && <p style={{ color: '#ef4444', fontSize: 14, margin: '0 0 12px', textAlign: 'center' }}>{error}</p>}
          {message && <p style={{ color: '#22c55e', fontSize: 14, margin: '0 0 12px', textAlign: 'center' }}>{message}</p>}

          <button 
            type="submit" 
            disabled={loading} 
            style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: loading ? 'rgba(139,92,246,0.5)' : 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: 'white', fontSize: 16, fontWeight: 'bold', cursor: loading ? 'wait' : 'pointer', marginBottom: 16 }}
          >
            {loading ? '...' : mode === 'login' ? 'Se connecter' : mode === 'signup' ? 'Créer mon compte' : 'Envoyer le lien'}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          {mode === 'login' && (
            <>
              <button onClick={() => { setMode('reset'); setError(''); setMessage(''); }} style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: 14, cursor: 'pointer', marginBottom: 12, display: 'block', width: '100%' }}>
                Mot de passe oublié ?
              </button>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>
                Pas de compte ? <button onClick={() => { setMode('signup'); setError(''); setMessage(''); }} style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: 14, cursor: 'pointer' }}>S'inscrire</button>
              </p>
            </>
          )}
          {mode === 'signup' && (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>
              Déjà un compte ? <button onClick={() => { setMode('login'); setError(''); setMessage(''); }} style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: 14, cursor: 'pointer' }}>Se connecter</button>
            </p>
          )}
          {mode === 'reset' && (
            <button onClick={() => { setMode('login'); setError(''); setMessage(''); }} style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: 14, cursor: 'pointer' }}>
              ← Retour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// MAIN APP
export default function CoachZen() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
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
  const [foodImage, setFoodImage] = useState(null);
  const [showVoiceCoach, setShowVoiceCoach] = useState(false);
  const [voiceMessages, setVoiceMessages] = useState([]);
  const [voiceInput, setVoiceInput] = useState('');
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showCelebration, setShowCelebration] = useState(null);
  const [unlockedBadges, setUnlockedBadges] = useState([]);
  const [showBadges, setShowBadges] = useState(false);
  const [fastingElapsed, setFastingElapsed] = useState(0);
  const [dailyAnalysis, setDailyAnalysis] = useState('');
  const [dailyAnalysisLoading, setDailyAnalysisLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [recipeMealType, setRecipeMealType] = useState('');
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [weeklyReportLoading, setWeeklyReportLoading] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState('');
  const [weeklyStats, setWeeklyStats] = useState(null);
  const fileInputRef = useRef(null);
  const analysisTimeoutRef = useRef(null);

  // Load dark mode preference
  useEffect(() => {
    const saved = loadLocal('cz_darkMode', true);
    setDarkMode(saved);
  }, []);

  // Save dark mode preference
  const toggleDarkMode = () => {
    setDarkMode(prev => {
      saveLocal('cz_darkMode', !prev);
      return !prev;
    });
  };

  // Theme colors - comprehensive
  const theme = darkMode ? {
    bg: '#0f172a',
    card: 'rgba(255,255,255,0.05)',
    cardBorder: 'rgba(255,255,255,0.1)',
    cardShadow: 'none',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.6)',
    textFaint: 'rgba(255,255,255,0.4)',
    textVeryFaint: 'rgba(255,255,255,0.3)',
    inputBg: 'rgba(255,255,255,0.1)',
    buttonBg: 'rgba(255,255,255,0.1)',
    buttonBgHover: 'rgba(255,255,255,0.15)',
    navBg: 'rgba(15,23,42,0.98)',
    modalBg: '#1e293b',
    overlayBg: 'rgba(0,0,0,0.85)',
    progressBg: 'rgba(255,255,255,0.1)',
    mealCardBg: 'rgba(15,23,42,0.95)',
    mealCardBgActive: 'rgba(255,255,255,0.15)'
  } : {
    bg: '#f1f5f9',
    card: '#ffffff',
    cardBorder: '#e2e8f0',
    cardShadow: '0 1px 3px rgba(0,0,0,0.1)',
    text: '#1e293b',
    textMuted: '#64748b',
    textFaint: '#94a3b8',
    textVeryFaint: '#cbd5e1',
    inputBg: '#f1f5f9',
    buttonBg: 'rgba(0,0,0,0.05)',
    buttonBgHover: 'rgba(0,0,0,0.1)',
    navBg: 'rgba(255,255,255,0.98)',
    modalBg: '#ffffff',
    overlayBg: 'rgba(0,0,0,0.5)',
    progressBg: '#e2e8f0',
    mealCardBg: '#ffffff',
    mealCardBgActive: 'rgba(139,92,246,0.1)'
  };

  const realToday = useMemo(() => formatDate(new Date()), []);

  // Fasting timer real-time update
  useEffect(() => {
    const fastingStart = dayData?.fastingTimer?.start;
    if (!fastingStart) {
      setFastingElapsed(0);
      return;
    }

    const updateElapsed = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - fastingStart) / 1000);
      setFastingElapsed(elapsed);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [dayData?.fastingTimer?.start]);

  const isToday = selectedDate === realToday;

  // Fetch daily analysis when score changes (debounced)
  const fetchDailyAnalysis = useCallback(async () => {
    if (!dayData || !isToday) return;

    setDailyAnalysisLoading(true);
    try {
      const res = await fetch('/api/coach/daily-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: calcScore(dayData),
          habits: dayData.habits,
          sleep: dayData.sleep,
          nap: dayData.nap,
          energy: dayData.energy,
          water: dayData.water,
          ecarts: dayData.ecarts,
          movement: dayData.movement,
          customMeals: dayData.customMeals
        })
      });
      const data = await res.json();
      setDailyAnalysis(data.analysis || '');
    } catch (err) {
      console.error('Daily analysis error:', err);
    } finally {
      setDailyAnalysisLoading(false);
    }
  }, [dayData, isToday]);

  useEffect(() => {
    if (!mounted || !isToday) return;

    // Clear previous timeout
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    // Debounce: wait 2 seconds after last change
    analysisTimeoutRef.current = setTimeout(() => {
      fetchDailyAnalysis();
    }, 2000);

    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [dayData?.habits, dayData?.sleep, dayData?.water, dayData?.ecarts, dayData?.movement, dayData?.customMeals, mounted, isToday, fetchDailyAnalysis]);


  // Auth listener - simplified
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthChange((firebaseUser) => {
      if (!isMounted) return;
      setUser(firebaseUser);
      setAuthLoading(false);
    });

    const timeout = setTimeout(() => {
      if (isMounted) setAuthLoading(false);
    }, 3000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  // Stats pour badges
  const stats = useMemo(() => {
    const sorted = [...weightHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
    const weightStart = sorted[0]?.weight || profile.poids;
    const weightNow = sorted[sorted.length - 1]?.weight || profile.poids;
    
    let streak = 0;
    for (let i = 1; i <= 365; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (allData?.[formatDate(d)] && calcScore(allData[formatDate(d)]) >= 50) streak++; else break;
    }

    let hydrationStreak = 0;
    for (let i = 1; i <= 365; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (allData?.[formatDate(d)]?.water >= 8) hydrationStreak++; else break;
    }

    let supplementStreak = 0;
    for (let i = 1; i <= 365; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (getSupplementsCount(allData?.[formatDate(d)]?.supplements) >= 3) supplementStreak++; else break;
    }

    let gratitudeStreak = 0;
    for (let i = 1; i <= 365; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const grats = allData?.[formatDate(d)]?.gratitudes || [];
      if (grats.filter(g => g && g.trim()).length >= 3) gratitudeStreak++; else break;
    }

    const scores = Object.values(allData || {}).map(d => calcScore(d));
    
    return {
      totalDays: Object.keys(allData || {}).length,
      streak,
      weightLoss: weightStart - weightNow,
      hydrationStreak,
      supplementStreak,
      gratitudeStreak,
      maxScore: scores.length ? Math.max(...scores) : 0
    };
  }, [allData, weightHistory, profile.poids]);

  // Check badges
  useEffect(() => {
    if (!mounted) return;
    const newUnlocked = BADGES.filter(b => b.check(stats)).map(b => b.id);
    const prevUnlocked = loadLocal('cz_badges', []);
    
    const justUnlocked = newUnlocked.filter(id => !prevUnlocked.includes(id));
    if (justUnlocked.length > 0) {
      const badge = BADGES.find(b => b.id === justUnlocked[0]);
      setShowCelebration(badge);
      setTimeout(() => setShowCelebration(null), 3000);
    }
    
    setUnlockedBadges(newUnlocked);
    saveLocal('cz_badges', newUnlocked);
  }, [stats, mounted]);

  // Load data when user logs in
  useEffect(() => {
    if (!user) return;
    
    const loadAllData = async () => {
      const today = formatDate(new Date());
      setSelectedDate(today);
      
      try {
        setSyncing(true);
        const [fbData, fbProfile, fbWeight] = await Promise.all([
          loadFromFirebase(user.uid, 'allData', {}),
          loadFromFirebase(user.uid, 'profile', getDefaultProfile()),
          loadFromFirebase(user.uid, 'weightHistory', [])
        ]);
        
        setAllData(fbData || {});
        setProfile(fbProfile || getDefaultProfile());
        setWeightHistory(Array.isArray(fbWeight) ? fbWeight : []);
        setDayData((fbData && fbData[today]) ? fbData[today] : getDefaultDay());
        setSyncing(false);
      } catch (e) {
        console.error('Firebase load error:', e);
        setSyncing(false);
      }
      
      setMounted(true);
      
      fetch('/api/coach/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ energy: 3, score: 0, slot: 'morning' }) })
        .then(r => r.json()).then(d => setCoachMessage(d.message || "Le plan commence.")).catch(() => setCoachMessage("Le plan commence."));
    };
    
    loadAllData();
  }, [user]);

  useEffect(() => { 
    if (mounted && selectedDate) {
      setDayData(allData[selectedDate] || getDefaultDay());
    }
  }, [selectedDate, mounted, allData]);

  useEffect(() => { 
    if (!mounted || !selectedDate || !user) return;
    const timer = setTimeout(() => {
      const newAll = { ...allData, [selectedDate]: dayData };
      setAllData(newAll);
      saveToFirebase(user.uid, 'allData', newAll);
    }, 500);
    return () => clearTimeout(timer);
  }, [dayData, mounted, selectedDate, user]);

  useEffect(() => { 
    if (mounted && user) {
      saveToFirebase(user.uid, 'profile', profile);
    }
  }, [profile, mounted, user]);
  
  useEffect(() => { 
    if (mounted && user) {
      saveToFirebase(user.uid, 'weightHistory', weightHistory);
    }
  }, [weightHistory, mounted, user]);

  const handleLogout = async () => {
    await logOut();
    setAllData({});
    setProfile(getDefaultProfile());
    setWeightHistory([]);
    setMounted(false);
  };

  const saveWeight = useCallback((w) => { 
    const today = formatDate(new Date()); 
    setWeightHistory(prev => [...prev.filter(x => x.date !== today), { date: today, weight: Number(w) }]); 
    setProfile(p => ({ ...p, poids: Number(w) })); 
    setShowWeightModal(false); 
  }, []);

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFoodImage(reader.result);
    reader.readAsDataURL(file);
  }, []);

  const analyzeFood = useCallback(async () => {
    if (!foodDescription.trim() && !foodImage) return;
    setFoodLoading(true); setFoodResult(null);
    try {
      const res = await fetch('/api/coach/food', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: foodDescription, image: foodImage }) });
      const data = await res.json();
      setFoodResult(data);
    } catch { setFoodResult({ success: false, error: "Erreur" }); }
    setFoodLoading(false);
  }, [foodDescription, foodImage]);

  const addCustomMeal = useCallback(() => {
    if (!foodResult || !foodResult.success) return;
    setDayData(p => ({ ...p, customMeals: [...(p.customMeals || []), { id: Date.now(), name: foodResult.name, kcal: foodResult.kcal, points: foodResult.points, isHealthy: foodResult.isHealthy, details: foodResult.details }] }));
    setShowFoodModal(false); setFoodDescription(''); setFoodResult(null); setFoodImage(null);
  }, [foodResult]);

  const removeCustomMeal = useCallback((id) => setDayData(p => ({ ...p, customMeals: (p.customMeals || []).filter(m => m.id !== id) })), []);

  const fetchAnalysis = useCallback(async (period) => {
    setAnalysisLoading(true); setAnalysisPeriod(period);
    try { 
      const res = await fetch('/api/coach/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ allData, profile, period, weightHistory, stats }) }); 
      const data = await res.json(); 
      setAnalysis(data.analysis || 'Analyse indisponible.'); 
    } catch { setAnalysis("Erreur."); }
    setAnalysisLoading(false);
  }, [allData, profile, weightHistory, stats]);

  const fetchRecipes = useCallback(async (mealType) => {
    setRecipeMealType(mealType);
    setShowRecipeModal(true);
    setRecipeLoading(true);
    setRecipes([]);
    try {
      const res = await fetch('/api/recipes/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealType })
      });
      const data = await res.json();
      setRecipes(data.recipes || []);
    } catch (err) {
      console.error('Recipe fetch error:', err);
      setRecipes([]);
    }
    setRecipeLoading(false);
  }, []);

  const fetchWeeklyReport = useCallback(async () => {
    setShowWeeklyReport(true);
    setWeeklyReportLoading(true);
    setWeeklyReport('');
    setWeeklyStats(null);

    // Get last 7 days of data
    const weekData = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      if (allData[dateStr]) {
        weekData[dateStr] = allData[dateStr];
      }
    }

    try {
      const res = await fetch('/api/coach/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekData, profile, weightHistory })
      });
      const data = await res.json();
      setWeeklyReport(data.report || '');
      setWeeklyStats(data.stats || null);
    } catch (err) {
      console.error('Weekly report error:', err);
      setWeeklyReport('Impossible de générer le rapport.');
    }
    setWeeklyReportLoading(false);
  }, [allData, profile, weightHistory]);

  const sendVoiceMessage = useCallback(async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', content: text };
    setVoiceMessages(prev => [...prev, userMsg]);
    setVoiceInput('');
    setVoiceLoading(true);
    
    try {
      const res = await fetch('/api/coach/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, allData, profile, weightHistory, stats, todayData: dayData, history: voiceMessages.slice(-10) })
      });
      const data = await res.json();
      setVoiceMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(data.response);
        utterance.lang = 'fr-FR';
        speechSynthesis.speak(utterance);
      }
    } catch {
      setVoiceMessages(prev => [...prev, { role: 'assistant', content: "Désolé, je n'ai pas pu répondre." }]);
    }
    setVoiceLoading(false);
  }, [allData, profile, weightHistory, voiceMessages, stats, dayData]);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Reconnaissance vocale non supportée.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => sendVoiceMessage(event.results[0][0].transcript);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
  }, [sendVoiceMessage]);

  const score = calcScore(dayData);
  const planKcal = useMemo(() => Object.entries(MEALS).reduce((s, [k, m]) => (dayData?.habits?.[k]) ? s + m.kcal : s, 0), [dayData?.habits]);
  const customKcal = getCustomMealsKcal(dayData.customMeals);
  const ecartsKcal = getEcartsKcal(dayData.ecarts);
  const totalKcal = planKcal + customKcal + ecartsKcal;
  const bmr = calcBMR(profile);
  const tdee = calcTDEE(bmr, profile?.activite);

  const prediction = useMemo(() => {
    if (!weightHistory.length || !profile.objectifPoids) return null;
    const sorted = [...weightHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (sorted.length < 2) return null;
    const recent = sorted.slice(-14);
    const first = recent[0], last = recent[recent.length - 1];
    const daysDiff = (new Date(last.date) - new Date(first.date)) / (1000 * 60 * 60 * 24);
    if (daysDiff < 7) return null;
    const lossPerDay = (first.weight - last.weight) / daysDiff;
    if (lossPerDay <= 0) return { message: "Phase de maintien", date: null };
    const remaining = last.weight - profile.objectifPoids;
    if (remaining <= 0) return { message: "🎉 Objectif atteint !", date: null };
    const goalDate = new Date();
    goalDate.setDate(goalDate.getDate() + Math.ceil(remaining / lossPerDay));
    return { message: `${(lossPerDay * 7).toFixed(1)} kg/sem`, date: goalDate };
  }, [weightHistory, profile.objectifPoids]);

  const updateHabit = useCallback((k, v) => {
    setDayData(p => {
      const newHabits = { ...(p.habits || {}), [k]: v };
      if (k === 'breakfast' && v) newHabits.fasting = false;
      if (k === 'fasting' && v) newHabits.breakfast = false;
      return { ...p, habits: newHabits };
    });
  }, []);
  
  const updateMovement = useCallback((k, v) => setDayData(p => ({ ...p, movement: { ...(p.movement || {}), [k]: v } })), []);
  const updateSupplement = useCallback((k, v) => setDayData(p => ({ ...p, supplements: { ...(p.supplements || {}), [k]: v } })), []);
  const updateGratitude = useCallback((i, v) => setDayData(p => {
    const newGrats = [...(p.gratitudes || ['', '', ''])];
    newGrats[i] = v;
    return { ...p, gratitudes: newGrats };
  }), []);

  const streak = stats.streak;
  const last14Days = useMemo(() => { const days = []; for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); } return days; }, []);
  const monthAvg = useMemo(() => { const vals = Object.values(allData || {}); const scores = vals.slice(-30).map(d => calcScore(d)).filter(s => s > 0); return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0; }, [allData]);
  const totalDays = stats.totalDays;
  const selectedDateObj = useMemo(() => selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date(), [selectedDate]);
  const weightChartData = useMemo(() => {
    const sorted = [...weightHistory].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-30);
    if (!sorted.length) return [];
    const min = Math.min(...sorted.map(w => w.weight)) - 2;
    const max = Math.max(...sorted.map(w => w.weight)) + 2;
    return sorted.map(w => ({ ...w, percent: ((w.weight - min) / (max - min)) * 100 }));
  }, [weightHistory]);

  // Enhanced stats for Stats tab
  const enhancedStats = useMemo(() => {
    const entries = Object.entries(allData || {}).sort((a, b) => b[0].localeCompare(a[0]));

    // 7 derniers jours avec labels
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = formatDate(d);
      const data = allData?.[key];
      last7Days.push({
        label: ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()],
        score: data ? calcScore(data) : 0
      });
    }

    // Moyenne 7 jours
    const scores7 = last7Days.map(d => d.score).filter(s => s > 0);
    const avgScore = scores7.length ? Math.round(scores7.reduce((a,b) => a+b, 0) / scores7.length) : 0;

    // Taux réussite global (score >= 80)
    const allScores = entries.map(([_, d]) => calcScore(d));
    const successRate = allScores.length ? Math.round(allScores.filter(s => s >= 80).length / allScores.length * 100) : 0;

    // Évolution poids
    const sortedWeights = [...weightHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
    const weightChange = sortedWeights.length >= 2
      ? Number((sortedWeights[sortedWeights.length - 1].weight - sortedWeights[0].weight).toFixed(1))
      : 0;

    // Taux par habitude
    const habitKeys = ['breakfast', 'lunch', 'snack', 'dinner', 'plannedTreat'];
    const habitNames = { breakfast: 'Petit-déj', lunch: 'Déjeuner', snack: 'Collation', dinner: 'Dîner', plannedTreat: 'Plaisir planifié' };
    const habitEmojis = { breakfast: '🍳', lunch: '🥗', snack: '🥜', dinner: '🍲', plannedTreat: '🍫' };
    const habitRates = habitKeys.map(key => {
      const total = entries.filter(([_, d]) => d.habits).length;
      const done = entries.filter(([_, d]) => d.habits?.[key]).length;
      return { name: habitNames[key], emoji: habitEmojis[key], rate: total ? Math.round(done / total * 100) : 0 };
    });

    // Records
    const bestScore = allScores.length ? Math.max(...allScores) : 0;
    const lowestWeight = sortedWeights.length ? Math.min(...sortedWeights.map(w => w.weight)) : null;

    // Plus long streak (historique)
    let longestStreak = 0;
    let currentStreak = 0;
    const sortedDates = Object.keys(allData || {}).sort();
    for (const date of sortedDates) {
      if (calcScore(allData[date]) >= 80) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return { last7Days, avgScore, successRate, weightChange, habitRates, bestScore, longestStreak, lowestWeight };
  }, [allData, weightHistory]);

  const container = { minHeight: '100dvh', background: theme.bg, color: theme.text, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', paddingBottom: 90, transition: 'background 0.3s, color 0.3s' };
  const content = { maxWidth: 500, margin: '0 auto', padding: '12px 16px 20px' };
  const card = { background: theme.card, borderRadius: 16, padding: 14, marginBottom: 12, border: `1px solid ${theme.cardBorder}`, boxShadow: theme.cardShadow, transition: 'background 0.3s, border 0.3s, box-shadow 0.3s' };

  // Show loading while checking auth
  if (authLoading) {
    return <div style={container}><div style={content}><p style={{ textAlign: 'center', paddingTop: 100 }}>Chargement...</p></div></div>;
  }

  // Show login if not authenticated
  if (!user) {
    return <LoginScreen />;
  }

  // Show loading data
  if (!mounted) {
    return <div style={container}><div style={content}><p style={{ textAlign: 'center', paddingTop: 100 }}>Chargement des données...</p></div></div>;
  }

  return (
    <div style={container}>
      <div style={content}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 16 }}>🌿</span></div>
            <span style={{ fontSize: 18, fontWeight: 'bold', background: 'linear-gradient(to right, #c4b5fd, #f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Coach Zen</span>
            {syncing && <span style={{ fontSize: 10, color: '#22c55e' }}>☁️</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={toggleDarkMode} style={{ background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>
              <span style={{ fontSize: 14 }}>{darkMode ? '☀️' : '🌙'}</span>
            </button>
            <button onClick={() => setShowBadges(true)} style={{ background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', position: 'relative' }}>
              <span style={{ fontSize: 14 }}>🏆</span>
              {unlockedBadges.length > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: '#22c55e', color: 'white', fontSize: 10, width: 16, height: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unlockedBadges.length}</span>}
            </button>
            <button onClick={() => setShowVoiceCoach(true)} style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', border: 'none', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}><span style={{ fontSize: 14 }}>🎙️</span></button>
            <button onClick={fetchWeeklyReport} style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)', border: 'none', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}><span style={{ fontSize: 14 }}>📊</span></button>
            <button onClick={() => { setShowAnalysis(true); fetchAnalysis('week'); }} style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', border: 'none', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}><span style={{ fontSize: 12, fontWeight: 'bold' }}>🤖</span></button>
          </div>
        </header>

        {tab === 'today' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              {!isToday && <button onClick={() => setSelectedDate(realToday)} style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, padding: '6px 14px', marginBottom: 8, cursor: 'pointer' }}><span style={{ color: '#a78bfa', fontSize: 12 }}>← Retour à aujourd'hui</span></button>}
              <p style={{ color: isToday ? theme.textFaint : '#f59e0b', fontSize: 12, margin: 0 }}>{isToday ? getDayName(selectedDateObj) : '⚠️ Édition'}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}><button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(formatDate(d)); }} style={{ background: theme.buttonBg, border: 'none', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', color: theme.text, fontSize: 18 }}>←</button><h1 style={{ fontSize: 26, fontWeight: 'bold', margin: 0, color: theme.text }}>{selectedDateObj.getDate()} {getMonthName(selectedDateObj)}</h1><button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); if (d <= new Date()) setSelectedDate(formatDate(d)); }} style={{ background: theme.buttonBg, border: 'none', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', color: theme.text, fontSize: 18, opacity: isToday ? 0.3 : 1 }} disabled={isToday}>→</button></div>
            </div>

            {isToday && coachMessage && (
              <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', padding: 2, borderRadius: 16, marginBottom: 12 }}>
                <div style={{ background: darkMode ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontWeight: 'bold', fontSize: 14, color: 'white' }}>Z</span></div>
                    <p style={{ flex: 1, fontSize: 14, margin: 0, lineHeight: 1.5, color: theme.text }}>{coachMessage}</p>
                    <button onClick={() => setCoachMessage(null)} style={{ background: 'none', border: 'none', color: theme.textFaint, cursor: 'pointer', fontSize: 18, padding: 0 }}>×</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
              <div><h2 style={{ fontSize: 16, fontWeight: 'bold', margin: 0, color: theme.text }}>Score</h2><p style={{ color: theme.textMuted, fontSize: 14, margin: '4px 0' }}>{score >= 80 ? '🔥 On fire!' : score >= 60 ? '💪 Solide' : score >= 40 ? '👍 En route' : '🌱 Ça pousse'}</p></div>
              <div style={{ width: 80, height: 80, borderRadius: 40, border: '6px solid #8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 28, fontWeight: 'bold', color: theme.text }}>{score}</span></div>
            </div>

            {/* Daily AI Analysis */}
            {isToday && (dailyAnalysis || dailyAnalysisLoading) && (
              <div style={{ ...card, background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.15))', border: '1px solid rgba(139,92,246,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>💬</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, color: theme.textMuted, margin: '0 0 4px' }}>Analyse du jour</p>
                    <p style={{ fontSize: 14, margin: 0, lineHeight: 1.5, color: theme.text }}>
                      {dailyAnalysisLoading ? '...' : dailyAnalysis}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 14, color: theme.textMuted }}>🔥 Calories</span><span style={{ fontSize: 16, fontWeight: 'bold', color: totalKcal > tdee ? '#ef4444' : '#10b981' }}>{totalKcal} / {tdee}</span></div>
              <div style={{ height: 8, background: theme.progressBg, borderRadius: 4, overflow: 'hidden' }}><div style={{ height: '100%', background: totalKcal > tdee ? '#ef4444' : '#10b981', width: `${Math.min((totalKcal / tdee) * 100, 100)}%` }} /></div>
              <p style={{ fontSize: 11, color: theme.textFaint, margin: '8px 0 0', textAlign: 'center' }}>{(tdee - totalKcal) > 0 ? `📉 Déficit: −${tdee - totalKcal} kcal` : `📈 Surplus: +${Math.abs(tdee - totalKcal)} kcal`}</p>
            </div>

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(8,145,178,0.1))', border: '1px solid rgba(6,182,212,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div><p style={{ fontSize: 14, fontWeight: 'bold', margin: 0, color: theme.text }}>💧 Hydratation</p><p style={{ fontSize: 11, color: theme.textMuted, margin: 0 }}>+10 pts si ≥ 8</p></div>
                <span style={{ fontSize: 18, fontWeight: 'bold', color: (dayData.water || 0) >= 8 ? '#22c55e' : theme.text }}>{dayData.water || 0}/8</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[...Array(8)].map((_, i) => (
                  <button key={i} onClick={() => setDayData(p => ({ ...p, water: i + 1 }))} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', background: i < (dayData.water || 0) ? '#06b6d4' : theme.buttonBg }}>
                    <span style={{ fontSize: 16, color: i < (dayData.water || 0) ? 'white' : theme.textMuted }}>{i < (dayData.water || 0) ? '💧' : '○'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(139,92,246,0.1))', border: '1px solid rgba(168,85,247,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div><p style={{ fontSize: 14, fontWeight: 'bold', margin: 0, color: theme.text }}>💊 Compléments</p><p style={{ fontSize: 11, color: theme.textMuted, margin: 0 }}>+5 pts si ≥ 3</p></div>
                <span style={{ fontSize: 14, fontWeight: 'bold', color: getSupplementsCount(dayData.supplements) >= 3 ? '#22c55e' : theme.text }}>{getSupplementsCount(dayData.supplements)}/6</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {SUPPLEMENTS.map(s => (
                  <button key={s.id} onClick={() => updateSupplement(s.id, !dayData.supplements?.[s.id])} style={{ padding: 10, borderRadius: 10, border: 'none', cursor: 'pointer', background: dayData.supplements?.[s.id] ? '#8b5cf6' : theme.buttonBg, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 18 }}>{s.emoji}</span>
                    <span style={{ fontSize: 10, color: dayData.supplements?.[s.id] ? 'white' : theme.textMuted }}>{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {['breakfast', 'fasting'].map(k => (
                <div key={k} style={{ flex: 1, padding: 2, borderRadius: 14, background: `linear-gradient(135deg, ${MEALS[k].colors[0]}, ${MEALS[k].colors[1]})` }}>
                  <div style={{ background: dayData?.habits?.[k] ? theme.mealCardBgActive : theme.mealCardBg, borderRadius: 12, padding: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => updateHabit(k, !dayData?.habits?.[k])} style={{ width: 36, height: 36, borderRadius: 10, background: theme.buttonBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: 'none', cursor: 'pointer', color: dayData?.habits?.[k] ? '#22c55e' : theme.text }}>{dayData?.habits?.[k] ? '✓' : MEALS[k].emoji}</button>
                      <div onClick={() => updateHabit(k, !dayData?.habits?.[k])} style={{ flex: 1, textAlign: 'left', cursor: 'pointer' }}>
                        <p style={{ fontSize: 13, fontWeight: 'bold', margin: 0, color: theme.text }}>{MEALS[k].title}</p>
                        <p style={{ fontSize: 10, color: theme.textMuted, margin: 0 }}>{MEALS[k].kcal} kcal • <span style={{ color: dayData?.habits?.[k] ? '#22c55e' : theme.textMuted }}>+{MEALS[k].points} pts</span></p>
                      </div>
                      <button onClick={() => fetchRecipes(k)} style={{ padding: '4px 8px', borderRadius: 6, background: 'transparent', border: `1px solid ${theme.cardBorder}`, cursor: 'pointer' }}><span style={{ fontSize: 12 }}>💡</span></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Fasting Timer - Mini version on Today tab */}
            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(8,145,178,0.1))', border: '1px solid rgba(6,182,212,0.2)', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>⏱️</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 'bold', margin: 0, color: theme.text }}>Jeûne intermittent</p>
                    <p style={{ fontSize: 11, color: dayData?.fastingTimer?.start && !dayData?.fastingTimer?.end ? '#06b6d4' : theme.textMuted, margin: 0, fontFamily: dayData?.fastingTimer?.start && !dayData?.fastingTimer?.end ? 'monospace' : 'inherit', fontWeight: dayData?.fastingTimer?.start && !dayData?.fastingTimer?.end ? 'bold' : 'normal' }}>
                      {dayData?.fastingTimer?.start && !dayData?.fastingTimer?.end
                        ? `${Math.floor(fastingElapsed / 3600).toString().padStart(2, '0')}:${Math.floor((fastingElapsed % 3600) / 60).toString().padStart(2, '0')}:${(fastingElapsed % 60).toString().padStart(2, '0')} / ${dayData?.fastingTimer?.goal || 16}h`
                        : dayData?.fastingTimer?.end
                          ? `✅ ${Math.floor((dayData.fastingTimer.end - dayData.fastingTimer.start) / 3600000)}h terminé`
                          : `Objectif: ${dayData?.fastingTimer?.goal || 16}h`}
                    </p>
                  </div>
                </div>
                <button onClick={() => setTab('fasting')} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#06b6d4', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>
                  Ouvrir
                </button>
              </div>
            </div>

            {Object.entries(MEALS).filter(([k]) => !['breakfast', 'fasting'].includes(k)).map(([k, m]) => (
              <div key={k} style={{ width: '100%', padding: 3, borderRadius: 18, background: `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})`, marginBottom: 10 }}>
                <div style={{ background: dayData?.habits?.[k] ? theme.mealCardBgActive : theme.mealCardBg, borderRadius: 15, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => updateHabit(k, !dayData?.habits?.[k])} style={{ width: 48, height: 48, borderRadius: 12, background: theme.buttonBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, border: 'none', cursor: 'pointer', color: dayData?.habits?.[k] ? '#22c55e' : theme.text }}>{dayData?.habits?.[k] ? '✓' : m.emoji}</button>
                    <div onClick={() => updateHabit(k, !dayData?.habits?.[k])} style={{ flex: 1, textAlign: 'left', cursor: 'pointer' }}><p style={{ fontSize: 16, fontWeight: 'bold', margin: 0, color: theme.text }}>{m.title}</p><p style={{ fontSize: 12, color: theme.textMuted, margin: 0 }}>{m.time} • {m.kcal} kcal</p></div>
                    <button onClick={() => fetchRecipes(k)} style={{ padding: '6px 10px', borderRadius: 8, background: 'transparent', border: `1px solid ${theme.cardBorder}`, cursor: 'pointer', marginRight: 6 }}><span style={{ fontSize: 12 }}>💡</span></button>
                    <div onClick={() => updateHabit(k, !dayData?.habits?.[k])} style={{ padding: '6px 12px', borderRadius: 10, background: theme.buttonBg, cursor: 'pointer' }}><span style={{ fontSize: 14, fontWeight: 'bold', color: dayData?.habits?.[k] ? '#22c55e' : theme.text }}>{dayData?.habits?.[k] ? '✓' : '+20'}</span></div>
                  </div>
                </div>
              </div>
            ))}

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.1))', border: '1px solid rgba(34,197,94,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div><p style={{ fontSize: 14, fontWeight: 'bold', margin: 0, color: theme.text }}>🥗 Repas libres</p><p style={{ fontSize: 11, color: theme.textMuted, margin: 0 }}>📷 Photo ou texte</p></div>
                <button onClick={() => setShowFoodModal(true)} style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer' }}><span style={{ fontSize: 12, fontWeight: 'bold', color: 'white' }}>+ Ajouter</span></button>
              </div>
              {dayData.customMeals?.length > 0 ? dayData.customMeals.map(meal => (
                <div key={meal.id} style={{ background: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)', borderRadius: 12, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span>{meal.isHealthy ? '✅' : '⚠️'}</span><span style={{ fontWeight: 'bold', color: theme.text }}>{meal.name}</span></div>
                      <p style={{ fontSize: 11, color: theme.textMuted, margin: '4px 0 0' }}>{meal.details}</p>
                      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}><span style={{ fontSize: 12, color: '#22c55e' }}>{meal.kcal} kcal</span><span style={{ fontSize: 12, color: meal.points >= 10 ? '#22c55e' : '#f59e0b' }}>+{meal.points} pts</span></div>
                    </div>
                    <button onClick={() => removeCustomMeal(meal.id)} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: '#ef4444' }}>×</button>
                  </div>
                </div>
              )) : <p style={{ fontSize: 12, color: theme.textVeryFaint, textAlign: 'center', margin: 0 }}>Aucun repas libre</p>}
            </div>

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(249,115,22,0.1))', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p style={{ fontSize: 14, fontWeight: 'bold', margin: '0 0 12px', color: theme.text }}>🍔 Écarts (-10 pts)</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {ECARTS.map(e => (
                  <div key={e.id} style={{ background: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)', borderRadius: 12, padding: 10, textAlign: 'center' }}>
                    <span style={{ fontSize: 24 }}>{e.emoji}</span>
                    <p style={{ fontSize: 11, color: theme.textMuted, margin: '4px 0' }}>{e.kcal} kcal</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <button onClick={() => setDayData(p => ({ ...p, ecarts: { ...(p.ecarts || {}), [e.id]: Math.max(0, (p.ecarts?.[e.id] || 0) - 1) } }))} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: theme.buttonBg, color: theme.text, fontSize: 16, cursor: 'pointer' }}>−</button>
                      <span style={{ fontSize: 18, fontWeight: 'bold', color: (dayData.ecarts?.[e.id] || 0) > 0 ? e.color : theme.text }}>{dayData.ecarts?.[e.id] || 0}</span>
                      <button onClick={() => setDayData(p => ({ ...p, ecarts: { ...(p.ecarts || {}), [e.id]: (p.ecarts?.[e.id] || 0) + 1 } }))} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: `${e.color}40`, color: 'white', fontSize: 16, cursor: 'pointer' }}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(245,158,11,0.1))', border: '1px solid rgba(251,191,36,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div><p style={{ fontSize: 14, fontWeight: 'bold', margin: 0, color: theme.text }}>🙏 Gratitudes</p><p style={{ fontSize: 11, color: theme.textMuted, margin: 0 }}>+5 pts si 3 remplies</p></div>
                <span style={{ fontSize: 14, color: (dayData.gratitudes || []).filter(g => g?.trim()).length >= 3 ? '#22c55e' : theme.textMuted }}>{(dayData.gratitudes || []).filter(g => g?.trim()).length}/3</span>
              </div>
              {[0, 1, 2].map(i => (
                <input key={i} value={dayData.gratitudes?.[i] || ''} onChange={e => updateGratitude(i, e.target.value)} placeholder={`${i + 1}. Je suis reconnaissant pour...`} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: theme.inputBg, color: theme.text, fontSize: 16, marginBottom: 8, boxSizing: 'border-box' }} />
              ))}
            </div>

            <div style={card}>
              <p style={{ color: theme.textMuted, fontSize: 14, marginBottom: 10 }}>⚡ Énergie</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {[{ v: 1, e: '😴', c: '#ef4444' }, { v: 2, e: '😔', c: '#f97316' }, { v: 3, e: '😐', c: '#eab308' }, { v: 4, e: '🙂', c: '#22c55e' }, { v: 5, e: '💪', c: '#14b8a6' }].map(l => (
                  <button key={l.v} onClick={() => setDayData(p => ({ ...p, energy: l.v }))} style={{ padding: 12, borderRadius: 12, border: 'none', cursor: 'pointer', background: dayData.energy === l.v ? l.c : theme.buttonBg, fontSize: 24 }}>{l.e}</button>
                ))}
              </div>
            </div>

            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ color: theme.textMuted }}>🌙 Sommeil</span><span style={{ fontWeight: 'bold', color: theme.text }}>{dayData.sleep || 7}h</span></div>
              <input type="range" min={0} max={9} step={0.5} value={dayData.sleep || 7} onChange={e => setDayData(p => ({ ...p, sleep: Number(e.target.value) }))} style={{ width: '100%' }} />
            </div>

            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ color: theme.textMuted }}>😴 Sieste</span><span style={{ fontWeight: 'bold', color: theme.text }}>{dayData.nap || 0} min</span></div>
              <input type="range" min={0} max={120} step={15} value={dayData.nap || 0} onChange={e => setDayData(p => ({ ...p, nap: Number(e.target.value) }))} style={{ width: '100%' }} />
            </div>

            <p style={{ color: theme.textFaint, fontSize: 12, marginBottom: 8 }}>🏃 Activité (+5 pts)</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              {[{ key: 'workout', emoji: '🏋️', label: 'Muscu', color: '#ec4899' }, { key: 'run', emoji: '🏃', label: 'Course', color: '#f59e0b' }, { key: 'walk', emoji: '🚶', label: 'Marche', color: '#06b6d4' }].map(m => (
                <button key={m.key} onClick={() => updateMovement(m.key, !dayData.movement?.[m.key])} style={{ padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', background: dayData.movement?.[m.key] ? m.color : theme.buttonBg, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 24 }}>{m.emoji}</span>
                  <span style={{ color: dayData.movement?.[m.key] ? 'white' : theme.textMuted, fontSize: 12 }}>{m.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {tab === 'fasting' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: theme.text }}>⏱️ Jeûne Intermittent</h1>

            {/* Timer central */}
            <div style={{ ...card, textAlign: 'center', padding: 30 }}>
              {/* Cercle de progression */}
              <div style={{ width: 200, height: 200, margin: '0 auto 20px', position: 'relative' }}>
                <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="100" cy="100" r="90" fill="none" stroke={theme.progressBg} strokeWidth="12" />
                  <circle cx="100" cy="100" r="90" fill="none" stroke={fastingElapsed >= (dayData?.fastingTimer?.goal || 16) * 3600 ? '#22c55e' : '#06b6d4'} strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={565.5}
                    strokeDashoffset={565.5 - (Math.min(1, fastingElapsed / ((dayData?.fastingTimer?.goal || 16) * 3600)) * 565.5)} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: 32, fontWeight: 'bold', margin: 0, fontFamily: 'monospace', color: theme.text }}>
                    {dayData?.fastingTimer?.start && !dayData?.fastingTimer?.end
                      ? `${Math.floor(fastingElapsed / 3600).toString().padStart(2, '0')}:${Math.floor((fastingElapsed % 3600) / 60).toString().padStart(2, '0')}:${(fastingElapsed % 60).toString().padStart(2, '0')}`
                      : dayData?.fastingTimer?.end
                        ? `${Math.floor((dayData.fastingTimer.end - dayData.fastingTimer.start) / 3600000)}h ${Math.floor(((dayData.fastingTimer.end - dayData.fastingTimer.start) % 3600000) / 60000)}min`
                        : '00:00:00'}
                  </p>
                  <p style={{ fontSize: 12, color: theme.textMuted, margin: '4px 0 0' }}>
                    {dayData?.fastingTimer?.start && !dayData?.fastingTimer?.end
                      ? fastingElapsed >= (dayData?.fastingTimer?.goal || 16) * 3600 ? '🎉 Objectif atteint !' : `Objectif: ${dayData?.fastingTimer?.goal || 16}h`
                      : dayData?.fastingTimer?.end ? '✅ Terminé' : `Objectif: ${dayData?.fastingTimer?.goal || 16}h`}
                  </p>
                </div>
              </div>

              {/* Objectif sélectionnable */}
              <p style={{ fontSize: 12, color: theme.textMuted, margin: '0 0 10px' }}>Choisir la durée :</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
                {[12, 14, 16, 18, 20, 24, 36, 48].map(h => (
                  <button key={h} onClick={() => setDayData(p => ({ ...p, fastingTimer: { ...(p.fastingTimer || {}), goal: h } }))}
                    style={{ padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 'bold', background: (dayData?.fastingTimer?.goal || 16) === h ? '#06b6d4' : theme.buttonBg, color: (dayData?.fastingTimer?.goal || 16) === h ? 'white' : theme.text }}>{h}h</button>
                ))}
              </div>

              {/* Bouton START/STOP */}
              {dayData?.fastingTimer?.start && !dayData?.fastingTimer?.end ? (
                <button onClick={() => setDayData(p => ({ ...p, fastingTimer: { ...(p.fastingTimer || {}), end: Date.now() }, habits: { ...(p.habits || {}), fasting: true } }))}
                  style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #ef4444, #f97316)', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: 18 }}>
                  ⏹️ Terminer le jeûne
                </button>
              ) : dayData?.fastingTimer?.end ? (
                <button onClick={() => setDayData(p => ({ ...p, fastingTimer: { goal: p.fastingTimer?.goal || 16, start: null, end: null } }))}
                  style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: theme.buttonBg, color: theme.text, fontWeight: 'bold', cursor: 'pointer', fontSize: 16 }}>
                  🔄 Nouveau jeûne
                </button>
              ) : (
                <button onClick={() => setDayData(p => ({ ...p, fastingTimer: { ...(p.fastingTimer || {}), start: Date.now(), end: null } }))}
                  style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: 18 }}>
                  🚀 Commencer le jeûne
                </button>
              )}
            </div>

            {/* Infos du jeûne en cours */}
            {dayData?.fastingTimer?.start && (
              <div style={{ ...card, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: theme.buttonBg, borderRadius: 12, padding: 12, textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: theme.textMuted, margin: 0 }}>Début</p>
                  <p style={{ fontSize: 16, fontWeight: 'bold', margin: '4px 0 0', color: theme.text }}>{new Date(dayData.fastingTimer.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div style={{ background: theme.buttonBg, borderRadius: 12, padding: 12, textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: theme.textMuted, margin: 0 }}>Fin prévue</p>
                  <p style={{ fontSize: 16, fontWeight: 'bold', margin: '4px 0 0', color: '#06b6d4' }}>{new Date(dayData.fastingTimer.start + (dayData?.fastingTimer?.goal || 16) * 3600000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            )}

            {/* Stats rapides */}
            <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div style={{ background: 'rgba(6,182,212,0.1)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 'bold', color: '#06b6d4', margin: 0 }}>{dayData?.fastingTimer?.goal || 16}h</p>
                <p style={{ fontSize: 10, color: theme.textMuted, margin: '4px 0 0' }}>Objectif</p>
              </div>
              <div style={{ background: 'rgba(139,92,246,0.1)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 'bold', color: '#8b5cf6', margin: 0 }}>{Object.values(allData || {}).filter(d => d.habits?.fasting).length}</p>
                <p style={{ fontSize: 10, color: theme.textMuted, margin: '4px 0 0' }}>Jeûnes réussis</p>
              </div>
              <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 'bold', color: '#22c55e', margin: 0 }}>+20</p>
                <p style={{ fontSize: 10, color: theme.textMuted, margin: '4px 0 0' }}>Points</p>
              </div>
            </div>
          </>
        )}

        {tab === 'week' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: theme.text }}>📊 Statistiques</h1>

            {/* Section 1 : 4 cartes résumé */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
              <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: 16, padding: 16, textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 'bold', margin: 0, color: 'white' }}>{streak}</p>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: '4px 0 0' }}>🔥 Streak jours</p>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', borderRadius: 16, padding: 16, textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 'bold', margin: 0, color: 'white' }}>{enhancedStats.avgScore}</p>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: '4px 0 0' }}>📊 Moyenne 7j</p>
              </div>
              <div style={{ background: `linear-gradient(135deg, ${enhancedStats.weightChange <= 0 ? '#22c55e' : '#ef4444'}, ${enhancedStats.weightChange <= 0 ? '#16a34a' : '#dc2626'})`, borderRadius: 16, padding: 16, textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 'bold', margin: 0, color: 'white' }}>{enhancedStats.weightChange > 0 ? '+' : ''}{enhancedStats.weightChange}</p>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: '4px 0 0' }}>⚖️ Évolution kg</p>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', borderRadius: 16, padding: 16, textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 'bold', margin: 0, color: 'white' }}>{enhancedStats.successRate}%</p>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: '4px 0 0' }}>🎯 Réussite</p>
              </div>
            </div>

            {/* Section 2 : Graphique barres 7 jours */}
            <div style={{ ...card, marginBottom: 20 }}>
              <p style={{ fontSize: 14, fontWeight: 'bold', color: theme.text, margin: '0 0 16px' }}>Score des 7 derniers jours</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 100, gap: 8 }}>
                {enhancedStats.last7Days.map((day, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: theme.text, fontWeight: 'bold' }}>{day.score || ''}</span>
                    <div style={{
                      width: '100%',
                      height: `${Math.max(day.score, 4)}%`,
                      background: day.score >= 80 ? 'linear-gradient(180deg, #22c55e, #16a34a)' : day.score >= 50 ? 'linear-gradient(180deg, #8b5cf6, #7c3aed)' : day.score > 0 ? 'linear-gradient(180deg, #f59e0b, #d97706)' : theme.buttonBg,
                      borderRadius: 4,
                      minHeight: 4
                    }} />
                    <span style={{ fontSize: 10, color: theme.textMuted }}>{day.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3 : Calendrier 14 jours */}
            <div style={card}>
              <p style={{ fontSize: 14, fontWeight: 'bold', color: theme.text, margin: '0 0 12px' }}>📅 Historique (clic pour éditer)</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {last14Days.map((d, i) => { const k = formatDate(d); const data = allData?.[k]; const s = data ? calcScore(data) : 0; return (
                  <button key={i} onClick={() => { setSelectedDate(k); setTab('today'); }} style={{ textAlign: 'center', padding: 6, borderRadius: 10, background: k === selectedDate ? '#8b5cf6' : 'transparent', border: 'none', cursor: 'pointer' }}>
                    <p style={{ fontSize: 9, color: theme.textFaint, margin: 0 }}>{getDayName(d)}</p>
                    <p style={{ fontSize: 12, margin: '3px 0', color: k === selectedDate ? 'white' : theme.text }}>{d.getDate()}</p>
                    <div style={{ width: 26, height: 26, margin: '0 auto', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 'bold', color: 'white', background: !data ? theme.buttonBg : s >= 80 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444' }}>{data ? s : '–'}</div>
                  </button>
                ); })}
              </div>
            </div>

            {/* Section 4 : Graphique poids */}
            {weightChartData.length > 1 && (
              <div style={card}>
                <p style={{ fontSize: 14, fontWeight: 'bold', color: theme.text, margin: '0 0 12px' }}>📈 Évolution du poids</p>
                <div style={{ height: 80, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                  {weightChartData.map((w, i) => (
                    <div key={i} style={{ flex: 1, height: `${w.percent}%`, minHeight: 4, background: 'linear-gradient(180deg, #8b5cf6, #ec4899)', borderRadius: 2 }} title={`${w.weight} kg`} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <span style={{ fontSize: 10, color: theme.textMuted }}>{weightChartData[0]?.weight} kg</span>
                  <span style={{ fontSize: 10, color: theme.textMuted }}>{weightChartData[weightChartData.length - 1]?.weight} kg</span>
                </div>
              </div>
            )}

            {/* Section 5 : Taux de complétion */}
            <div style={card}>
              <p style={{ fontSize: 14, fontWeight: 'bold', color: theme.text, margin: '0 0 14px' }}>✅ Taux de complétion</p>
              {enhancedStats.habitRates.map(h => (
                <div key={h.name} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: theme.text }}>{h.emoji} {h.name}</span>
                    <span style={{ fontSize: 13, color: theme.textMuted, fontWeight: 'bold' }}>{h.rate}%</span>
                  </div>
                  <div style={{ height: 8, background: theme.progressBg, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${h.rate}%`, background: 'linear-gradient(90deg, #8b5cf6, #ec4899)', borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Section 6 : Records */}
            <div style={card}>
              <p style={{ fontSize: 14, fontWeight: 'bold', color: theme.text, margin: '0 0 14px' }}>🏆 Records personnels</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: theme.textMuted, fontSize: 13 }}>Meilleur score</span>
                  <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: 16 }}>{enhancedStats.bestScore}/100</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: theme.textMuted, fontSize: 13 }}>Plus long streak</span>
                  <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: 16 }}>{enhancedStats.longestStreak} jours</span>
                </div>
                {enhancedStats.lowestWeight && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: theme.textMuted, fontSize: 13 }}>Poids le plus bas</span>
                    <span style={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: 16 }}>{enhancedStats.lowestWeight} kg</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: theme.textMuted, fontSize: 13 }}>Total jours suivis</span>
                  <span style={{ color: '#06b6d4', fontWeight: 'bold', fontSize: 16 }}>{totalDays} jours</span>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'plan' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 14, color: theme.text }}>Mon Plan</h1>
            <div style={card}><p style={{ color: theme.textMuted, fontSize: 14, margin: 0 }}>Total: <strong style={{ color: '#10b981' }}>2650 kcal</strong> • TDEE: <strong style={{ color: '#06b6d4' }}>{tdee} kcal</strong></p></div>
            {Object.entries(MEALS).filter(([k]) => k !== 'fasting').map(([k, m]) => (
              <div key={k} style={{ background: `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})`, borderRadius: 16, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 50, height: 50, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 26 }}>{m.emoji}</span></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><p style={{ fontSize: 16, fontWeight: 'bold', margin: 0, color: 'white' }}>{m.title}</p><span style={{ fontSize: 12, background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 8, color: 'white' }}>{m.kcal} kcal</span></div>
                    <p style={{ fontSize: 11, margin: '4px 0 0', color: 'rgba(255,255,255,0.8)' }}>{m.time}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>{m.items.map((item, i) => (<span key={i} style={{ fontSize: 10, background: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: 6, color: 'white' }}>{item}</span>))}</div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'stats' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 14, color: theme.text }}>Profil</h1>

            {/* User info */}
            <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 18, color: 'white' }}>{user?.displayName?.[0] || user?.email?.[0] || '?'}</span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 'bold', margin: 0, color: theme.text }}>{user?.displayName || 'Utilisateur'}</p>
                  <p style={{ fontSize: 11, color: theme.textMuted, margin: 0 }}>{user?.email}</p>
                </div>
              </div>
              <button onClick={handleLogout} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: '#ef4444', fontSize: 12 }}>Déconnexion</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
              <div style={{ background: '#10b981', borderRadius: 14, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 26, fontWeight: 'bold', margin: 0, color: 'white' }}>{totalDays}</p><p style={{ fontSize: 11, margin: 0, color: 'rgba(255,255,255,0.8)' }}>jours</p></div>
              <div style={{ background: '#8b5cf6', borderRadius: 14, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 26, fontWeight: 'bold', margin: 0, color: 'white' }}>{streak}</p><p style={{ fontSize: 11, margin: 0, color: 'rgba(255,255,255,0.8)' }}>🔥 streak</p></div>
              <div style={{ background: '#f59e0b', borderRadius: 14, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 26, fontWeight: 'bold', margin: 0, color: 'white' }}>{monthAvg}</p><p style={{ fontSize: 11, margin: 0, color: 'rgba(255,255,255,0.8)' }}>moy</p></div>
            </div>

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))', border: '1px solid rgba(139,92,246,0.2)' }}>
              <p style={{ fontSize: 12, fontWeight: 'bold', color: theme.textMuted, margin: '0 0 10px' }}>🎯 OBJECTIF</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <div style={{ flex: 1 }}><p style={{ fontSize: 11, color: theme.textMuted, margin: 0 }}>Actuel</p><p style={{ fontSize: 28, fontWeight: 'bold', margin: 0, color: theme.text }}>{profile.poids} kg</p></div>
                <span style={{ fontSize: 24, color: theme.textVeryFaint }}>→</span>
                <div style={{ flex: 1, textAlign: 'right' }}><p style={{ fontSize: 11, color: theme.textMuted, margin: 0 }}>Objectif</p><p style={{ fontSize: 28, fontWeight: 'bold', margin: 0, color: '#22c55e' }}>{profile.objectifPoids} kg</p></div>
              </div>
              {prediction?.date && <div style={{ background: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)', borderRadius: 10, padding: 10 }}><p style={{ fontSize: 12, color: '#22c55e', margin: 0 }}>📈 {prediction.message} → {prediction.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p></div>}
            </div>

            {weightChartData.length > 1 && (
              <div style={card}>
                <p style={{ fontSize: 12, fontWeight: 'bold', color: theme.textMuted, margin: '0 0 10px' }}>📊 ÉVOLUTION</p>
                <div style={{ height: 100, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                  {weightChartData.map((w, i) => (
                    <div key={i} style={{ flex: 1, height: `${w.percent}%`, minHeight: 4, background: 'linear-gradient(180deg, #8b5cf6, #ec4899)', borderRadius: 2 }} />
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => { setModalWeight(profile.poids); setShowWeightModal(true); }} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', background: '#06b6d4', marginBottom: 14, color: 'white' }}><span style={{ fontSize: 14, fontWeight: 'bold' }}>⚖️ Enregistrer poids</span></button>

            <div style={card}>
              <p style={{ fontSize: 12, fontWeight: 'bold', color: theme.textMuted, margin: '0 0 10px' }}>⚙️ PROFIL</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 11, color: theme.textMuted }}>Poids</label><input type="number" value={profile.poids} onChange={e => setProfile(p => ({ ...p, poids: Number(e.target.value) || 75 }))} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: theme.inputBg, color: theme.text, marginTop: 4, boxSizing: 'border-box', fontSize: 16 }} /></div>
                <div><label style={{ fontSize: 11, color: '#22c55e' }}>🎯 Objectif</label><input type="number" value={profile.objectifPoids} onChange={e => setProfile(p => ({ ...p, objectifPoids: Number(e.target.value) || 70 }))} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: 'rgba(34,197,94,0.2)', color: '#22c55e', marginTop: 4, boxSizing: 'border-box', fontSize: 16 }} /></div>
                <div><label style={{ fontSize: 11, color: theme.textMuted }}>Taille</label><input type="number" value={profile.taille} onChange={e => setProfile(p => ({ ...p, taille: Number(e.target.value) || 175 }))} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: theme.inputBg, color: theme.text, marginTop: 4, boxSizing: 'border-box', fontSize: 16 }} /></div>
                <div><label style={{ fontSize: 11, color: theme.textMuted }}>Âge</label><input type="number" value={profile.age} onChange={e => setProfile(p => ({ ...p, age: Number(e.target.value) || 30 }))} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: theme.inputBg, color: theme.text, marginTop: 4, boxSizing: 'border-box', fontSize: 16 }} /></div>
              </div>
            </div>
          </>
        )}
      </div>

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: theme.navBg, backdropFilter: 'blur(10px)', borderTop: `1px solid ${theme.cardBorder}`, display: 'flex', justifyContent: 'space-around', padding: '8px 0 24px', zIndex: 9999 }}>
        {[{ id: 'today', icon: '🏠', label: "Aujourd'hui" }, { id: 'fasting', icon: '⏱️', label: 'Jeûne' }, { id: 'week', icon: '📅', label: 'Stats' }, { id: 'stats', icon: '⚙️', label: 'Profil' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}><div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tab === t.id ? '#8b5cf6' : 'transparent' }}><span style={{ fontSize: 18 }}>{t.icon}</span></div><span style={{ fontSize: 10, color: tab === t.id ? '#8b5cf6' : theme.textMuted }}>{t.label}</span></button>
        ))}
      </nav>

      {/* MODALS */}
      {showWeightModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowWeightModal(false)}>
          <div style={{ background: '#1e293b', borderRadius: 20, padding: 20, maxWidth: 320, width: '100%' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: '0 0 16px', textAlign: 'center' }}>⚖️ Pesée</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 }}>
              <button onClick={() => setModalWeight(w => Math.max(40, Math.round((w - 0.1) * 10) / 10))} style={{ width: 50, height: 50, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 24, cursor: 'pointer' }}>−</button>
              <div><span style={{ fontSize: 40, fontWeight: 'bold' }}>{modalWeight.toFixed(1)}</span><span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>kg</span></div>
              <button onClick={() => setModalWeight(w => Math.min(200, Math.round((w + 0.1) * 10) / 10))} style={{ width: 50, height: 50, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 24, cursor: 'pointer' }}>+</button>
            </div>
            <div style={{ display: 'flex', gap: 10 }}><button onClick={() => setShowWeightModal(false)} style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>Annuler</button><button onClick={() => saveWeight(modalWeight)} style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', background: '#06b6d4', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>OK</button></div>
          </div>
        </div>
      )}

      {showFoodModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => { setShowFoodModal(false); setFoodResult(null); setFoodDescription(''); setFoodImage(null); }}>
          <div style={{ background: '#1e293b', borderRadius: 20, padding: 20, maxWidth: 380, width: '100%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: '0 0 16px', textAlign: 'center' }}>🥗 Ajouter un repas</h2>
            <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', padding: 14, borderRadius: 12, border: '2px dashed rgba(255,255,255,0.2)', background: 'transparent', color: 'white', cursor: 'pointer', marginBottom: 12 }}>📷 Prendre une photo</button>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} style={{ display: 'none' }} />
            {foodImage && <img src={foodImage} alt="Repas" style={{ width: '100%', borderRadius: 12, marginBottom: 12 }} />}
            <textarea value={foodDescription} onChange={e => setFoodDescription(e.target.value)} placeholder="Ou décris ton repas..." style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 16, minHeight: 60, resize: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
            {!foodResult && <button onClick={analyzeFood} disabled={foodLoading || (!foodDescription.trim() && !foodImage)} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', background: foodLoading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: 'white', fontWeight: 'bold', marginBottom: 12 }}>{foodLoading ? '🤖 Analyse...' : '🤖 Analyser'}</button>}
            {foodResult && (
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><span style={{ fontSize: 20 }}>{foodResult.isHealthy ? '✅' : '⚠️'}</span><span style={{ fontSize: 16, fontWeight: 'bold' }}>{foodResult.name}</span></div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 12px' }}>{foodResult.details}</p>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flex: 1, background: 'rgba(34,197,94,0.1)', borderRadius: 8, padding: 10, textAlign: 'center' }}><p style={{ fontSize: 20, fontWeight: 'bold', color: '#22c55e', margin: 0 }}>{foodResult.kcal}</p><p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', margin: 0 }}>kcal</p></div>
                  <div style={{ flex: 1, background: 'rgba(139,92,246,0.1)', borderRadius: 8, padding: 10, textAlign: 'center' }}><p style={{ fontSize: 20, fontWeight: 'bold', color: '#8b5cf6', margin: 0 }}>+{foodResult.points}</p><p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', margin: 0 }}>pts</p></div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}><button onClick={() => { setShowFoodModal(false); setFoodResult(null); setFoodDescription(''); setFoodImage(null); }} style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>Annuler</button>{foodResult && <button onClick={addCustomMeal} style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', background: '#22c55e', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Ajouter</button>}</div>
          </div>
        </div>
      )}

      {showAnalysis && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowAnalysis(false)}>
          <div style={{ background: '#1e293b', borderRadius: 20, padding: 20, maxWidth: 380, width: '100%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><h2 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>🤖 Analyse IA</h2><button onClick={() => setShowAnalysis(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 24, cursor: 'pointer' }}>×</button></div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}><button onClick={() => fetchAnalysis('week')} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', background: analysisPeriod === 'week' ? '#8b5cf6' : 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 'bold' }}>7 jours</button><button onClick={() => fetchAnalysis('month')} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', background: analysisPeriod === 'month' ? '#8b5cf6' : 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 'bold' }}>30 jours</button></div>
            {analysisLoading ? <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Analyse...</p> : <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{analysis}</div>}
          </div>
        </div>
      )}

      {showRecipeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowRecipeModal(false)}>
          <div style={{ background: theme.modalBg, borderRadius: 20, padding: 20, maxWidth: 420, width: '100%', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: 0, color: theme.text }}>💡 Idées recettes</h2>
              <button onClick={() => setShowRecipeModal(false)} style={{ background: 'none', border: 'none', color: theme.textMuted, fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>
            <p style={{ fontSize: 12, color: theme.textMuted, margin: '0 0 16px' }}>
              {recipeMealType && MEALS[recipeMealType] ? `Pour votre ${MEALS[recipeMealType].title.toLowerCase()}` : 'Suggestions personnalisées'}
            </p>
            {recipeLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <p style={{ color: theme.textMuted }}>🍳 Génération des recettes...</p>
              </div>
            ) : recipes.length === 0 ? (
              <p style={{ textAlign: 'center', color: theme.textMuted, padding: 20 }}>Aucune recette disponible</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {recipes.map((recipe, idx) => (
                  <div key={idx} style={{ background: theme.card, borderRadius: 16, padding: 16, border: `1px solid ${theme.cardBorder}` }}>
                    {/* Header avec emoji et nom */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 24 }}>{recipe.emoji || '🍽️'}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 15, fontWeight: 'bold', margin: 0, color: theme.text }}>{recipe.name}</p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          <span style={{ fontSize: 11, background: 'rgba(6,182,212,0.2)', color: '#06b6d4', padding: '3px 8px', borderRadius: 6 }}>⏱️ {recipe.prepTime}{typeof recipe.prepTime === 'number' ? ' min' : ''}</span>
                          <span style={{ fontSize: 11, background: 'rgba(249,115,22,0.2)', color: '#f97316', padding: '3px 8px', borderRadius: 6 }}>🔥 {recipe.kcal || recipe.calories} kcal</span>
                        </div>
                      </div>
                    </div>

                    {/* Ingrédients */}
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ fontSize: 12, fontWeight: 'bold', color: theme.textMuted, margin: '0 0 8px' }}>📝 Ingrédients</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(recipe.ingredients || []).map((ing, i) => (
                          <span key={i} style={{ fontSize: 11, background: 'rgba(139,92,246,0.15)', color: '#a78bfa', padding: '4px 10px', borderRadius: 8 }}>• {ing}</span>
                        ))}
                      </div>
                    </div>

                    {/* Étapes */}
                    {recipe.steps && recipe.steps.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: 12, fontWeight: 'bold', color: theme.textMuted, margin: '0 0 8px' }}>👨‍🍳 Préparation</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {recipe.steps.map((step, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                              <span style={{ width: 20, height: 20, borderRadius: 10, background: 'rgba(34,197,94,0.2)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 'bold', flexShrink: 0 }}>{i + 1}</span>
                              <p style={{ fontSize: 12, color: theme.text, margin: 0, lineHeight: 1.4 }}>{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tip du chef */}
                    {recipe.tip && (
                      <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: 10 }}>
                        <p style={{ fontSize: 11, color: '#fbbf24', margin: 0, fontStyle: 'italic' }}>💡 {recipe.tip}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => fetchRecipes(recipeMealType)} disabled={recipeLoading} style={{ width: '100%', marginTop: 16, padding: 14, borderRadius: 12, border: 'none', background: recipeLoading ? theme.buttonBg : 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
              {recipeLoading ? '...' : '🔄 Nouvelles idées'}
            </button>
          </div>
        </div>
      )}

      {showWeeklyReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowWeeklyReport(false)}>
          <div style={{ background: '#1e293b', borderRadius: 20, padding: 20, maxWidth: 400, width: '100%', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>📊 Rapport Hebdo</h2>
              <button onClick={() => setShowWeeklyReport(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>

            {weeklyStats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
                <div style={{ background: 'rgba(139,92,246,0.1)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 'bold', color: '#8b5cf6', margin: 0 }}>{weeklyStats.avgScore}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>Score moyen</p>
                </div>
                <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 'bold', color: '#22c55e', margin: 0 }}>{weeklyStats.days}/7</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>Jours suivis</p>
                </div>
                <div style={{ background: 'rgba(6,182,212,0.1)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 'bold', color: '#06b6d4', margin: 0 }}>{weeklyStats.avgSleep}h</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>Sommeil moy.</p>
                </div>
                <div style={{ background: 'rgba(249,115,22,0.1)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 'bold', color: '#f97316', margin: 0 }}>{weeklyStats.workoutDays}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>Jours sport</p>
                </div>
              </div>
            )}

            {weeklyReportLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>📝 Génération du rapport...</p>
              </div>
            ) : (
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {weeklyReport}
              </div>
            )}

            <button onClick={fetchWeeklyReport} disabled={weeklyReportLoading} style={{ width: '100%', marginTop: 16, padding: 14, borderRadius: 12, border: 'none', background: weeklyReportLoading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
              {weeklyReportLoading ? '...' : '🔄 Régénérer'}
            </button>
          </div>
        </div>
      )}

      {showVoiceCoach && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 10000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 'bold', margin: 0 }}>🎙️ Coach Zen</h2>
            <button onClick={() => setShowVoiceCoach(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 24, cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            {voiceMessages.length === 0 && (
              <div style={{ textAlign: 'center', paddingTop: 40 }}>
                <div style={{ width: 80, height: 80, borderRadius: 40, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 40 }}>🧘</span></div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16 }}>Salut ! Je connais tout ton parcours.</p>
                <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {['Comment je progresse ?', 'Conseils pour aujourd\'hui', 'Analyse mes habitudes'].map((q, i) => (
                    <button key={i} onClick={() => sendVoiceMessage(q)} style={{ padding: '8px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: 12, cursor: 'pointer' }}>{q}</button>
                  ))}
                </div>
              </div>
            )}
            {voiceMessages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 12, display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '80%', padding: 12, borderRadius: 16, background: msg.role === 'user' ? '#8b5cf6' : 'rgba(255,255,255,0.1)' }}>
                  <p style={{ fontSize: 14, margin: 0, lineHeight: 1.5 }}>{msg.content}</p>
                </div>
              </div>
            ))}
            {voiceLoading && <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ padding: 12, borderRadius: 16, background: 'rgba(255,255,255,0.1)' }}><p style={{ margin: 0 }}>...</p></div></div>}
          </div>
          <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 10 }}>
            <button onClick={startListening} style={{ width: 50, height: 50, borderRadius: 25, border: 'none', background: isListening ? '#ef4444' : '#06b6d4', cursor: 'pointer' }}><span style={{ fontSize: 20 }}>{isListening ? '🔴' : '🎙️'}</span></button>
            <input value={voiceInput} onChange={e => setVoiceInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendVoiceMessage(voiceInput)} placeholder="Message..." enterKeyHint="send" autoComplete="off" style={{ flex: 1, padding: 14, borderRadius: 25, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 16 }} />
            <button onClick={() => sendVoiceMessage(voiceInput)} disabled={!voiceInput.trim()} style={{ width: 50, height: 50, borderRadius: 25, border: 'none', background: voiceInput.trim() ? '#8b5cf6' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}><span>→</span></button>
          </div>
        </div>
      )}

      {showBadges && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowBadges(false)}>
          <div style={{ background: '#1e293b', borderRadius: 20, padding: 20, maxWidth: 380, width: '100%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: '0 0 16px', textAlign: 'center' }}>🏆 Badges ({unlockedBadges.length}/{BADGES.length})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {BADGES.map(b => (
                <div key={b.id} style={{ background: unlockedBadges.includes(b.id) ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, textAlign: 'center', opacity: unlockedBadges.includes(b.id) ? 1 : 0.4 }}>
                  <span style={{ fontSize: 28 }}>{b.emoji}</span>
                  <p style={{ fontSize: 11, fontWeight: 'bold', margin: '4px 0 0' }}>{b.name}</p>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0' }}>{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCelebration && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 80 }}>{showCelebration.emoji}</span>
            <h2 style={{ fontSize: 24, fontWeight: 'bold', margin: '16px 0 8px' }}>🎉 Badge débloqué !</h2>
            <p style={{ fontSize: 18, color: '#a78bfa' }}>{showCelebration.name}</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{showCelebration.desc}</p>
          </div>
        </div>
      )}
    </div>
  );
}
