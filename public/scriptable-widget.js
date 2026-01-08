// Coach Zen Widget pour Scriptable
//
// INSTALLATION :
// 1. Télécharge l'app Scriptable sur l'App Store (gratuite)
// 2. Copie ce code dans un nouveau script Scriptable
// 3. Crée un widget sur ton écran d'accueil
// 4. Sélectionne ce script dans les options du widget
//
// NOTE : Ce widget affiche un score statique.
// Pour un score dynamique, tu dois récupérer tes données depuis Firebase.

const COACH_ZEN_URL = "https://coach-zen.vercel.app";

// Configuration
const CONFIG = {
  bgColor: new Color("#0f172a"),
  accentColor: new Color("#8b5cf6"),
  textColor: new Color("#ffffff"),
  mutedColor: new Color("#94a3b8")
};

async function createWidget() {
  let widget = new ListWidget();
  widget.backgroundColor = CONFIG.bgColor;
  widget.setPadding(16, 16, 16, 16);

  // Header
  let headerStack = widget.addStack();
  headerStack.centerAlignContent();

  let iconText = headerStack.addText("🌿");
  iconText.font = Font.systemFont(20);

  headerStack.addSpacer(8);

  let titleText = headerStack.addText("Coach Zen");
  titleText.font = Font.boldSystemFont(14);
  titleText.textColor = CONFIG.accentColor;

  widget.addSpacer(12);

  // Score - Tu peux modifier cette valeur manuellement
  // ou implémenter la récupération depuis Firebase
  let score = 75; // <- Modifie ce score manuellement
  let streak = 7; // <- Modifie ce streak manuellement

  // Score display
  let scoreStack = widget.addStack();
  scoreStack.centerAlignContent();

  let scoreText = scoreStack.addText(score.toString());
  scoreText.font = Font.boldSystemFont(48);
  scoreText.textColor = CONFIG.textColor;

  let pointsText = scoreStack.addText(" pts");
  pointsText.font = Font.systemFont(16);
  pointsText.textColor = CONFIG.mutedColor;

  widget.addSpacer(4);

  // Status message
  let statusMsg = score >= 80 ? "🔥 On fire!" :
                  score >= 60 ? "💪 Solide!" :
                  score >= 40 ? "👍 En route!" : "🌱 Ça pousse!";

  let statusText = widget.addText(statusMsg);
  statusText.font = Font.systemFont(12);
  statusText.textColor = CONFIG.mutedColor;
  statusText.centerAlignText();

  widget.addSpacer(8);

  // Streak
  let streakStack = widget.addStack();
  streakStack.centerAlignContent();

  let fireEmoji = streakStack.addText("🔥");
  fireEmoji.font = Font.systemFont(12);

  streakStack.addSpacer(4);

  let streakText = streakStack.addText(`${streak} jours`);
  streakText.font = Font.mediumSystemFont(11);
  streakText.textColor = CONFIG.mutedColor;

  // Tap action - ouvre l'app
  widget.url = COACH_ZEN_URL;

  return widget;
}

// Run
let widget = await createWidget();

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentSmall();
}

Script.complete();
