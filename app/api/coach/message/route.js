export async function POST(request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ message: null, type: "silence" });
    }
    
    const body = await request.json();
    const hour = new Date().getHours();
    
    const systemPrompt = `Tu es Zen, un coach personnel silencieux et bienveillant.

RÈGLES STRICTES:
- Maximum 1 phrase courte (10-15 mots max)
- Pas d'emojis, pas de ponctuation excessive
- Ton calme, direct, jamais moralisateur
- Tu es un ami loyal quand l'énergie est basse
- Tu es un coach exigeant quand l'énergie est bonne
- JAMAIS de mots comme: calories, régime, poids, maigrir

EXEMPLES DE BONS MESSAGES:
- "Les oeufs posent les bases."
- "Zone sensible. Tiens le cap."
- "Craquage prévu. Zéro culpabilité."
- "Journée difficile. Fais le minimum."

Si tu n'as rien de pertinent à dire, réponds exactement: SILENCE`;

    const context = `Heure: ${hour}h. Énergie: ${body.energy}/5. Score actuel: ${body.score}/100. Créneau: ${body.slot}.`;

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
          { role: "user", content: context },
        ],
        temperature: 0.4,
        max_tokens: 60,
      }),
    });
    
    if (!response.ok) {
      return Response.json({ message: null, type: "silence" });
    }
    
    const data = await response.json();
    let message = data.choices?.[0]?.message?.content?.trim();
    
    if (!message || message === "SILENCE" || message.includes("SILENCE")) {
      return Response.json({ message: null, type: "silence" });
    }
    
    // Clean up
    message = message.replace(/["']/g, '').substring(0, 100);
    
    return Response.json({ message, type: "ai" });
    
  } catch (error) {
    return Response.json({ message: null, type: "silence" });
  }
}

export async function GET() {
  return Response.json({ status: "ok", ai: !!process.env.OPENAI_API_KEY });
}
