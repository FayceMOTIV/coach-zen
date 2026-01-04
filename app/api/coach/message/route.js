export async function POST(request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      // Pas de clé = on retourne silence, l'app fonctionne quand même
      return Response.json({ message: null, type: "silence" });
    }
    
    const body = await request.json();
    
    const systemPrompt = `Tu es Zen, un coach personnel silencieux.
RÈGLES:
- Maximum 1-2 phrases
- Pas d'emojis
- Ton calme, direct
- Jamais moralisateur
- Ne jamais mentionner: calories, macros, régime

Si pas de message pertinent, réponds: SILENCE`;

    const userPrompt = `Contexte: énergie ${body.energy}/5, score ${body.score}/100, créneau ${body.slot || 'inconnu'}.
Génère UN message court.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });
    
    if (!response.ok) {
      return Response.json({ message: null, type: "silence" });
    }
    
    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim();
    
    if (!message || message === "SILENCE") {
      return Response.json({ message: null, type: "silence" });
    }
    
    return Response.json({ message, type: "standard" });
    
  } catch (error) {
    return Response.json({ message: null, type: "silence" });
  }
}

export async function GET() {
  return Response.json({ 
    status: "ok", 
    aiEnabled: !!process.env.OPENAI_API_KEY 
  });
}
