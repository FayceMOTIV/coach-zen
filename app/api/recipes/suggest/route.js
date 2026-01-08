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

// Random elements for variety
const cuisines = ["française", "italienne", "asiatique", "mexicaine", "méditerranéenne", "indienne", "japonaise", "thaï", "libanaise", "grecque"];
const techniques = ["grillé", "sauté", "mijoté", "vapeur", "rôti", "poêlé", "mariné", "en papillote"];
const seasons = ["printanier", "estival", "automnal", "hivernal", "réconfortant", "frais", "léger", "gourmand"];

export async function POST(request) {
  try {
    const { mealType, constraints, excludeRecipes } = await request.json();

    const context = mealContext[mealType] || mealContext.lunch;

    // Random elements for variety
    const randomCuisine = cuisines[Math.floor(Math.random() * cuisines.length)];
    const randomTechnique = techniques[Math.floor(Math.random() * techniques.length)];
    const randomSeason = seasons[Math.floor(Math.random() * seasons.length)];
    const randomSeed = Math.floor(Math.random() * 10000);

    const excludeList = excludeRecipes?.length > 0
      ? `\nÉVITE ces recettes déjà proposées : ${excludeRecipes.join(', ')}`
      : '';

    const prompt = `Chef nutritionniste créatif (seed: ${randomSeed}). Génère 3 recettes UNIQUES pour : ${context.goal}

Contraintes : ${context.constraints}
Style inspirations : ${context.style}
Inspiration du moment : cuisine ${randomCuisine}, technique ${randomTechnique}, ambiance ${randomSeason}
${constraints ? `Contraintes supplémentaires : ${constraints}` : ''}${excludeList}

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
- Sois TRÈS CRÉATIF avec des noms évocateurs uniques
- Inspire-toi de la cuisine ${randomCuisine} et/ou technique ${randomTechnique}
- Chaque recette doit être DIFFÉRENTE des autres et des suggestions précédentes
- Steps courtes et actionnables (3-4 max)
- Propose des recettes NOUVELLES, pas des classiques

Réponds UNIQUEMENT avec le JSON : { "recipes": [...] }`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      temperature: 1, // Max creativity
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

    // Extended fallback recipes by meal type (shuffled randomly)
    const fallbackRecipes = {
      breakfast: [
        { name: "Shakshuka Épicée", emoji: "🍳", ingredients: ["6 œufs", "400g tomates concassées", "1 oignon", "poivron rouge", "cumin", "paprika"], steps: ["Faire revenir oignon et poivron 5min", "Ajouter tomates et épices, mijoter 10min", "Creuser 6 puits, casser les œufs, couvrir 5min"], prepTime: 20, kcal: 420, tip: "Ajouter de la feta émiettée pour plus de gourmandise" },
        { name: "Frittata Méditerranéenne", emoji: "🥚", ingredients: ["6 œufs", "courgette", "tomates séchées", "olives", "feta", "basilic"], steps: ["Battre œufs avec fromage", "Faire revenir légumes 5min", "Verser œufs, cuire 10min couvert"], prepTime: 15, kcal: 450, tip: "Délicieuse froide pour le lendemain" },
        { name: "Œufs Brouillés Avocat-Saumon", emoji: "🥑", ingredients: ["6 œufs", "1 avocat", "50g saumon fumé", "ciboulette", "citron"], steps: ["Brouiller œufs à feu doux 5min", "Disposer sur avocat écrasé", "Garnir saumon et ciboulette"], prepTime: 10, kcal: 520, tip: "Le secret : retirer du feu avant cuisson complète" },
        { name: "Omelette Forestière", emoji: "🍄", ingredients: ["6 œufs", "champignons", "échalote", "persil", "beurre"], steps: ["Poêler champignons et échalote", "Battre œufs, verser sur champignons", "Plier en deux, servir baveuse"], prepTime: 12, kcal: 380, tip: "Champignons de Paris ou shiitakes" },
        { name: "Eggs Benedict Maison", emoji: "🥓", ingredients: ["6 œufs", "bacon", "muffins anglais", "sauce hollandaise"], steps: ["Pocher œufs 3min", "Griller bacon et muffins", "Assembler avec hollandaise"], prepTime: 18, kcal: 550, tip: "Vinaigre dans l'eau pour œufs pochés parfaits" },
        { name: "Tortilla Espagnole", emoji: "🇪🇸", ingredients: ["6 œufs", "pommes de terre", "oignon", "huile d'olive"], steps: ["Cuire pommes de terre et oignons 15min", "Mélanger aux œufs battus", "Cuire 5min chaque côté"], prepTime: 25, kcal: 480, tip: "Servir tiède, c'est meilleur" }
      ],
      lunch: [
        { name: "Bowl Thaï au Bœuf", emoji: "🥢", ingredients: ["300g bœuf émincé", "250g riz jasmin", "carottes", "edamames", "sauce soja", "cacahuètes"], steps: ["Cuire riz et légumes séparément", "Saisir bœuf à feu vif 3min", "Assembler bowl, napper sauce"], prepTime: 20, kcal: 650, tip: "Ajouter du basilic thaï frais" },
        { name: "Curry Poulet-Coco Express", emoji: "🍛", ingredients: ["300g poulet", "250g riz basmati", "lait coco", "curry", "épinards", "gingembre"], steps: ["Faire revenir poulet avec épices", "Ajouter lait coco, mijoter 15min", "Incorporer épinards, servir sur riz"], prepTime: 25, kcal: 580, tip: "Doubler les épinards pour plus de légumes" },
        { name: "Saumon Teriyaki Légumes", emoji: "🐟", ingredients: ["300g saumon", "250g riz", "brocolis", "sauce teriyaki", "sésame", "gingembre"], steps: ["Cuire riz et brocolis vapeur", "Saisir saumon 3min/côté", "Napper teriyaki, parsemer sésame"], prepTime: 18, kcal: 620, tip: "Marinade 30min avant = saveur x10" },
        { name: "Pad Thaï Crevettes", emoji: "🍤", ingredients: ["300g crevettes", "200g nouilles de riz", "œuf", "cacahuètes", "citron vert", "sauce poisson"], steps: ["Tremper nouilles 10min", "Sauter crevettes et œuf", "Ajouter nouilles et sauce, servir avec citron"], prepTime: 15, kcal: 550, tip: "La sauce : 2 c.s. sauce poisson + 1 c.s. sucre" },
        { name: "Burrito Bowl Mexicain", emoji: "🌮", ingredients: ["300g poulet", "250g riz", "haricots noirs", "maïs", "avocat", "salsa"], steps: ["Griller poulet épicé", "Assembler riz, haricots, maïs", "Garnir avocat et salsa"], prepTime: 20, kcal: 680, tip: "Ajouter du fromage râpé et crème fraîche" },
        { name: "Risotto Champignons", emoji: "🍚", ingredients: ["300g riz arborio", "200g champignons", "parmesan", "vin blanc", "bouillon"], steps: ["Faire revenir champignons", "Ajouter riz, mouiller au bouillon", "Finir au parmesan"], prepTime: 30, kcal: 520, tip: "Remuer constamment pour le crémeux" }
      ],
      snack: [
        { name: "Parfait Protéiné", emoji: "🥜", ingredients: ["200g yaourt grec", "30g amandes", "myrtilles", "miel", "cannelle"], steps: ["Superposer yaourt et fruits", "Ajouter amandes et miel", "Saupoudrer cannelle"], prepTime: 3, kcal: 180, tip: "Préparer la veille pour plus de saveur" },
        { name: "Œuf Mollet Avocat", emoji: "🥑", ingredients: ["1 œuf", "1/2 avocat", "paprika", "sel", "quelques graines"], steps: ["Cuire œuf 6min eau bouillante", "Écraser avocat, assaisonner", "Poser œuf, ouvrir délicatement"], prepTime: 8, kcal: 190, tip: "L'œuf parfait : 6min pile pour le mollet" },
        { name: "Fromage Blanc Énergisant", emoji: "🍯", ingredients: ["150g fromage blanc", "noix", "graines de chia", "miel"], steps: ["Verser fromage blanc", "Ajouter noix et graines", "Filet de miel"], prepTime: 2, kcal: 170, tip: "Les graines de chia gonflent = satiété prolongée" },
        { name: "Smoothie Protéiné Banane", emoji: "🍌", ingredients: ["1 banane", "200ml lait", "30g protéine", "beurre cacahuète"], steps: ["Mixer tous les ingrédients", "Ajouter glaçons si désiré", "Servir immédiatement"], prepTime: 3, kcal: 195, tip: "Banane congelée = texture glacée" },
        { name: "Houmous Légumes Croquants", emoji: "🥕", ingredients: ["100g houmous", "carottes", "concombre", "céleri"], steps: ["Couper légumes en bâtonnets", "Servir avec houmous", "Assaisonner d'un filet d'huile"], prepTime: 5, kcal: 160, tip: "Ajouter paprika fumé sur le houmous" },
        { name: "Cottage Cheese Tropical", emoji: "🥥", ingredients: ["150g cottage cheese", "ananas frais", "noix de coco râpée"], steps: ["Disposer cottage cheese", "Ajouter ananas coupé", "Parsemer de coco"], prepTime: 3, kcal: 175, tip: "Le cottage cheese = 12g protéines/100g" }
      ],
      dinner: [
        { name: "Dos de Cabillaud Citronné", emoji: "🍋", ingredients: ["300g cabillaud", "haricots verts", "citron", "ail", "persil", "huile d'olive"], steps: ["Cuire poisson vapeur 12min", "Faire revenir haricots à l'ail", "Arroser de citron et persil"], prepTime: 15, kcal: 380, tip: "Le citron en fin de cuisson garde sa fraîcheur" },
        { name: "Poulet Grillé Salade Chaude", emoji: "🥗", ingredients: ["300g poulet", "roquette", "tomates cerises", "parmesan", "pignons", "balsamique"], steps: ["Griller poulet 6min/côté", "Composer salade pendant cuisson", "Trancher poulet, disposer chaud"], prepTime: 15, kcal: 420, tip: "Le poulet chaud fait légèrement fondre le parmesan" },
        { name: "Soupe Miso Tofu Soba", emoji: "🍜", ingredients: ["200g tofu", "100g soba", "miso", "algues wakame", "oignons verts", "gingembre"], steps: ["Chauffer bouillon miso", "Ajouter tofu et soba cuites", "Garnir algues et oignons"], prepTime: 12, kcal: 350, tip: "Ne jamais faire bouillir le miso" },
        { name: "Papillote de Saumon", emoji: "🐠", ingredients: ["300g saumon", "courgettes", "citron", "aneth", "huile d'olive"], steps: ["Disposer saumon sur papier cuisson", "Ajouter légumes et aromates", "Cuire au four 15min à 180°C"], prepTime: 20, kcal: 410, tip: "Ouvrir la papillote à table pour l'effet waouh" },
        { name: "Wok de Légumes au Tofu", emoji: "🥬", ingredients: ["200g tofu ferme", "brocoli", "poivrons", "sauce soja", "sésame"], steps: ["Faire dorer tofu en cubes", "Sauter légumes à feu vif", "Napper de sauce, parsemer sésame"], prepTime: 15, kcal: 320, tip: "Presser le tofu avant pour qu'il soit croustillant" },
        { name: "Salade César Légère", emoji: "🥗", ingredients: ["300g poulet", "romaine", "parmesan", "croûtons", "sauce césar légère"], steps: ["Griller poulet, trancher", "Assembler salade et croûtons", "Napper de sauce, râper parmesan"], prepTime: 15, kcal: 390, tip: "Sauce maison : yaourt grec + anchois + citron" }
      ],
      plannedTreat: [
        { name: "Mousse Choco Express", emoji: "🍫", ingredients: ["100g chocolat noir 70%", "2 œufs", "1 pincée sel"], steps: ["Fondre chocolat au bain-marie", "Incorporer jaunes puis blancs montés", "Réfrigérer 2h"], prepTime: 10, kcal: 180, tip: "70% de cacao = moins de sucre, plus d'antioxydants" },
        { name: "Banana Nice Cream", emoji: "🍌", ingredients: ["2 bananes congelées", "cacao en poudre", "lait d'amande"], steps: ["Mixer bananes congelées", "Ajouter cacao et un peu de lait", "Servir immédiatement"], prepTime: 5, kcal: 150, tip: "100% fruit, zéro culpabilité" },
        { name: "Pomme au Four Cannelle", emoji: "🍎", ingredients: ["1 pomme", "cannelle", "noix", "miel"], steps: ["Évider la pomme", "Farcir de noix et miel", "Cuire 25min à 180°C"], prepTime: 30, kcal: 160, tip: "Servir tiède avec yaourt grec" },
        { name: "Panna Cotta Légère", emoji: "🍮", ingredients: ["200ml lait d'amande", "gélatine", "vanille", "coulis fruits rouges"], steps: ["Chauffer lait avec vanille", "Dissoudre gélatine", "Réfrigérer 4h, démouler"], prepTime: 15, kcal: 120, tip: "Le lait d'amande = 2x moins de calories" }
      ]
    };

    // Shuffle and pick 3 random recipes
    const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);
    const mealRecipes = fallbackRecipes[mealType] || fallbackRecipes.lunch;
    const shuffled = shuffle([...mealRecipes]).slice(0, 3);

    return Response.json({
      success: true,
      recipes: shuffled
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
