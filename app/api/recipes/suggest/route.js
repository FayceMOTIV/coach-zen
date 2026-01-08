import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request) {
  try {
    const { mealType, constraints } = await request.json();

    const mealLabels = {
      breakfast: "petit-déjeuner protéiné (6 oeufs, café)",
      lunch: "déjeuner équilibré (250g riz, 300g protéine, légumes)",
      snack: "collation saine (yaourt grec ou oeuf + amandes)",
      dinner: "dîner équilibré (250g riz, 300g protéine, légumes)",
      plannedTreat: "encas plaisir contrôlé (dessert raisonnable)"
    };

    const prompt = `Tu es un chef nutrition expert. Suggère 3 recettes rapides et saines pour un ${mealLabels[mealType] || "repas équilibré"}.

${constraints ? `Contraintes: ${constraints}` : ''}

Pour chaque recette, donne:
1. Nom court et appétissant
2. Ingrédients principaux (liste courte)
3. Temps de préparation
4. Calories approximatives

Format JSON strict:
{
  "recipes": [
    {
      "name": "Nom",
      "ingredients": ["ing1", "ing2", "ing3"],
      "prepTime": "10 min",
      "calories": 450,
      "emoji": "🍳"
    }
  ]
}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0]?.text || "";

    // Try to parse JSON from response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return Response.json({ success: true, recipes: data.recipes || [] });
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
    }

    // Fallback recipes
    return Response.json({
      success: true,
      recipes: [
        { name: "Oeufs brouillés aux herbes", ingredients: ["6 oeufs", "ciboulette", "beurre"], prepTime: "5 min", calories: 400, emoji: "🍳" },
        { name: "Bowl protéiné", ingredients: ["riz", "poulet grillé", "légumes"], prepTime: "15 min", calories: 550, emoji: "🥗" },
        { name: "Yaourt grec fruits", ingredients: ["yaourt grec", "fruits rouges", "amandes"], prepTime: "2 min", calories: 200, emoji: "🥜" }
      ]
    });
  } catch (error) {
    console.error("Recipe suggestion error:", error);
    return Response.json(
      {
        success: false,
        recipes: [
          { name: "Oeufs brouillés", ingredients: ["6 oeufs", "sel", "poivre"], prepTime: "5 min", calories: 400, emoji: "🍳" }
        ]
      },
      { status: 200 }
    );
  }
}
