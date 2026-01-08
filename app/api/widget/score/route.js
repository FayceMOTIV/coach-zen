export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const score = parseInt(searchParams.get('score')) || 0;
    const streak = parseInt(searchParams.get('streak')) || 0;

    // Determine status based on score
    let status = 'start';
    let emoji = '🌱';
    if (score >= 80) {
      status = 'fire';
      emoji = '🔥';
    } else if (score >= 60) {
      status = 'solid';
      emoji = '💪';
    } else if (score >= 40) {
      status = 'good';
      emoji = '👍';
    }

    return Response.json({
      score,
      streak,
      status,
      emoji,
      message: score >= 80 ? 'On fire!' : score >= 60 ? 'Solide!' : score >= 40 ? 'En route!' : 'Ça pousse!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Widget API error:', error);
    return Response.json(
      { score: 0, streak: 0, status: 'error', emoji: '❓', message: 'Erreur' },
      { status: 200 }
    );
  }
}
