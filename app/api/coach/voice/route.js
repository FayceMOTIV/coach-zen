import OpenAI from "openai";

const openai = new OpenAI();

export async function POST(request) {
  try {
    const { message, allData, profile, weightHistory, history } = await request.json();

    const totalDays = Object.keys(allData || {}).length;
    const scores = Object.values(allData || {}).map(d => {
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
      if (d.water >= 8) s += 10;
      return Math.min(100, Math.max(0, s));
    });
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    
    const sortedWeight = [...(weightHistory || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    const weightStart = sortedWeight[0]?.weight || profile?.poids;
    const weightNow = sortedWeight[sortedWeight.length - 1]?.weight || profile?.poids;
    const weightLoss = weightStart - weightNow;
    const objectif = profile?.objectifPoids || 70;
    const remaining = weightNow - objectif;

    const systemPrompt = `Tu es Coach Zen, un coach nutrition et bien-être bienveillant et motivant. Tu parles en français de manière naturelle et encourageante.

PROFIL DE L'UTILISATEUR:
- Poids actuel: ${weightNow} kg
- Objectif: ${objectif} kg (reste ${remaining.toFixed(1)} kg à perdre)
- Perte depuis le début: ${weightLoss.toFixed(1)} kg
- Taille: ${profile?.taille || 175} cm
- Âge: ${profile?.age || 30} ans
- Activité: ${profile?.activite || 'modéré'}

STATISTIQUES:
- Jours suivis: ${totalDays}
- Score moyen: ${avgScore}/100
- Pesées enregistrées: ${weightHistory?.length || 0}

RÈGLES:
- Sois concis (2-3 phrases max)
- Utilise des emojis avec modération
- Sois encourageant même si les résultats sont mitigés
- Donne des conseils pratiques et personnalisés
- Tu connais tout l'historique de l'utilisateur`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 300
    });

    return Response.json({
      response: completion.choices[0].message.content
    });

  } catch (error) {
    console.error("Voice coach error:", error);
    return Response.json({ 
      response: "Désolé, j'ai eu un petit souci. Réessaie ! 🙏"
    });
  }
}
