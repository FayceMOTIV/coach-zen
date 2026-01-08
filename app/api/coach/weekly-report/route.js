import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request) {
  try {
    const { weekData, profile, weightHistory } = await request.json();

    // Calculate weekly stats
    const days = Object.keys(weekData || {}).length;
    const scores = Object.values(weekData || {}).map(d => {
      let s = 0;
      if (d.habits) {
        if (d.habits.breakfast) s += 20;
        if (d.habits.fasting) s += 20;
        if (d.habits.lunch) s += 20;
        if (d.habits.snack) s += 20;
        if (d.habits.dinner) s += 20;
        if (d.habits.plannedTreat) s += 20;
      }
      if (d.sleep >= 6.5) s += 10;
      if ((d.water || 0) >= 8) s += 10;
      if (d.movement) {
        if (d.movement.workout) s += 5;
        if (d.movement.walk) s += 5;
        if (d.movement.run) s += 5;
      }
      return Math.min(s, 100);
    });

    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const maxScore = scores.length ? Math.max(...scores) : 0;
    const minScore = scores.length ? Math.min(...scores) : 0;

    // Sleep average
    const sleepValues = Object.values(weekData || {}).map(d => d.sleep || 0).filter(s => s > 0);
    const avgSleep = sleepValues.length ? (sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length).toFixed(1) : 0;

    // Water average
    const waterValues = Object.values(weekData || {}).map(d => d.water || 0);
    const avgWater = waterValues.length ? (waterValues.reduce((a, b) => a + b, 0) / waterValues.length).toFixed(1) : 0;

    // Workout count
    const workoutDays = Object.values(weekData || {}).filter(d => d.movement?.workout || d.movement?.walk || d.movement?.run).length;

    // Weight change
    const sortedWeights = [...(weightHistory || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentWeights = sortedWeights.filter(w => new Date(w.date) >= weekAgo);
    const weightChange = recentWeights.length >= 2
      ? (recentWeights[recentWeights.length - 1].weight - recentWeights[0].weight).toFixed(1)
      : null;

    const prompt = `Tu es un coach nutrition bienveillant. Génère un rapport hebdomadaire encourageant basé sur ces données:

STATISTIQUES DE LA SEMAINE:
- Jours suivis: ${days}/7
- Score moyen: ${avgScore}/100 (min: ${minScore}, max: ${maxScore})
- Sommeil moyen: ${avgSleep}h
- Hydratation moyenne: ${avgWater} verres/jour
- Jours d'activité physique: ${workoutDays}/7
${weightChange ? `- Évolution poids: ${weightChange > 0 ? '+' : ''}${weightChange} kg` : ''}

PROFIL:
- Objectif: ${profile?.objectifPoids ? `Atteindre ${profile.objectifPoids}kg` : 'Maintenir la forme'}

Instructions:
1. Commence par un titre accrocheur avec emoji
2. Résume les VICTOIRES de la semaine (2-3 points)
3. Identifie UN axe d'amélioration principal
4. Donne UN conseil actionnable pour la semaine prochaine
5. Termine par une phrase de motivation

Format: Utilise des emojis, des sections claires, reste concis (max 200 mots)`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    const report = message.content[0]?.text || "Rapport non disponible";

    return Response.json({
      success: true,
      report,
      stats: {
        days,
        avgScore,
        maxScore,
        minScore,
        avgSleep,
        avgWater,
        workoutDays,
        weightChange
      }
    });
  } catch (error) {
    console.error("Weekly report error:", error);
    return Response.json(
      {
        success: false,
        report: "Impossible de générer le rapport. Réessaie plus tard !",
        stats: {}
      },
      { status: 200 }
    );
  }
}
