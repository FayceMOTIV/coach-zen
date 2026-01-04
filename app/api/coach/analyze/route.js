export async function POST(request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return Response.json({ analysis: "Configure ta clé OpenAI pour débloquer l'analyse IA." });
    
    const { allData, profile, period } = await request.json();
    
    const dates = Object.keys(allData).sort().slice(-30);
    const recentData = dates.map(date => ({ date, ...allData[date], score: calcScore(allData[date]) }));
    
    const getEcartsCount = (e) => (e?.petit || 0) + (e?.moyen || 0) + (e?.gros || 0);
    const getEcartsKcal = (e) => ((e?.petit || 0) * 300) + ((e?.moyen || 0) * 600) + ((e?.gros || 0) * 1000);
    
    const totalEcarts = { petit: 0, moyen: 0, gros: 0 };
    recentData.forEach(d => {
      totalEcarts.petit += d.ecarts?.petit || 0;
      totalEcarts.moyen += d.ecarts?.moyen || 0;
      totalEcarts.gros += d.ecarts?.gros || 0;
    });
    
    const stats = {
      totalDays: dates.length,
      avgScore: recentData.length > 0 ? Math.round(recentData.reduce((a, b) => a + b.score, 0) / recentData.length) : 0,
      habitsFrequency: {
        breakfast: recentData.filter(d => d.habits?.breakfast).length,
        lunch: recentData.filter(d => d.habits?.lunch).length,
        snack: recentData.filter(d => d.habits?.snack).length,
        dinner: recentData.filter(d => d.habits?.dinner).length,
        plannedTreat: recentData.filter(d => d.habits?.plannedTreat).length,
      },
      avgSleep: recentData.length > 0 ? (recentData.reduce((a, b) => a + (b.sleep || 0), 0) / recentData.length).toFixed(1) : 0,
      avgEnergy: recentData.length > 0 ? (recentData.reduce((a, b) => a + (b.energy || 3), 0) / recentData.length).toFixed(1) : 3,
      workoutDays: recentData.filter(d => d.movement?.workout).length,
      runDays: recentData.filter(d => d.movement?.run).length,
      walkDays: recentData.filter(d => d.movement?.walk).length,
      ecarts: totalEcarts,
      totalEcartsCount: totalEcarts.petit + totalEcarts.moyen + totalEcarts.gros,
      totalEcartsKcal: (totalEcarts.petit * 300) + (totalEcarts.moyen * 600) + (totalEcarts.gros * 1000),
      daysWithEcarts: recentData.filter(d => getEcartsCount(d.ecarts) > 0).length,
      trend: recentData.length >= 7 ? (recentData.slice(-7).reduce((a,b) => a + b.score, 0) / 7) - (recentData.slice(-14, -7).reduce((a,b) => a + b.score, 0) / Math.max(1, recentData.slice(-14, -7).length)) : 0
    };

    const systemPrompt = `Tu es Zen, un coach analytique bienveillant. Analyse les données pour donner un feedback personnalisé.

STYLE: Français, tutoiement, direct mais encourageant, emojis avec parcimonie, conseils concrets.

FORMAT (${period}):
1. **Résumé** (2-3 phrases)
2. **Points forts** 
3. **Points d'attention** (inclure les écarts si présents)
4. **Pattern détecté**
5. **Conseil personnalisé**

IMPORTANT sur les ÉCARTS:
- Petit écart (300 kcal) = snack, grignotage
- Moyen écart (600 kcal) = fast food, resto
- Gros écart (1000 kcal) = grosse bouffe
- Analyse les types d'écarts pour identifier les patterns
- Propose des alternatives concrètes selon le type

Max 250 mots.`;

    const userPrompt = `Analyse ${period === 'week' ? '7 jours' : '30 jours'}:

STATS: ${stats.totalDays} jours, score moyen ${stats.avgScore}/100, tendance ${stats.trend > 5 ? 'hausse' : stats.trend < -5 ? 'baisse' : 'stable'}

HABITUDES (sur ${stats.totalDays}j): Petit-déj ${stats.habitsFrequency.breakfast}x, Déjeuner ${stats.habitsFrequency.lunch}x, Collation ${stats.habitsFrequency.snack}x, Dîner ${stats.habitsFrequency.dinner}x, Craquage planifié ${stats.habitsFrequency.plannedTreat}x

ÉCARTS: ${stats.totalEcartsCount} écarts sur ${stats.daysWithEcarts} jours = ${stats.totalEcartsKcal} kcal
- Petits (snacks): ${stats.ecarts.petit}x
- Moyens (fast food): ${stats.ecarts.moyen}x  
- Gros (grosse bouffe): ${stats.ecarts.gros}x

ACTIVITÉ: Sommeil ${stats.avgSleep}h, Énergie ${stats.avgEnergy}/5, Muscu ${stats.workoutDays}x, Course ${stats.runDays}x, Marche ${stats.walkDays}x

PROFIL: ${profile.sexe}, ${profile.age} ans, ${profile.poids}kg`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], temperature: 0.7, max_tokens: 600 }),
    });
    
    if (!response.ok) return Response.json({ analysis: "Erreur lors de l'analyse." });
    const data = await response.json();
    return Response.json({ analysis: data.choices?.[0]?.message?.content?.trim() || "Analyse indisponible.", stats });
  } catch (error) {
    return Response.json({ analysis: "Erreur lors de l'analyse." });
  }
}

function calcScore(d) {
  let s = 0;
  if (d?.habits) Object.values(d.habits).forEach(c => { if (c) s += 20; });
  if (d?.sleep >= 6.5) s += 10;
  if (d?.nap >= 60) s += 5;
  if (d?.movement?.workout) s += 5;
  if (d?.movement?.walk) s += 5;
  if (d?.movement?.run) s += 5;
  const ecartsCount = (d?.ecarts?.petit || 0) + (d?.ecarts?.moyen || 0) + (d?.ecarts?.gros || 0);
  s -= ecartsCount * 10;
  return Math.max(0, Math.min(s, 100));
}
