import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Area, AreaChart } from 'recharts';

// ============================================
// COACH ZEN V4 FINAL - VIBRANT COLORS
// "Prévu = contrôlé = pas de culpabilité"
// ============================================

// ============================================
// COACH ENGINE
// ============================================

const COACH_ENGINE = {
  limits: {
    survival: { maxPerDay: 1, slots: ['morning'] },
    recovery: { maxPerDay: 3, slots: ['morning', 'lateAfternoon', 'treatTime'] },
    normal: { maxPerDay: 5, slots: ['morning', 'preNap', 'postNap', 'lateAfternoon', 'treatTime', 'evening'] },
  },
  
  slots: {
    morning: { start: 6, end: 10 },
    preNap: { start: 13, end: 15 },
    postNap: { start: 15, end: 17 },
    lateAfternoon: { start: 17, end: 20 },
    treatTime: { start: 21, end: 22 },
    evening: { start: 22, end: 23 },
  },
  
  messages: {
    morning: {
      support: [
        "Journée difficile en vue. Les oeufs stabilisent.",
        "L'énergie est basse. Le petit-déj reste prioritaire.",
      ],
      standard: [
        "Les oeufs posent les bases. Le reste suivra.",
        "Matin solide, journée stable.",
        "Le plan commence maintenant.",
      ],
      push: [
        "Énergie correcte. Commence fort.",
      ],
      streak: [
        "Jour {streak}. Tu construis.",
        "{streak} jours. La régularité paie.",
      ],
    },
    preNap: {
      standard: [
        "Collation maintenant. Pas de crash à 16h.",
        "Le crash se prévient ici.",
      ],
      pattern: [
        "Tu sautes souvent cette étape. Pas aujourd'hui.",
      ],
    },
    postNap: {
      standard: [
        "L'après-midi commence. Tiens jusqu'au dîner.",
        "Le sucre va appeler. Tu le sais.",
      ],
      prevention: [
        "Post-sieste, moment à risque.",
      ],
    },
    lateAfternoon: {
      standard: [
        "Zone sensible. Le dîner arrive.",
        "C'est maintenant que ça se joue.",
      ],
      prevention: [
        "L'envie de craquer arrive là. Attends.",
      ],
      support: [
        "Fatigué, mais le dîner est proche.",
      ],
    },
    treatTime: {
      validation: [
        "Craquage autorisé. Profite.",
        "Prévu = contrôlé. Aucune culpabilité.",
        "Tu l'as gagné. Savoure.",
      ],
      conditional: [
        "Dîner d'abord. Ensuite, le craquage.",
      ],
    },
    evening: {
      standard: [
        "Journée terminée. Score : {score}.",
      ],
      support: [
        "Tu as tenu malgré la fatigue.",
      ],
      validation: [
        "Le système fonctionne.",
      ],
    },
    survival: {
      single: [
        "Mode survie. Objectif : ne pas abandonner.",
        "Énergie critique. Fais le minimum.",
      ],
    },
  },
  
  getMode(energy) {
    if (energy <= 1) return 'survival';
    if (energy <= 2) return 'recovery';
    return 'normal';
  },
  
  getCurrentSlot() {
    const hour = new Date().getHours();
    for (const [name, { start, end }] of Object.entries(this.slots)) {
      if (hour >= start && hour < end) return name;
    }
    return null;
  },
  
  canSendMessage(energy, messagesCount, slotsSent, currentSlot) {
    const mode = this.getMode(energy);
    const limits = this.limits[mode];
    if (messagesCount >= limits.maxPerDay) return false;
    if (currentSlot && slotsSent.has(currentSlot)) return false;
    if (currentSlot && !limits.slots.includes(currentSlot)) return false;
    return true;
  },
  
  selectMessage(slot, energy, streak, patterns, dayState) {
    const mode = this.getMode(energy);
    
    if (mode === 'survival') {
      const pool = this.messages.survival.single;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    
    const slotMessages = this.messages[slot];
    if (!slotMessages) return null;
    
    let pool = [];
    
    if (energy <= 2 && slotMessages.support) {
      pool = slotMessages.support;
    } else if (energy >= 4 && slotMessages.push) {
      pool = slotMessages.push;
    } else if (patterns?.snackMiss >= 3 && slot === 'preNap' && slotMessages.pattern) {
      pool = slotMessages.pattern;
    } else if (slot === 'treatTime' && !dayState.habits.dinner && slotMessages.conditional) {
      pool = slotMessages.conditional;
    } else if (slot === 'treatTime' && slotMessages.validation) {
      pool = slotMessages.validation;
    } else if (slot === 'evening' && dayState.score >= 80 && slotMessages.validation) {
      pool = slotMessages.validation;
    } else if (slotMessages.prevention && (slot === 'postNap' || slot === 'lateAfternoon')) {
      pool = Math.random() > 0.5 ? slotMessages.prevention : slotMessages.standard;
    } else if (slotMessages.standard) {
      pool = slotMessages.standard;
    }
    
    if (slot === 'morning' && streak >= 3 && slotMessages.streak) {
      pool = [...pool, ...slotMessages.streak];
    }
    
    if (pool.length === 0) return null;
    
    let msg = pool[Math.floor(Math.random() * pool.length)];
    msg = msg.replace('{streak}', streak);
    msg = msg.replace('{score}', dayState.score);
    
    return msg;
  },
};

// ============================================
// UTILITIES
// ============================================

const formatDate = (d) => d.toISOString().split('T')[0];
const getDayName = (d) => ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()];
const getMonthName = (d) => ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][d.getMonth()];
const loadData = (k, def) => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : def; } catch { return def; }};
const saveData = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const getDefaultDay = () => ({ habits: { breakfast: false, lunch: false, snack: false, dinner: false, plannedTreat: false }, sleep: 7, nap: 0, energy: 3, movement: { workout: false, walk: false }});

// Scoring: chaque habitude = +20, donc craquage coché = +20 aussi!
const calcScore = (d) => { 
  let s = 0; 
  if(d?.habits) Object.values(d.habits).forEach(c => { if(c) s += 20; }); 
  if(d?.sleep >= 6.5) s += 10; 
  if(d?.nap >= 60) s += 5; 
  if(d?.movement?.workout) s += 5; 
  if(d?.movement?.walk) s += 5; 
  return Math.min(s, 100); 
};

// ============================================
// MEAL PLAN - VIBRANT COLORS
// ============================================

const MEALS = {
  breakfast: { 
    title: 'Petit-déjeuner', 
    time: 'Matin', 
    items: ['6 oeufs', 'Café OK', 'Eau + sel'], 
    emoji: '🍳',
    gradient: 'from-orange-400 via-amber-500 to-yellow-500',
    bgGlow: 'bg-orange-500/20',
    points: 20,
  },
  lunch: { 
    title: 'Déjeuner', 
    time: 'Midi', 
    items: ['250g riz', '300g protéine', 'Légumes'], 
    emoji: '🥗',
    gradient: 'from-emerald-400 via-green-500 to-teal-500',
    bgGlow: 'bg-emerald-500/20',
    points: 20,
  },
  snack: { 
    title: 'Collation', 
    time: 'Pré-sieste', 
    items: ['Yaourt grec', 'ou oeuf + amandes'], 
    emoji: '🥜',
    gradient: 'from-violet-400 via-purple-500 to-fuchsia-500',
    bgGlow: 'bg-violet-500/20',
    points: 20,
    isEssential: true,
  },
  dinner: { 
    title: 'Dîner', 
    time: '< 20h30', 
    items: ['250g riz', '300g protéine', 'Légumes'], 
    emoji: '🍲',
    gradient: 'from-blue-400 via-indigo-500 to-violet-500',
    bgGlow: 'bg-blue-500/20',
    points: 20,
    isEssential: true,
  },
  plannedTreat: { 
    title: 'Craquage planifié', 
    time: '21h-22h', 
    items: ['Autorisé', 'Prévu = +20 pts!'], 
    emoji: '🍫',
    gradient: 'from-pink-400 via-rose-500 to-red-500',
    bgGlow: 'bg-pink-500/20',
    points: 20,
    isEssential: true,
  },
};

// ============================================
// COACH BUBBLE - COLORFUL
// ============================================

const CoachBubble = ({ message, onDismiss }) => {
  if (!message) return null;
  
  return (
    <div className="animate-slideIn">
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 p-[2px] rounded-2xl">
        <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
              <span className="text-white text-sm font-bold">Z</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[15px] leading-relaxed">{message}</p>
            </div>
            <button onClick={onDismiss} className="text-white/40 hover:text-white/80 p-1 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// CIRCULAR PROGRESS - RAINBOW
// ============================================

const CircularProgress = ({ progress, size = 140 }) => {
  const sw = 12, r = (size - sw) / 2, c = r * 2 * Math.PI, o = c - (progress / 100) * c;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="25%" stopColor="#c084fc" />
            <stop offset="50%" stopColor="#60a5fa" />
            <stop offset="75%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <circle className="text-white/5" strokeWidth={sw} stroke="currentColor" fill="transparent" r={r} cx={size/2} cy={size/2} />
        <circle 
          stroke="url(#progressGradient)" 
          className="transition-all duration-1000 ease-out" 
          strokeWidth={sw} 
          strokeDasharray={c} 
          strokeDashoffset={o} 
          strokeLinecap="round" 
          fill="transparent" 
          r={r} 
          cx={size/2} 
          cy={size/2}
          style={{ filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.5))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
          {Math.round(progress)}
        </span>
        <span className="text-sm text-white/40 font-medium">/100</span>
      </div>
    </div>
  );
};

// ============================================
// HABIT CARD - SUPER COLORFUL
// ============================================

const HabitCard = ({ meal, id, checked, onChange, compact }) => (
  <button 
    onClick={() => onChange(!checked)} 
    className={`w-full rounded-3xl transition-all duration-300 ${checked ? 'scale-[0.98]' : 'active:scale-[0.96]'}`}
  >
    <div className={`bg-gradient-to-r ${meal.gradient} p-[3px] rounded-3xl shadow-lg ${checked ? 'shadow-xl' : ''}`}
         style={{ boxShadow: checked ? `0 10px 40px -10px ${meal.gradient.includes('orange') ? '#f97316' : meal.gradient.includes('emerald') ? '#10b981' : meal.gradient.includes('violet') ? '#8b5cf6' : meal.gradient.includes('blue') ? '#3b82f6' : '#ec4899'}60` : '' }}>
      <div className={`rounded-3xl p-4 transition-all duration-300 ${checked ? 'bg-white/10 backdrop-blur-sm' : 'bg-slate-900/95'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${checked ? 'bg-white/30 scale-110' : 'bg-white/10'}`}>
            {checked ? (
              <svg className="w-7 h-7 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <span className="text-3xl">{meal.emoji}</span>
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-white text-lg">{meal.title}</p>
            <p className="text-white/60 text-sm">{meal.time}</p>
          </div>
          <div className={`px-3 py-1.5 rounded-full transition-all ${checked ? 'bg-white/30' : 'bg-white/10'}`}>
            <span className={`text-sm font-bold ${checked ? 'text-white' : 'text-white/70'}`}>
              {checked ? '✓' : `+${meal.points}`}
            </span>
          </div>
        </div>
        {!compact && !checked && (
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-2">
            {meal.items.map((item, i) => (
              <span key={i} className="text-xs bg-white/15 text-white px-3 py-1.5 rounded-full backdrop-blur-sm">
                {item}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  </button>
);

// ============================================
// ENERGY SELECTOR - RAINBOW
// ============================================

const EnergySelector = ({ value, onChange }) => {
  const levels = [
    { v: 1, e: '😴', l: 'KO', gradient: 'from-red-500 to-orange-500', glow: 'shadow-red-500/50' },
    { v: 2, e: '😔', l: 'Dur', gradient: 'from-orange-500 to-amber-500', glow: 'shadow-orange-500/50' },
    { v: 3, e: '😐', l: 'OK', gradient: 'from-yellow-500 to-lime-500', glow: 'shadow-yellow-500/50' },
    { v: 4, e: '🙂', l: 'Bien', gradient: 'from-lime-500 to-emerald-500', glow: 'shadow-lime-500/50' },
    { v: 5, e: '💪', l: 'Top', gradient: 'from-emerald-500 to-cyan-500', glow: 'shadow-emerald-500/50' },
  ];
  return (
    <div className="grid grid-cols-5 gap-2">
      {levels.map(l => (
        <button 
          key={l.v} 
          onClick={() => onChange(l.v)} 
          className={`py-4 rounded-2xl flex flex-col items-center gap-1.5 transition-all duration-300 ${
            value === l.v 
              ? `bg-gradient-to-br ${l.gradient} scale-110 shadow-lg ${l.glow}` 
              : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          <span className={`text-2xl transition-transform ${value === l.v ? 'scale-125' : ''}`}>{l.e}</span>
          <span className={`text-[10px] font-bold ${value === l.v ? 'text-white' : 'text-white/40'}`}>{l.l}</span>
        </button>
      ))}
    </div>
  );
};

// ============================================
// SLIDER - COLORFUL
// ============================================

const Slider = ({ value, onChange, min, max, step, label, unit, gradient, icon }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-sm text-white/60">{label}</span>
        </div>
        <span className="text-lg font-bold text-white">{value}{unit}</span>
      </div>
      <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-300`} 
          style={{ width: `${pct}%` }} 
        />
        <input 
          type="range" min={min} max={max} step={step} value={value} 
          onChange={e => onChange(Number(e.target.value))} 
          className="absolute inset-0 w-full opacity-0 cursor-pointer" 
        />
      </div>
    </div>
  );
};

// ============================================
// MODE BANNERS - COLORFUL
// ============================================

const SurvivalBanner = () => (
  <div className="relative overflow-hidden bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 p-[2px] rounded-2xl">
    <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center">
          <span className="text-2xl">🆘</span>
        </div>
        <div>
          <p className="text-white font-bold">Mode survie actif</p>
          <p className="text-white/60 text-sm">Objectif : ne pas abandonner.</p>
        </div>
      </div>
    </div>
  </div>
);

const RecoveryBanner = () => (
  <div className="relative overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[2px] rounded-2xl">
    <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
          <span className="text-2xl">🌙</span>
        </div>
        <div>
          <p className="text-white font-bold">Mode récupération</p>
          <p className="text-white/60 text-sm">Focus sur les 3 essentiels.</p>
        </div>
      </div>
    </div>
  </div>
);

// ============================================
// SCORING CARD
// ============================================

const ScoringInfo = () => (
  <div className="bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20">
    <p className="text-white/60 text-xs font-medium mb-2">SCORING</p>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <span className="text-white/70">Chaque habitude</span>
      <span className="text-emerald-400 font-bold text-right">+20 pts</span>
      <span className="text-white/70">Craquage coché</span>
      <span className="text-pink-400 font-bold text-right">+20 pts ✓</span>
      <span className="text-white/70">Sommeil ≥6h30</span>
      <span className="text-indigo-400 font-bold text-right">+10 pts</span>
      <span className="text-white/70">Sieste ≥60min</span>
      <span className="text-amber-400 font-bold text-right">+5 pts</span>
    </div>
  </div>
);

// ============================================
// TODAY SCREEN
// ============================================

const TodayScreen = ({ dayData, setDayData, allData }) => {
  const score = calcScore(dayData);
  const mode = COACH_ENGINE.getMode(dayData.energy);
  const [coachMessage, setCoachMessage] = useState(null);
  const [messagesCount, setMessagesCount] = useState(0);
  const [slotsSent, setSlotsSent] = useState(new Set());
  const messageGenerated = useRef(false);
  
  const { streak, patterns } = useMemo(() => {
    let s = 0;
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const data = allData[formatDate(d)];
      if (data && calcScore(data) >= 50) s++;
      else break;
    }
    let snackMiss = 0;
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const data = allData[formatDate(d)];
      if (data && !data.habits?.snack) snackMiss++;
    }
    return { streak: s, patterns: { snackMiss } };
  }, [allData]);
  
  useEffect(() => {
    if (messageGenerated.current) return;
    const slot = COACH_ENGINE.getCurrentSlot();
    if (!slot) return;
    if (!COACH_ENGINE.canSendMessage(dayData.energy, messagesCount, slotsSent, slot)) return;
    const msg = COACH_ENGINE.selectMessage(slot, dayData.energy, streak, patterns, dayData);
    if (msg) {
      setCoachMessage(msg);
      setMessagesCount(c => c + 1);
      setSlotsSent(s => new Set([...s, slot]));
      messageGenerated.current = true;
    }
  }, [dayData.energy]);
  
  const updateHabit = (k, v) => setDayData(p => ({ ...p, habits: { ...p.habits, [k]: v } }));
  const updateMovement = (k, v) => setDayData(p => ({ ...p, movement: { ...p.movement, [k]: v } }));
  
  const mealsToShow = mode !== 'normal' ? ['snack', 'dinner', 'plannedTreat'] : Object.keys(MEALS);
  
  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="text-center pt-2">
        <p className="text-white/40 text-sm font-medium">{getDayName(new Date())}</p>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
          {new Date().getDate()} {getMonthName(new Date())}
        </h1>
      </div>
      
      {/* Coach Message */}
      {coachMessage && <CoachBubble message={coachMessage} onDismiss={() => setCoachMessage(null)} />}
      
      {/* Mode Banners */}
      {mode === 'survival' && <SurvivalBanner />}
      {mode === 'recovery' && <RecoveryBanner />}
      
      {/* Score Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Score du jour</h2>
            <p className="text-white/50 text-sm mt-1">
              {score >= 80 ? '🔥 On fire!' : score >= 60 ? '💪 Solide' : score >= 40 ? '👍 En route' : '🌱 Ça pousse'}
            </p>
            {score >= 80 && (
              <div className="mt-3 inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-1.5 rounded-full">
                <span className="text-white text-xs font-bold">OBJECTIF ATTEINT</span>
              </div>
            )}
          </div>
          <CircularProgress progress={score} />
        </div>
      </div>
      
      {/* Scoring Info */}
      <ScoringInfo />
      
      {/* Habits */}
      <div className="space-y-3">
        <p className="text-white/40 text-xs font-bold uppercase tracking-wider px-1">
          {mode !== 'normal' ? '🎯 Essentiels' : '🍽️ Plan alimentaire'}
        </p>
        {mealsToShow.map(k => (
          <HabitCard 
            key={k} 
            meal={MEALS[k]} 
            id={k} 
            checked={dayData.habits[k]} 
            onChange={v => updateHabit(k, v)} 
            compact={mode !== 'normal'} 
          />
        ))}
      </div>
      
      {/* Energy */}
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-5 border border-white/10">
        <p className="text-white/60 text-sm font-medium mb-4 flex items-center gap-2">
          <span className="text-xl">⚡</span> Énergie
        </p>
        <EnergySelector value={dayData.energy} onChange={v => setDayData(p => ({ ...p, energy: v }))} />
      </div>
      
      {/* Sleep & Movement - Normal mode only */}
      {mode === 'normal' && (
        <>
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-5 border border-white/10 space-y-5">
            <Slider 
              value={dayData.sleep} 
              onChange={v => setDayData(p => ({ ...p, sleep: v }))} 
              min={0} max={9} step={0.5} 
              label="Sommeil" unit="h" 
              gradient="from-indigo-500 via-purple-500 to-pink-500"
              icon="🌙"
            />
            <Slider 
              value={dayData.nap} 
              onChange={v => setDayData(p => ({ ...p, nap: v }))} 
              min={0} max={120} step={15} 
              label="Sieste" unit="min" 
              gradient="from-amber-500 via-orange-500 to-red-500"
              icon="☀️"
            />
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => updateMovement('workout', !dayData.movement?.workout)} 
              className={`flex-1 p-4 rounded-2xl transition-all duration-300 ${
                dayData.movement?.workout 
                  ? 'bg-gradient-to-r from-rose-500 to-pink-600 shadow-lg shadow-pink-500/30' 
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">🏋️</span>
                <span className={`font-medium ${dayData.movement?.workout ? 'text-white' : 'text-white/50'}`}>Muscu</span>
                {dayData.movement?.workout && <span className="text-white/70 text-sm">+5</span>}
              </div>
            </button>
            <button 
              onClick={() => updateMovement('walk', !dayData.movement?.walk)} 
              className={`flex-1 p-4 rounded-2xl transition-all duration-300 ${
                dayData.movement?.walk 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30' 
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">🚶</span>
                <span className={`font-medium ${dayData.movement?.walk ? 'text-white' : 'text-white/50'}`}>Marche</span>
                {dayData.movement?.walk && <span className="text-white/70 text-sm">+5</span>}
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================
// WEEK SCREEN
// ============================================

const WeekScreen = ({ allData }) => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() + 1);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  
  const streak = useMemo(() => {
    let s = 0;
    for (let i = 1; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (allData[formatDate(d)] && calcScore(allData[formatDate(d)]) >= 50) s++;
      else break;
    }
    return s;
  }, [allData]);
  
  const avg = useMemo(() => {
    const scores = days.map(d => allData[formatDate(d)]).filter(Boolean).map(calcScore);
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }, [allData, days]);
  
  return (
    <div className="space-y-5 pb-8">
      <h1 className="text-3xl font-bold text-center pt-2 bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
        Semaine
      </h1>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl p-5 text-center shadow-lg shadow-purple-500/30">
          <p className="text-5xl font-bold text-white">{streak}</p>
          <p className="text-purple-200 text-sm mt-1">🔥 jours</p>
        </div>
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl p-5 text-center shadow-lg shadow-cyan-500/30">
          <p className="text-5xl font-bold text-white">{avg}</p>
          <p className="text-cyan-200 text-sm mt-1">moyenne</p>
        </div>
      </div>
      
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-4 border border-white/10">
        <div className="grid grid-cols-7 gap-2">
          {days.map(d => {
            const key = formatDate(d);
            const data = allData[key];
            const score = data ? calcScore(data) : 0;
            const isToday = key === formatDate(today);
            return (
              <div key={key} className={`text-center p-2 rounded-2xl transition-all ${isToday ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg' : ''}`}>
                <p className="text-[10px] text-white/40 font-medium">{getDayName(d)}</p>
                <p className={`text-sm font-bold my-1.5 ${isToday ? 'text-white' : 'text-white/70'}`}>{d.getDate()}</p>
                <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                  !data ? 'bg-white/5 text-white/30' :
                  score >= 80 ? 'bg-gradient-to-br from-emerald-400 to-cyan-500 text-white shadow-md shadow-emerald-500/30' :
                  score >= 50 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/30' :
                  'bg-white/10 text-white/50'
                }`}>{data ? score : '–'}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================
// STATS SCREEN
// ============================================

const StatsScreen = ({ allData, weightData, setWeightData }) => {
  const [showInput, setShowInput] = useState(false);
  const [weight, setWeight] = useState('');
  
  const last30 = useMemo(() => {
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const day = allData[formatDate(d)];
      if (day) data.push({ date: d.getDate(), score: calcScore(day) });
    }
    return data;
  }, [allData]);
  
  const weightChart = useMemo(() => 
    Object.entries(weightData).sort(([a], [b]) => new Date(a) - new Date(b)).slice(-10).map(([d, w]) => ({ date: new Date(d).getDate(), weight: w }))
  , [weightData]);
  
  const addWeight = () => {
    if (weight) {
      setWeightData(p => ({ ...p, [formatDate(new Date())]: parseFloat(weight) }));
      setWeight('');
      setShowInput(false);
    }
  };
  
  return (
    <div className="space-y-5 pb-8">
      <h1 className="text-3xl font-bold text-center pt-2 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
        Statistiques
      </h1>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-5 text-center shadow-lg shadow-emerald-500/30">
          <p className="text-4xl font-bold text-white">{Object.keys(allData).length}</p>
          <p className="text-emerald-200 text-sm mt-1">jours trackés</p>
        </div>
        <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-3xl p-5 text-center shadow-lg shadow-pink-500/30">
          <p className="text-4xl font-bold text-white">
            {last30.length > 0 ? Math.round(last30.reduce((a, b) => a + b.score, 0) / last30.length) : 0}
          </p>
          <p className="text-pink-200 text-sm mt-1">score moyen</p>
        </div>
      </div>
      
      {last30.length > 2 && (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-5 border border-white/10">
          <p className="text-white/60 text-sm font-medium mb-4">📈 Évolution (30 jours)</p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last30}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} width={25} />
                <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-5 border border-white/10">
        <div className="flex justify-between items-center mb-4">
          <p className="text-white/60 text-sm font-medium">⚖️ Poids</p>
          <button 
            onClick={() => setShowInput(!showInput)} 
            className="text-xs font-bold text-violet-400 bg-violet-500/20 px-4 py-2 rounded-full hover:bg-violet-500/30 transition-colors"
          >
            + Ajouter
          </button>
        </div>
        {showInput && (
          <div className="flex gap-2 mb-4">
            <input 
              type="number" step="0.1" value={weight} 
              onChange={e => setWeight(e.target.value)} 
              placeholder="75.5" 
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500" 
            />
            <button 
              onClick={addWeight} 
              className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-bold"
            >
              OK
            </button>
          </div>
        )}
        {weightChart.length > 1 ? (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightChart}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} width={30} />
                <Line type="monotone" dataKey="weight" stroke="#f472b6" strokeWidth={3} dot={{ fill: '#f472b6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-white/30 text-center py-8 text-sm">Ajoute ton poids chaque lundi</p>
        )}
      </div>
    </div>
  );
};

// ============================================
// PLAN SCREEN
// ============================================

const PlanScreen = () => (
  <div className="space-y-5 pb-8">
    <h1 className="text-3xl font-bold text-center pt-2 bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
      Mon Plan
    </h1>
    
    <div className="bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20">
      <p className="text-white/70 text-sm">
        <span className="text-lg mr-2">🧠</span>
        Plan <strong className="text-white">simple et fixe</strong>. Pas de décisions à prendre.
      </p>
    </div>
    
    <ScoringInfo />
    
    {Object.entries(MEALS).map(([k, m]) => (
      <div key={k} className={`bg-gradient-to-r ${m.gradient} rounded-3xl p-5 shadow-lg`}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            <span className="text-3xl">{m.emoji}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-bold text-white text-lg">{m.title}</p>
              <span className="text-sm text-white/70 bg-white/20 px-3 py-1 rounded-full">{m.time}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {m.items.map((i, idx) => (
                <span key={idx} className="text-xs bg-white/20 text-white px-3 py-1.5 rounded-full">{i}</span>
              ))}
            </div>
            <p className="text-white font-bold mt-3">+{m.points} points</p>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ============================================
// NAVIGATION - COLORFUL
// ============================================

const Nav = ({ tab, setTab }) => {
  const tabs = [
    { id: 'today', icon: '🏠', label: "Aujourd'hui", color: 'from-violet-500 to-purple-500' },
    { id: 'week', icon: '📅', label: 'Semaine', color: 'from-cyan-500 to-blue-500' },
    { id: 'plan', icon: '📖', label: 'Plan', color: 'from-amber-500 to-orange-500' },
    { id: 'stats', icon: '📊', label: 'Stats', color: 'from-emerald-500 to-teal-500' },
  ];
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-white/10">
      <div className="flex justify-around h-20 max-w-md mx-auto pb-safe">
        {tabs.map(t => (
          <button 
            key={t.id} 
            onClick={() => setTab(t.id)} 
            className="flex flex-col items-center justify-center px-4 transition-all"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              tab === t.id 
                ? `bg-gradient-to-br ${t.color} shadow-lg scale-110` 
                : 'bg-transparent'
            }`}>
              <span className={`text-lg ${tab === t.id ? '' : 'opacity-50'}`}>{t.icon}</span>
            </div>
            <span className={`text-[10px] mt-1 font-medium ${tab === t.id ? 'text-white' : 'text-white/40'}`}>
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ============================================
// MAIN APP
// ============================================

export default function CoachZen() {
  const today = formatDate(new Date());
  const [allData, setAllData] = useState(() => loadData('cz_data', {}));
  const [weightData, setWeightData] = useState(() => loadData('cz_weight', {}));
  const [tab, setTab] = useState('today');
  const [dayData, setDayData] = useState(() => allData[today] || getDefaultDay());
  
  useEffect(() => {
    const newAll = { ...allData, [today]: dayData };
    setAllData(newAll);
    saveData('cz_data', newAll);
  }, [dayData]);
  
  useEffect(() => { saveData('cz_weight', weightData); }, [weightData]);
  
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-violet-600/20 via-purple-600/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-tl from-pink-600/20 via-rose-600/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-gradient-to-r from-cyan-600/15 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      <div className="relative z-10 max-w-md mx-auto px-4 pb-24 pt-12">
        {/* Header */}
        <header className="flex justify-center items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <span className="text-xl">🌿</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-violet-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
            Coach Zen
          </span>
        </header>
        
        {tab === 'today' && <TodayScreen dayData={dayData} setDayData={setDayData} allData={allData} />}
        {tab === 'week' && <WeekScreen allData={allData} />}
        {tab === 'plan' && <PlanScreen />}
        {tab === 'stats' && <StatsScreen allData={allData} weightData={weightData} setWeightData={setWeightData} />}
      </div>
      
      <Nav tab={tab} setTab={setTab} />
      
      <style>{`
        :root { --sab: env(safe-area-inset-bottom, 0px); }
        .pb-safe { padding-bottom: max(var(--sab), 20px); }
        * { -webkit-tap-highlight-color: transparent; user-select: none; }
        input { user-select: text; }
        body { background: #0f172a; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideIn { animation: slideIn 0.4s ease-out; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 24px; height: 24px; background: white; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
      `}</style>
    </div>
  );
}
