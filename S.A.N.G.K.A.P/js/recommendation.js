


/* A few everyday spellings that should be treated as the same ingredient. */
const INGREDIENT_ALIASES = {
    "egg": "egg",
    "scallion": "spring onion",
    "green onion": "spring onion",
    "spring onions": "spring onion",
    "cooking oil": "oil",
    "vegetable oil": "oil",
    "olive oil": "oil",
    "chicken breast": "chicken",
    "chicken thigh": "chicken",
    "ground pork": "pork",
    "ground beef": "beef",
    "black pepper": "pepper",
    "ground pepper": "pepper",
    "toyo": "soy sauce",
    "suka": "vinegar",
    "bawang": "garlic",
    "sibuyas": "onion",
    "kamatis": "tomato",
    "itlog": "egg",
    "kanin": "rice",
    "bigas": "rice",
    "manok": "chicken",
    "baboy": "pork",
    "baka": "beef",
    "isda": "fish",
    "patatas": "potato",
    "repolyo": "cabbage",
    "asin": "salt",
    "paminta": "pepper",
    "gata" : "coconut milk",
    "aso"  : "dog"
    
};

/**
 * Brings any spelling of an ingredient to one comparable form, so that
 * Chicken, chicken and CHICKEN are all the same thing.
 */
function normalizeIngredient(value) {
    if (typeof value !== "string") {
        return "";
    }

    let name = value
        .toLowerCase()
        .replace(/[.,;:!?]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    if (!name) {
        return "";
    }

    /* Simple plural handling: tomatoes becomes tomato, eggs becomes egg. */
    if (name.endsWith("oes")) {
        name = name.slice(0, -2);
    } else if (name.length > 3 && name.endsWith("s") && !name.endsWith("ss")) {
        name = name.slice(0, -1);
    }

    if (INGREDIENT_ALIASES[name]) {
        name = INGREDIENT_ALIASES[name];
    }

    return name;
}

/**
 * Turns a basket array into a lookup set of normalised names.
 */
function buildBasketSet(basket) {
    const set = new Set();
    (Array.isArray(basket) ? basket : []).forEach(function (item) {
        const name = normalizeIngredient(item);
        if (name) {
            set.add(name);
        }
    });
    return set;
}

/**
 * Compares one recipe against the basket.
 * Returns the percentage plus the ingredient lists, which the details page
 * uses for its Available and Missing sections.
 */
function calculateIngredientMatch(recipe, basket) {
    const basketSet = basket instanceof Set ? basket : buildBasketSet(basket);
    const ingredients = (recipe && Array.isArray(recipe.ingredients)) ? recipe.ingredients : [];

    let totalWeight = 0;
    let matchedWeight = 0;
    const available = [];
    const missing = [];

    ingredients.forEach(function (ingredient) {
        const weight = Number(ingredient.weight) || IMPORTANCE_TO_WEIGHT[ingredient.importance] || 1;
        totalWeight += weight;

        if (basketSet.has(normalizeIngredient(ingredient.name))) {
            matchedWeight += weight;
            available.push(ingredient);
        } else {
            missing.push(ingredient);
        }
    });

    const percent = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;

    return {
        percent: percent,
        totalWeight: totalWeight,
        matchedWeight: matchedWeight,
        available: available,
        missing: missing
    };
}

/**
 * Text badge for a match percentage.
 */
function getMatchStatus(percent) {
    const value = Number(percent) || 0;

    if (value >= 100) {
        return { key: "ready", label: "Ready to Cook" };
    }
    if (value >= 80) {
        return { key: "almost", label: "Almost There" };
    }
    if (value >= 60) {
        return { key: "good", label: "Good Match" };
    }
    if (value >= 40) {
        return { key: "partial", label: "Partial Match" };
    }
    return { key: "low", label: "Low Match" };
}

function calculateRatingScore(rating) {
    const value = Number(rating) || 0;
    return (value / 5) * 100;
}

function calculatePopularityScore(ratingCount) {
    const value = Number(ratingCount) || 0;
    return Math.min(100, (value / 500) * 100);
}

function calculateQuicknessScore(cookingTime) {
    const minutes = Number(cookingTime) || 0;

    if (minutes <= 15) {
        return 100;
    }
    if (minutes <= 30) {
        return 80;
    }
    if (minutes <= 60) {
        return 60;
    }
    if (minutes <= 90) {
        return 40;
    }
    return 20;
}

/**
 * The weighted score that decides the order of the results page.
 */
function calculateRecommendationScore(recipe, ingredientMatch) {
    const match = Number(ingredientMatch) || 0;
    const score =
        match * 0.70 +
        calculateRatingScore(recipe.rating) * 0.15 +
        calculatePopularityScore(recipe.ratingCount) * 0.10 +
        calculateQuicknessScore(recipe.cookingTime) * 0.05;

    return Math.round(score * 10) / 10;
}

/**
 * Wraps a recipe with everything the cards need to display.
 */
function buildRecommendation(recipe, basketSet) {
    const match = calculateIngredientMatch(recipe, basketSet);
    return {
        recipe: recipe,
        match: match.percent,
        status: getMatchStatus(match.percent),
        available: match.available,
        missing: match.missing,
        score: calculateRecommendationScore(recipe, match.percent)
    };
}

/**
 * Scores every recipe against the basket and sorts the best first.
 * Recipes with an identical score fall back to the higher rating.
 */
function sortRecipeRecommendations(recipes, basket) {
    const basketSet = buildBasketSet(basket);

    return (recipes || [])
        .map(function (recipe) {
            return buildRecommendation(recipe, basketSet);
        })
        .sort(function (a, b) {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return (Number(b.recipe.rating) || 0) - (Number(a.recipe.rating) || 0);
        });
}
