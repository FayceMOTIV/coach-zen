import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request) {
  try {
    const { description } = await request.json();

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Tu es un nutritionniste expert. Analyse ce repas et réponds UNIQUEMENT en JSON valide, sans texte avant ou après.

REPAS: "${description}"

Réponds avec ce format JSON exact:
{
  "name": "Nom court du repas",
  "kcal": nombre_de_calories_estimé,
  "isHealthy": true_ou_false,
  "points": points_de_0_a_20,
  "details": "Courte explication (30 mots max)"
}

Règles:
- kcal: estimation réaliste des calories totales
- isHealthy: true si équilibré, protéines, légumes, pas trop gras/sucré
- points: 15-20 si très healthy, 10-14 si correct, 5-9 si moyen, 0-4 si malbouffe
- Sois précis sur les portions mentionnées

JSON uniquement:`
        }
      ]
    });

    const text = message.content[0].text.trim();
    
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid JSON response");
      }
    }

    return Response.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error("Food analysis error:", error);
    return Response.json({ 
      success: false, 
      error: "Erreur d'analyse",
      name: "Repas",
      kcal: 400,
      isHealthy: false,
      points: 0,
      details: "Impossible d'analyser ce repas"
    });
  }
}
