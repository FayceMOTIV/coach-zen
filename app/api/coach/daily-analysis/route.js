import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request) {
  try {
    const { score, habits, sleep, nap, energy, water, ecarts, movement, customMeals } = await request.json();

    const habitsCompleted = habits ? Object.values(habits).filter(Boolean).length : 0;
    const movementDone = movement ? Object.values(movement).filter(Boolean).length : 0;
    const ecartsTotal = ecarts ? (ecarts.petit || 0) + (ecarts.moyen || 0) + (ecarts.gros || 0) : 0;

    const prompt = `Tu es un coach nutrition bienveillant. Analyse ces données de la journée et donne une réponse en 1-2 phrases maximum.

Données:
- Score du jour: ${score}/100
- Repas suivis: ${habitsCompleted}/6
- Sommeil: ${sleep}h (sieste: ${nap}min)
- Énergie: ${energy}/5
- Eau: ${water} verres
- Écarts: ${ecartsTotal}
- Activité physique: ${movementDone} activité(s)
- Repas libres: ${customMeals?.length || 0}

Instructions:
1. Identifie LE point fort de la journée
2. Identifie UN axe d'amélioration (si pertinent)
3. Termine par une phrase de motivation courte et bienveillante
4. Utilise des emojis
5. Maximum 2 phrases, sois concis

Exemple de format: "Super journée avec ${habitsCompleted} repas suivis ! 💪 Pense à boire un peu plus d'eau demain. Tu gères !"`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    });

    const analysis = message.content[0]?.text || "Continue comme ça ! 💪";

    return Response.json({ analysis });
  } catch (error) {
    console.error("Daily analysis error:", error);
    return Response.json(
      { analysis: "Continue tes efforts, tu es sur la bonne voie ! 💪" },
      { status: 200 }
    );
  }
}
