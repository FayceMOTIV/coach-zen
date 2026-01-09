import OpenAI from "openai";

const openai = new OpenAI();

export async function POST(request) {
  try {
    const { description, image } = await request.json();

    let messages = [];
    
    if (image) {
      // Analyse avec image
      messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyse ce repas${description ? ` (description: ${description})` : ''}.

IMPORTANT pour isHealthy: Juge la QUALITÉ des aliments, PAS la quantité.
- Viande, poisson, oeufs, légumes, riz, pâtes, fruits = HEALTHY (même si grosse portion)
- Fast-food, fritures, sodas, sucreries, ultra-transformé = NOT HEALTHY

Réponds en JSON strict:
{
  "success": true,
  "name": "Nom court du plat",
  "kcal": nombre (estimation calories),
  "isHealthy": true/false (qualité pas quantité!),
  "points": nombre 0-20 (20=aliments naturels, 0=ultra-transformé),
  "details": "Description courte des macros"
}`
            },
            {
              type: "image_url",
              image_url: { url: image }
            }
          ]
        }
      ];
    } else {
      // Analyse texte seulement
      messages = [
        {
          role: "user",
          content: `Analyse ce repas: "${description}".

IMPORTANT pour isHealthy: Juge la QUALITÉ des aliments, PAS la quantité.
- Viande, poisson, oeufs, légumes, riz, pâtes, fruits = HEALTHY (même si grosse portion)
- Fast-food, fritures, sodas, sucreries, ultra-transformé = NOT HEALTHY

Réponds en JSON strict:
{
  "success": true,
  "name": "Nom court du plat",
  "kcal": nombre (estimation calories),
  "isHealthy": true/false (qualité pas quantité!),
  "points": nombre 0-20 (20=aliments naturels, 0=ultra-transformé),
  "details": "Description courte des macros"
}`
        }
      ];
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 300
    });

    const content = completion.choices[0].message.content;
    
    // Parse JSON
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return Response.json(result);
      }
    } catch (e) {
      console.error("JSON parse error:", e);
    }

    return Response.json({
      success: true,
      name: "Repas",
      kcal: 400,
      isHealthy: true,
      points: 10,
      details: "Estimation par défaut"
    });

  } catch (error) {
    console.error("Food analysis error:", error);
    return Response.json({ 
      success: false, 
      error: "Erreur d'analyse" 
    });
  }
}
