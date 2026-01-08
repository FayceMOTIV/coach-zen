'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { checkRedirectResult, 
  saveToFirebase, 
  loadFromFirebase, 
  signInWithGoogle, 
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
  gratitudes: ['', '', '']
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

// LOGIN COMPONENT
function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    const result = await signInWithGoogle();
    if (!result.success) setError(result.error);
    setLoading(false);
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (mode === 'login') {
      const result = await signInWithEmail(email, password);
      if (!result.success) setError(result.error);
    } else if (mode === 'signup') {
      const result = await signUpWithEmail(email, password);
      if (!result.success) setError(result.error);
    } else if (mode === 'reset') {
      const result = await resetPassword(email);
      if (result.success) {
        setMessage('Email envoyé ! Vérifie ta boîte mail.');
        setMode('login');
      } else {
        setError(result.error);
      }
    }
    setLoading(false);
  };

  const container = { minHeight: '100dvh', background: '#0f172a', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 };

  return (
    <div style={container}>
      <div style={{ maxWidth: 360, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <span style={{ fontSize: 40 }}>🌿</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 'bold', margin: 0, background: 'linear-gradient(to right, #c4b5fd, #f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Coach Zen</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>Ton coach nutrition personnel</p>
        </div>

        <button onClick={handleGoogle} disabled={loading} style={{ width: '100%', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', background: 'white', color: '#333', fontSize: 16, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continuer avec Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>ou</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        </div>

        <form onSubmit={handleEmail}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 16, marginBottom: 12, boxSizing: 'border-box' }} />
          
          {mode !== 'reset' && (
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" required minLength={6} style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 16, marginBottom: 12, boxSizing: 'border-box' }} />
          )}

          {error && <p style={{ color: '#ef4444', fontSize: 14, margin: '0 0 12px' }}>{error}</p>}
          {message && <p style={{ color: '#22c55e', fontSize: 14, margin: '0 0 12px' }}>{message}</p>}

          <button type="submit" disabled={loading} style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: 'white', fontSize: 16, fontWeight: 'bold', cursor: 'pointer', marginBottom: 16 }}>
            {loading ? '...' : mode === 'login' ? 'Se connecter' : mode === 'signup' ? 'Créer un compte' : 'Envoyer le lien'}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          {mode === 'login' && (
            <>
              <button onClick={() => setMode('reset')} style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: 14, cursor: 'pointer', marginBottom: 8 }}>Mot de passe oublié ?</button>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>
                Pas de compte ? <button onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: 14, cursor: 'pointer' }}>S'inscrire</button>
              </p>
            </>
          )}
          {mode === 'signup' && (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>
              Déjà un compte ? <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: 14, cursor: 'pointer' }}>Se connecter</button>
            </p>
          )}
          {mode === 'reset' && (
            <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: 14, cursor: 'pointer' }}>← Retour</button>
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
  const fileInputRef = useRef(null);

  const realToday = useMemo(() => formatDate(new Date()), []);
  const isToday = selectedDate === realToday;

  // Auth listener
  useEffect(() => {
    checkRedirectResult().then(result => {
      if (result.success && result.user) {
        setUser(result.user);
        setAuthLoading(false);
      }
    });
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);
  // Auth listener
  useEffect(() => {
    checkRedirectResult().then(result => {
      if (result.success && result.user) {
        setUser(result.user);
        setAuthLoading(false);
      }
    });
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);
  // Auth listener
  useEffect(() => {
    checkRedirectResult().then(result => {
      if (result.success && result.user) {
        setUser(result.user);
        setAuthLoading(false);
      }
    });
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);
  // Auth listener
  useEffect(() => {
    checkRedirectResult().then(result => {
      if (result.success && result.user) {
        setUser(result.user);
        setAuthLoading(false);
      }
    });
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);
  // Auth listener
  useEffect(() => {
    checkRedirectResult().then(result => {
      if (result.success && result.user) {
        setUser(result.user);
        setAuthLoading(false);
      }
    });
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);
  // Auth listener
  useEffect(() => {
    checkRedirectResult().then(result => {
      if (result.success && result.user) {
        setUser(result.user);
        setAuthLoading(false);
      }
    });
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);
  // Auth listener
  useEffect(() => {
    checkRedirectResult().then(result => {
      if (result.success && result.user) {
        setUser(result.user);
        setAuthLoading(false);
      }
    });
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);
  // Auth listener
  useEffect(() => {
    checkRedirectResult().then(result => {
      if (result.success && result.user) {
        setUser(result.user);
        setAuthLoading(false);
      }
    });
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);
  // Auth listener
  useEffect(() => {
    checkRedirectResult().then(result => {
      if (result.success && result.user) {
        setUser(result.user);
        setAuthLoading(false);
      }
    });
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
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

  const container = { minHeight: '100dvh', background: '#0f172a', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', paddingBottom: 90 };
  const content = { maxWidth: 500, margin: '0 auto', padding: '12px 16px 20px' };
  const card = { background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 14, marginBottom: 12, border: '1px solid rgba(255,255,255,0.1)' };

  // Show loading
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
            <button onClick={() => setShowBadges(true)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', position: 'relative' }}>
              <span style={{ fontSize: 14 }}>🏆</span>
              {unlockedBadges.length > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: '#22c55e', color: 'white', fontSize: 10, width: 16, height: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unlockedBadges.length}</span>}
            </button>
            <button onClick={() => setShowVoiceCoach(true)} style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', border: 'none', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}><span style={{ fontSize: 14 }}>🎙️</span></button>
            <button onClick={() => { setShowAnalysis(true); fetchAnalysis('week'); }} style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', border: 'none', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}><span style={{ fontSize: 12, fontWeight: 'bold' }}>🤖</span></button>
          </div>
        </header>

        {tab === 'today' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              {!isToday && <button onClick={() => setSelectedDate(realToday)} style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, padding: '6px 14px', marginBottom: 8, cursor: 'pointer' }}><span style={{ color: '#a78bfa', fontSize: 12 }}>← Retour à aujourd'hui</span></button>}
              <p style={{ color: isToday ? 'rgba(255,255,255,0.4)' : '#f59e0b', fontSize: 12, margin: 0 }}>{isToday ? getDayName(selectedDateObj) : '⚠️ Édition'}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}><button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(formatDate(d)); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', color: 'white', fontSize: 18 }}>←</button><h1 style={{ fontSize: 26, fontWeight: 'bold', margin: 0, color: 'white' }}>{selectedDateObj.getDate()} {getMonthName(selectedDateObj)}</h1><button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); if (d <= new Date()) setSelectedDate(formatDate(d)); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', color: 'white', fontSize: 18, opacity: isToday ? 0.3 : 1 }} disabled={isToday}>→</button></div>
            </div>

            {isToday && coachMessage && (
              <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', padding: 2, borderRadius: 16, marginBottom: 12 }}>
                <div style={{ background: 'rgba(15,23,42,0.95)', borderRadius: 14, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontWeight: 'bold', fontSize: 14 }}>Z</span></div>
                    <p style={{ flex: 1, fontSize: 14, margin: 0, lineHeight: 1.5 }}>{coachMessage}</p>
                    <button onClick={() => setCoachMessage(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18, padding: 0 }}>×</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
              <div><h2 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>Score</h2><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '4px 0' }}>{score >= 80 ? '🔥 On fire!' : score >= 60 ? '💪 Solide' : score >= 40 ? '👍 En route' : '🌱 Ça pousse'}</p></div>
              <div style={{ width: 80, height: 80, borderRadius: 40, border: '6px solid #8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 28, fontWeight: 'bold' }}>{score}</span></div>
            </div>

            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>🔥 Calories</span><span style={{ fontSize: 16, fontWeight: 'bold', color: totalKcal > tdee ? '#ef4444' : '#10b981' }}>{totalKcal} / {tdee}</span></div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}><div style={{ height: '100%', background: totalKcal > tdee ? '#ef4444' : '#10b981', width: `${Math.min((totalKcal / tdee) * 100, 100)}%` }} /></div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '8px 0 0', textAlign: 'center' }}>{(tdee - totalKcal) > 0 ? `📉 Déficit: −${tdee - totalKcal} kcal` : `📈 Surplus: +${Math.abs(tdee - totalKcal)} kcal`}</p>
            </div>

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(8,145,178,0.1))', border: '1px solid rgba(6,182,212,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div><p style={{ fontSize: 14, fontWeight: 'bold', margin: 0 }}>💧 Hydratation</p><p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>+10 pts si ≥ 8</p></div>
                <span style={{ fontSize: 18, fontWeight: 'bold', color: (dayData.water || 0) >= 8 ? '#22c55e' : 'white' }}>{dayData.water || 0}/8</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[...Array(8)].map((_, i) => (
                  <button key={i} onClick={() => setDayData(p => ({ ...p, water: i + 1 }))} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', background: i < (dayData.water || 0) ? '#06b6d4' : 'rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: 16 }}>{i < (dayData.water || 0) ? '💧' : '○'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(139,92,246,0.1))', border: '1px solid rgba(168,85,247,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div><p style={{ fontSize: 14, fontWeight: 'bold', margin: 0 }}>💊 Compléments</p><p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>+5 pts si ≥ 3</p></div>
                <span style={{ fontSize: 14, fontWeight: 'bold', color: getSupplementsCount(dayData.supplements) >= 3 ? '#22c55e' : 'white' }}>{getSupplementsCount(dayData.supplements)}/6</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {SUPPLEMENTS.map(s => (
                  <button key={s.id} onClick={() => updateSupplement(s.id, !dayData.supplements?.[s.id])} style={{ padding: 10, borderRadius: 10, border: 'none', cursor: 'pointer', background: dayData.supplements?.[s.id] ? '#8b5cf6' : 'rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 18 }}>{s.emoji}</span>
                    <span style={{ fontSize: 10, color: dayData.supplements?.[s.id] ? 'white' : 'rgba(255,255,255,0.5)' }}>{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {['breakfast', 'fasting'].map(k => (
                <button key={k} onClick={() => updateHabit(k, !dayData?.habits?.[k])} style={{ flex: 1, padding: 2, borderRadius: 14, background: `linear-gradient(135deg, ${MEALS[k].colors[0]}, ${MEALS[k].colors[1]})`, border: 'none', cursor: 'pointer' }}>
                  <div style={{ background: dayData?.habits?.[k] ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.95)', borderRadius: 12, padding: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{dayData?.habits?.[k] ? '✓' : MEALS[k].emoji}</div>
                      <div style={{ flex: 1, textAlign: 'left' }}><p style={{ fontSize: 13, fontWeight: 'bold', margin: 0 }}>{MEALS[k].title}</p><p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{MEALS[k].kcal} kcal</p></div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {Object.entries(MEALS).filter(([k]) => !['breakfast', 'fasting'].includes(k)).map(([k, m]) => (
              <button key={k} onClick={() => updateHabit(k, !dayData?.habits?.[k])} style={{ width: '100%', padding: 3, borderRadius: 18, background: `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})`, border: 'none', cursor: 'pointer', marginBottom: 10 }}>
                <div style={{ background: dayData?.habits?.[k] ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.95)', borderRadius: 15, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{dayData?.habits?.[k] ? '✓' : m.emoji}</div>
                    <div style={{ flex: 1, textAlign: 'left' }}><p style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>{m.title}</p><p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{m.time} • {m.kcal} kcal</p></div>
                    <div style={{ padding: '6px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.1)' }}><span style={{ fontSize: 14, fontWeight: 'bold' }}>{dayData?.habits?.[k] ? '✓' : '+20'}</span></div>
                  </div>
                </div>
              </button>
            ))}

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.1))', border: '1px solid rgba(34,197,94,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div><p style={{ fontSize: 14, fontWeight: 'bold', margin: 0 }}>🥗 Repas libres</p><p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>📷 Photo ou texte</p></div>
                <button onClick={() => setShowFoodModal(true)} style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer' }}><span style={{ fontSize: 12, fontWeight: 'bold' }}>+ Ajouter</span></button>
              </div>
              {dayData.customMeals?.length > 0 ? dayData.customMeals.map(meal => (
                <div key={meal.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span>{meal.isHealthy ? '✅' : '⚠️'}</span><span style={{ fontWeight: 'bold' }}>{meal.name}</span></div>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>{meal.details}</p>
                      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}><span style={{ fontSize: 12, color: '#22c55e' }}>{meal.kcal} kcal</span><span style={{ fontSize: 12, color: meal.points >= 10 ? '#22c55e' : '#f59e0b' }}>+{meal.points} pts</span></div>
                    </div>
                    <button onClick={() => removeCustomMeal(meal.id)} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: '#ef4444' }}>×</button>
                  </div>
                </div>
              )) : <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', margin: 0 }}>Aucun repas libre</p>}
            </div>

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(249,115,22,0.1))', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p style={{ fontSize: 14, fontWeight: 'bold', margin: '0 0 12px' }}>🍔 Écarts (-10 pts)</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {ECARTS.map(e => (
                  <div key={e.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 10, textAlign: 'center' }}>
                    <span style={{ fontSize: 24 }}>{e.emoji}</span>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '4px 0' }}>{e.kcal} kcal</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <button onClick={() => setDayData(p => ({ ...p, ecarts: { ...(p.ecarts || {}), [e.id]: Math.max(0, (p.ecarts?.[e.id] || 0) - 1) } }))} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 16, cursor: 'pointer' }}>−</button>
                      <span style={{ fontSize: 18, fontWeight: 'bold', color: (dayData.ecarts?.[e.id] || 0) > 0 ? e.color : 'white' }}>{dayData.ecarts?.[e.id] || 0}</span>
                      <button onClick={() => setDayData(p => ({ ...p, ecarts: { ...(p.ecarts || {}), [e.id]: (p.ecarts?.[e.id] || 0) + 1 } }))} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: `${e.color}40`, color: 'white', fontSize: 16, cursor: 'pointer' }}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(245,158,11,0.1))', border: '1px solid rgba(251,191,36,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div><p style={{ fontSize: 14, fontWeight: 'bold', margin: 0 }}>🙏 Gratitudes</p><p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>+5 pts si 3 remplies</p></div>
                <span style={{ fontSize: 14, color: (dayData.gratitudes || []).filter(g => g?.trim()).length >= 3 ? '#22c55e' : 'rgba(255,255,255,0.5)' }}>{(dayData.gratitudes || []).filter(g => g?.trim()).length}/3</span>
              </div>
              {[0, 1, 2].map(i => (
                <input key={i} value={dayData.gratitudes?.[i] || ''} onChange={e => updateGratitude(i, e.target.value)} placeholder={`${i + 1}. Je suis reconnaissant pour...`} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: 16, marginBottom: 8, boxSizing: 'border-box' }} />
              ))}
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
            </div>

            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 8 }}>🏃 Activité (+5 pts)</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              {[{ key: 'workout', emoji: '🏋️', label: 'Muscu', color: '#ec4899' }, { key: 'run', emoji: '🏃', label: 'Course', color: '#f59e0b' }, { key: 'walk', emoji: '🚶', label: 'Marche', color: '#06b6d4' }].map(m => (
                <button key={m.key} onClick={() => updateMovement(m.key, !dayData.movement?.[m.key])} style={{ padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', background: dayData.movement?.[m.key] ? m.color : 'rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 24 }}>{m.emoji}</span>
                  <span style={{ color: dayData.movement?.[m.key] ? 'white' : 'rgba(255,255,255,0.5)', fontSize: 12 }}>{m.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {tab === 'week' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 14 }}>Semaine</h1>
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
                    <p style={{ fontSize: 12, margin: '3px 0' }}>{d.getDate()}</p>
                    <div style={{ width: 26, height: 26, margin: '0 auto', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 'bold', background: !data ? 'rgba(255,255,255,0.05)' : s >= 80 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444' }}>{data ? s : '–'}</div>
                  </button>
                ); })}
              </div>
            </div>
          </>
        )}

        {tab === 'plan' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 14 }}>Mon Plan</h1>
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
          </>
        )}

        {tab === 'stats' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 14 }}>Profil</h1>
            
            {/* User info */}
            <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 18 }}>{user?.displayName?.[0] || user?.email?.[0] || '?'}</span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 'bold', margin: 0 }}>{user?.displayName || 'Utilisateur'}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{user?.email}</p>
                </div>
              </div>
              <button onClick={handleLogout} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: '#ef4444', fontSize: 12 }}>Déconnexion</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
              <div style={{ background: '#10b981', borderRadius: 14, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 26, fontWeight: 'bold', margin: 0 }}>{totalDays}</p><p style={{ fontSize: 11, margin: 0, opacity: 0.8 }}>jours</p></div>
              <div style={{ background: '#8b5cf6', borderRadius: 14, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 26, fontWeight: 'bold', margin: 0 }}>{streak}</p><p style={{ fontSize: 11, margin: 0, opacity: 0.8 }}>🔥 streak</p></div>
              <div style={{ background: '#f59e0b', borderRadius: 14, padding: 12, textAlign: 'center' }}><p style={{ fontSize: 26, fontWeight: 'bold', margin: 0 }}>{monthAvg}</p><p style={{ fontSize: 11, margin: 0, opacity: 0.8 }}>moy</p></div>
            </div>

            <div style={{ ...card, background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))', border: '1px solid rgba(139,92,246,0.2)' }}>
              <p style={{ fontSize: 12, fontWeight: 'bold', color: 'rgba(255,255,255,0.6)', margin: '0 0 10px' }}>🎯 OBJECTIF</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <div style={{ flex: 1 }}><p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Actuel</p><p style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>{profile.poids} kg</p></div>
                <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.3)' }}>→</span>
                <div style={{ flex: 1, textAlign: 'right' }}><p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Objectif</p><p style={{ fontSize: 28, fontWeight: 'bold', margin: 0, color: '#22c55e' }}>{profile.objectifPoids} kg</p></div>
              </div>
              {prediction?.date && <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 10 }}><p style={{ fontSize: 12, color: '#22c55e', margin: 0 }}>📈 {prediction.message} → {prediction.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p></div>}
            </div>

            {weightChartData.length > 1 && (
              <div style={card}>
                <p style={{ fontSize: 12, fontWeight: 'bold', color: 'rgba(255,255,255,0.6)', margin: '0 0 10px' }}>📊 ÉVOLUTION</p>
                <div style={{ height: 100, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                  {weightChartData.map((w, i) => (
                    <div key={i} style={{ flex: 1, height: `${w.percent}%`, minHeight: 4, background: 'linear-gradient(180deg, #8b5cf6, #ec4899)', borderRadius: 2 }} />
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => { setModalWeight(profile.poids); setShowWeightModal(true); }} style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', background: '#06b6d4', marginBottom: 14 }}><span style={{ fontSize: 14, fontWeight: 'bold' }}>⚖️ Enregistrer poids</span></button>

            <div style={card}>
              <p style={{ fontSize: 12, fontWeight: 'bold', color: 'rgba(255,255,255,0.6)', margin: '0 0 10px' }}>⚙️ PROFIL</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Poids</label><input type="number" value={profile.poids} onChange={e => setProfile(p => ({ ...p, poids: Number(e.target.value) || 75 }))} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', marginTop: 4, boxSizing: 'border-box', fontSize: 16 }} /></div>
                <div><label style={{ fontSize: 11, color: '#22c55e' }}>🎯 Objectif</label><input type="number" value={profile.objectifPoids} onChange={e => setProfile(p => ({ ...p, objectifPoids: Number(e.target.value) || 70 }))} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: 'rgba(34,197,94,0.2)', color: '#22c55e', marginTop: 4, boxSizing: 'border-box', fontSize: 16 }} /></div>
                <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Taille</label><input type="number" value={profile.taille} onChange={e => setProfile(p => ({ ...p, taille: Number(e.target.value) || 175 }))} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', marginTop: 4, boxSizing: 'border-box', fontSize: 16 }} /></div>
                <div><label style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Âge</label><input type="number" value={profile.age} onChange={e => setProfile(p => ({ ...p, age: Number(e.target.value) || 30 }))} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', marginTop: 4, boxSizing: 'border-box', fontSize: 16 }} /></div>
              </div>
            </div>
          </>
        )}
      </div>

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(15,23,42,0.98)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-around', padding: '8px 0 24px', zIndex: 9999 }}>
        {[{ id: 'today', icon: '🏠', label: "Aujourd'hui" }, { id: 'week', icon: '📅', label: 'Semaine' }, { id: 'plan', icon: '📖', label: 'Plan' }, { id: 'stats', icon: '⚙️', label: 'Profil' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}><div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tab === t.id ? '#8b5cf6' : 'transparent' }}><span style={{ fontSize: 18 }}>{t.icon}</span></div><span style={{ fontSize: 10, color: tab === t.id ? 'white' : 'rgba(255,255,255,0.4)' }}>{t.label}</span></button>
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
