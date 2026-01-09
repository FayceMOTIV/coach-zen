import OpenAI from "openai";

const client = new OpenAI();

export async function POST(request) {
  try {
    const { score, habits, sleep, nap, energy, water, ecarts, movement, customMeals, fasting, fastingMorning } = await request.json();

    // Build detailed habits list
    const habitNames = {
      breakfast: 'Petit-déj',
      lunch: 'Déjeuner',
      snack: 'Collation',
      dinner: 'Dîner',
      plannedTreat: 'Craquage planifié'
    };

    const habitsList = Object.entries(habits || {}).map(([key, done]) => ({
      name: habitNames[key] || key,
      done
    }));

    let doneHabits = habitsList.filter(h => h.done).map(h => h.name);
    let missedHabits = habitsList.filter(h => !h.done).map(h => h.name);

    // Si jeûne du matin, remplacer petit-déj par "Jeûne matin"
    if (fastingMorning) {
      doneHabits = doneHabits.filter(h => h !== 'Petit-déj');
      doneHabits.unshift('Jeûne matin');
      missedHabits = missedHabits.filter(h => h !== 'Petit-déj');
    }

    // Build movement list (matching UI keys: workout, run, walk)
    const movementNames = {
      workout: 'Musculation',
      run: 'Course',
      walk: 'Marche'
    };
    const movementList = Object.entries(movement || {})
      .filter(([_, done]) => done)
      .map(([key]) => movementNames[key] || key);

    // Custom meals summary
    const customMealsList = (customMeals || []).slice(0, 4);
    const customMealsInfo = customMealsList.length > 0
      ? `${customMealsList.length} repas ajouté(s): ${customMealsList.map(m => m.name).join(', ')}`
      : '';

    // Fasting info
    const fastingInfo = fasting?.hours
      ? `${fasting.hours}h de jeûne${fasting.completed ? ' (objectif atteint!)' : ''} = ${fasting.points || 0} pts`
      : '';

    // Calculate ecarts
    const petit = ecarts?.petit || 0;
    const moyen = ecarts?.moyen || 0;
    const gros = ecarts?.gros || 0;
    const totalEcarts = petit + moyen + gros;

    const prompt = `Coach bienveillant et direct. Analyse cette journée en 2 phrases MAX.

DONNÉES :
- Score : ${score} pts${score >= 100 ? ' (journée parfaite!)' : ''}
- Repas OK : ${doneHabits.join(', ') || 'aucun'}
- Repas manqués : ${missedHabits.join(', ') || 'aucun'}
${customMealsInfo ? `- Repas custom : ${customMealsInfo}\n` : ''}${fastingInfo ? `- Jeûne : ${fastingInfo}\n` : ''}- Sommeil : ${sleep}h
- Sieste : ${nap} min
- Énergie : ${energy}/5
- Eau : ${water}/8 verres
- Écarts : ${totalEcarts} (${petit}p/${moyen}m/${gros}g)
- Sport : ${movementList.join(', ') || 'aucun'}

RÈGLES :
1. Phrase 1 : Constat SPÉCIFIQUE (cite les vrais chiffres)
2. Phrase 2 : Conseil actionnable OU félicitation sincère
3. Score >= 80 → Félicite
4. Score < 50 → Encourage, propose UN truc simple
5. Jamais culpabilisant, toujours bienveillant

Exemples :
- "5h de sommeil, ça explique ton énergie à 2. Ce soir, priorité au lit avant 23h."
- "4 repas validés et une marche, super journée ! Continue demain."
- "2 gros écarts, journée difficile. Demain, prépare ta collation à l'avance."

Réponds UNIQUEMENT avec le JSON : { "analysis": "Phrase 1. Phrase 2." }`;

    const message = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.choices[0]?.message?.content || "";

    // Try to parse JSON
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.analysis) {
          return Response.json({ analysis: data.analysis });
        }
      }
    } catch (parseError) {
      // If JSON parsing fails, use the text directly if it looks like analysis
      if (text.length < 300 && !text.includes('{')) {
        return Response.json({ analysis: text.trim() });
      }
    }

    // Generate contextual fallback based on actual data
    let fallback = "";
    if (score >= 100) {
      fallback = `${score} pts, journée parfaite ! ${doneHabits.length} repas validés${movementList.length > 0 ? ' + ' + movementList.join(', ') : ''}, bravo !`;
    } else if (score >= 80) {
      fallback = `Score de ${score} pts, belle performance ! ${doneHabits.length} repas validés, continue sur cette lancée.`;
    } else if (score >= 50) {
      fallback = `${doneHabits.length} repas suivis aujourd'hui, c'est un bon début. ${sleep < 7 ? `Vise 7h de sommeil ce soir.` : `Garde ce rythme demain !`}`;
    } else {
      fallback = `Journée à ${score} pts, on a tous des jours comme ça. ${totalEcarts > 0 ? `Demain, prépare tes repas à l'avance.` : `Un pas à la fois, tu vas y arriver.`}`;
    }

    return Response.json({ analysis: fallback });
  } catch (error) {
    console.error("Daily analysis error:", error);
    return Response.json(
      { analysis: "Continue tes efforts, chaque jour compte ! 💪" },
      { status: 200 }
    );
  }
}
