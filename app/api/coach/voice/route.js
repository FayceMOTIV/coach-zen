import OpenAI from "openai";

const openai = new OpenAI();

export async function POST(request) {
  try {
    const { message, allData, profile, weightHistory, stats, todayData, history } = await request.json();

    const sortedWeight = [...(weightHistory || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    const weightStart = sortedWeight[0]?.weight || profile?.poids;
    const weightNow = sortedWeight[sortedWeight.length - 1]?.weight || profile?.poids;
    const weightLoss = weightStart - weightNow;
    const objectif = profile?.objectifPoids || 70;
    const remaining = weightNow - objectif;

    // Analyser aujourd'hui
    const todaySupplements = todayData?.supplements ? Object.entries(todayData.supplements).filter(([k, v]) => v).map(([k]) => k).join(', ') : 'aucun';
    const todayGratitudes = (todayData?.gratitudes || []).filter(g => g?.trim());
    const todayWater = todayData?.water || 0;
    const todayMeals = todayData?.habits ? Object.entries(todayData.habits).filter(([k, v]) => v).map(([k]) => k).join(', ') : 'aucun';

    const systemPrompt = `Tu es Coach Zen, un coach nutrition et bien-être bienveillant et motivant. Tu parles en français de manière naturelle.

PROFIL:
- Poids actuel: ${weightNow}kg → Objectif: ${objectif}kg (reste ${remaining.toFixed(1)}kg)
- Perte depuis le début: ${weightLoss.toFixed(1)}kg
- Taille: ${profile?.taille || 175}cm, Âge: ${profile?.age || 30}ans
- Activité: ${profile?.activite || 'modéré'}

STATISTIQUES GLOBALES:
- Jours suivis: ${stats?.totalDays || 0}
- Streak: ${stats?.streak || 0} jours
- Streak hydratation: ${stats?.hydrationStreak || 0} jours
- Streak compléments: ${stats?.supplementStreak || 0} jours
- Streak gratitudes: ${stats?.gratitudeStreak || 0} jours

AUJOURD'HUI:
- Repas validés: ${todayMeals || 'aucun'}
- Eau: ${todayWater}/8 verres
- Compléments pris: ${todaySupplements}
- Gratitudes: ${todayGratitudes.length > 0 ? todayGratitudes.join(' | ') : 'non remplies'}
- Énergie: ${todayData?.energy || 3}/5

RÈGLES:
- Sois concis (2-4 phrases)
- Utilise des emojis avec modération
- Sois encourageant mais honnête
- Donne des conseils pratiques et personnalisés
- Tu as accès à TOUT l'historique de l'utilisateur
- Intègre les gratitudes, compléments, hydratation dans tes analyses`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 400
    });

    return Response.json({
      response: completion.choices[0].message.content
    });

  } catch (error) {
    console.error("Voice coach error:", error);
    return Response.json({ 
      response: "Désolé, j'ai eu un souci. Réessaie ! 🙏"
    });
  }
}
