import OpenAI from "openai";

const openai = new OpenAI();

export async function POST(request) {
  try {
    const { allData, profile, period, weightHistory, stats } = await request.json();
    
    const days = period === 'week' ? 7 : 30;
    const recentDates = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      recentDates.push(d.toISOString().split('T')[0]);
    }
    
    const recentData = {};
    recentDates.forEach(date => {
      if (allData && allData[date]) {
        recentData[date] = allData[date];
      }
    });

    // Calculer stats suppléments et gratitudes
    let supplementDays = 0;
    let gratitudeDays = 0;
    let totalWater = 0;
    let waterDays = 0;
    
    Object.values(recentData).forEach(day => {
      const supCount = day.supplements ? Object.values(day.supplements).filter(Boolean).length : 0;
      if (supCount >= 3) supplementDays++;
      
      const gratCount = (day.gratitudes || []).filter(g => g && g.trim()).length;
      if (gratCount >= 3) gratitudeDays++;
      
      if (day.water) {
        totalWater += day.water;
        waterDays++;
      }
    });

    const avgWater = waterDays > 0 ? (totalWater / waterDays).toFixed(1) : 0;

    const prompt = `Tu es Coach Zen, un coach nutrition bienveillant. Analyse les ${days} derniers jours.

PROFIL:
- Poids: ${profile?.poids || 75}kg → Objectif: ${profile?.objectifPoids || 70}kg
- Taille: ${profile?.taille || 175}cm, Âge: ${profile?.age || 30}ans
- Activité: ${profile?.activite || 'modéré'}

STATS GLOBALES:
- Jours suivis total: ${stats?.totalDays || 0}
- Streak actuel: ${stats?.streak || 0} jours
- Perte de poids totale: ${stats?.weightLoss?.toFixed(1) || 0}kg

DONNÉES ${days}J:
${JSON.stringify(recentData, null, 2)}

NOUVELLES HABITUDES:
- Jours avec 3+ compléments: ${supplementDays}/${Object.keys(recentData).length}
- Jours avec gratitudes complètes: ${gratitudeDays}/${Object.keys(recentData).length}
- Moyenne hydratation: ${avgWater} verres/jour

HISTORIQUE POIDS (dernières pesées):
${JSON.stringify(weightHistory?.slice(-10) || [])}

Fais une analyse complète et personnalisée en français:
1. 📊 Résumé global (score moyen, tendance)
2. 💪 Points forts (ce qui va bien)
3. ⚠️ Axes d'amélioration
4. 💊 Analyse des compléments et gratitudes
5. 💧 Analyse hydratation
6. 📈 Évolution du poids
7. 🎯 3 conseils personnalisés pour la semaine

Sois encourageant mais honnête. Max 400 mots.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800
    });

    return Response.json({
      analysis: completion.choices[0].message.content
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return Response.json({ 
      analysis: "Erreur lors de l'analyse. Réessaie plus tard." 
    });
  }
}
