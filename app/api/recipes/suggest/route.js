import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const mealContext = {
  breakfast: {
    goal: "Petit-déjeuner protéiné, tenir jusqu'au déjeuner sans fringale",
    constraints: "Base : œufs (6) ou équivalent protéiné, éviter sucre rapide",
    style: "Shakshuka, omelette garnie, œufs brouillés avocat, frittata légumes"
  },
  lunch: {
    goal: "Déjeuner équilibré pour énergie après-midi",
    constraints: "Riz/féculents + protéine (poulet, poisson, bœuf) + légumes",
    style: "Bowl asiatique, curry, sauté wok, grillades méditerranéennes"
  },
  snack: {
    goal: "Collation légère et rassasiante pré-sieste",
    constraints: "Protéiné, <200 kcal, éviter sucre",
    style: "Yaourt grec, œuf dur amandes, fromage blanc fruits secs"
  },
  dinner: {
    goal: "Dîner complet avant 20h30, digeste pour bien dormir",
    constraints: "Protéines + légumes, féculents légers, portion modérée",
    style: "Poisson vapeur, poulet grillé salade, soupe + protéine"
  },
  plannedTreat: {
    goal: "Plaisir contrôlé sans culpabilité",
    constraints: "Portion raisonnable, qualité > quantité",
    style: "Carré chocolat noir, fruit + yaourt, gâteau maison portion"
  }
};

export async function POST(request) {
  try {
    const { mealType, constraints } = await request.json();

    const context = mealContext[mealType] || mealContext.lunch;

    const prompt = `Chef nutritionniste créatif. Génère 3 recettes UNIQUES pour : ${context.goal}

Contraintes : ${context.constraints}
Style inspirations : ${context.style}
${constraints ? `Contraintes supplémentaires : ${constraints}` : ''}

Pour chaque recette, fournis EXACTEMENT ce format JSON :
{
  "name": "Nom appétissant et original",
  "emoji": "🍳",
  "ingredients": ["200g poulet", "100g riz", "..."],
  "steps": ["Étape 1 concise", "Étape 2 concise", "Étape 3 concise"],
  "prepTime": 15,
  "kcal": 450,
  "tip": "Conseil du chef ou variante gourmande"
}

IMPORTANT :
- Sois CRÉATIF avec des noms évocateurs (pas "Salade de poulet")
- Propose des saveurs, épices, cuisines du monde
- Chaque recette doit être DIFFÉRENTE des autres
- Steps courtes et actionnables (3-4 max)

Réponds UNIQUEMENT avec le JSON : { "recipes": [...] }`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0]?.text || "";

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return Response.json({ success: true, recipes: data.recipes || [] });
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
    }

    // Fallback recipes by meal type
    const fallbackRecipes = {
      breakfast: [
        { name: "Shakshuka Épicée", emoji: "🍳", ingredients: ["6 œufs", "400g tomates concassées", "1 oignon", "poivron rouge", "cumin", "paprika"], steps: ["Faire revenir oignon et poivron 5min", "Ajouter tomates et épices, mijoter 10min", "Creuser 6 puits, casser les œufs, couvrir 5min"], prepTime: 20, kcal: 420, tip: "Ajouter de la feta émiettée pour plus de gourmandise" },
        { name: "Frittata Méditerranéenne", emoji: "🥚", ingredients: ["6 œufs", "courgette", "tomates séchées", "olives", "feta", "basilic"], steps: ["Battre œufs avec fromage", "Faire revenir légumes 5min", "Verser œufs, cuire 10min couvert"], prepTime: 15, kcal: 450, tip: "Délicieuse froide pour le lendemain" },
        { name: "Œufs Brouillés Avocat-Saumon", emoji: "🥑", ingredients: ["6 œufs", "1 avocat", "50g saumon fumé", "ciboulette", "citron"], steps: ["Brouiller œufs à feu doux 5min", "Disposer sur avocat écrasé", "Garnir saumon et ciboulette"], prepTime: 10, kcal: 520, tip: "Le secret : retirer du feu avant cuisson complète" }
      ],
      lunch: [
        { name: "Bowl Thaï au Bœuf", emoji: "🥢", ingredients: ["300g bœuf émincé", "250g riz jasmin", "carottes", "edamames", "sauce soja", "cacahuètes"], steps: ["Cuire riz et légumes séparément", "Saisir bœuf à feu vif 3min", "Assembler bowl, napper sauce"], prepTime: 20, kcal: 650, tip: "Ajouter du basilic thaï frais" },
        { name: "Curry Poulet-Coco Express", emoji: "🍛", ingredients: ["300g poulet", "250g riz basmati", "lait coco", "curry", "épinards", "gingembre"], steps: ["Faire revenir poulet avec épices", "Ajouter lait coco, mijoter 15min", "Incorporer épinards, servir sur riz"], prepTime: 25, kcal: 580, tip: "Doubler les épinards pour plus de légumes" },
        { name: "Saumon Teriyaki Légumes", emoji: "🐟", ingredients: ["300g saumon", "250g riz", "brocolis", "sauce teriyaki", "sésame", "gingembre"], steps: ["Cuire riz et brocolis vapeur", "Saisir saumon 3min/côté", "Napper teriyaki, parsemer sésame"], prepTime: 18, kcal: 620, tip: "Marinade 30min avant = saveur x10" }
      ],
      snack: [
        { name: "Parfait Protéiné", emoji: "🥜", ingredients: ["200g yaourt grec", "30g amandes", "myrtilles", "miel", "cannelle"], steps: ["Superposer yaourt et fruits", "Ajouter amandes et miel", "Saupoudrer cannelle"], prepTime: 3, kcal: 180, tip: "Préparer la veille pour plus de saveur" },
        { name: "Œuf Mollet Avocat", emoji: "🥑", ingredients: ["1 œuf", "1/2 avocat", "paprika", "sel", "quelques graines"], steps: ["Cuire œuf 6min eau bouillante", "Écraser avocat, assaisonner", "Poser œuf, ouvrir délicatement"], prepTime: 8, kcal: 190, tip: "L'œuf parfait : 6min pile pour le mollet" },
        { name: "Fromage Blanc Énergisant", emoji: "🍯", ingredients: ["150g fromage blanc", "noix", "graines de chia", "miel"], steps: ["Verser fromage blanc", "Ajouter noix et graines", "Filet de miel"], prepTime: 2, kcal: 170, tip: "Les graines de chia gonflent = satiété prolongée" }
      ],
      dinner: [
        { name: "Dos de Cabillaud Citronné", emoji: "🍋", ingredients: ["300g cabillaud", "haricots verts", "citron", "ail", "persil", "huile d'olive"], steps: ["Cuire poisson vapeur 12min", "Faire revenir haricots à l'ail", "Arroser de citron et persil"], prepTime: 15, kcal: 380, tip: "Le citron en fin de cuisson garde sa fraîcheur" },
        { name: "Poulet Grillé Salade Chaude", emoji: "🥗", ingredients: ["300g poulet", "roquette", "tomates cerises", "parmesan", "pignons", "balsamique"], steps: ["Griller poulet 6min/côté", "Composer salade pendant cuisson", "Trancher poulet, disposer chaud"], prepTime: 15, kcal: 420, tip: "Le poulet chaud fait légèrement fondre le parmesan" },
        { name: "Soupe Miso Tofu Soba", emoji: "🍜", ingredients: ["200g tofu", "100g soba", "miso", "algues wakame", "oignons verts", "gingembre"], steps: ["Chauffer bouillon miso", "Ajouter tofu et soba cuites", "Garnir algues et oignons"], prepTime: 12, kcal: 350, tip: "Ne jamais faire bouillir le miso" }
      ],
      plannedTreat: [
        { name: "Mousse Choco Express", emoji: "🍫", ingredients: ["100g chocolat noir 70%", "2 œufs", "1 pincée sel"], steps: ["Fondre chocolat au bain-marie", "Incorporer jaunes puis blancs montés", "Réfrigérer 2h"], prepTime: 10, kcal: 180, tip: "70% de cacao = moins de sucre, plus d'antioxydants" }
      ]
    };

    return Response.json({
      success: true,
      recipes: fallbackRecipes[mealType] || fallbackRecipes.lunch
    });
  } catch (error) {
    console.error("Recipe suggestion error:", error);
    return Response.json(
      {
        success: false,
        recipes: [
          { name: "Bowl Équilibré", emoji: "🥗", ingredients: ["protéine au choix", "féculents", "légumes variés"], steps: ["Cuire les composants", "Assembler joliment", "Assaisonner"], prepTime: 15, kcal: 500, tip: "La variété des couleurs = variété des nutriments" }
        ]
      },
      { status: 200 }
    );
  }
}
