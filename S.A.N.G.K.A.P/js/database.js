/*
    S.A.N.G.K.A.P. - database.js

    This file is the single source of truth for the prototype's data.
    Every page reads and writes recipes, users, ratings and favorites
    through the helpers below, so the Basket, Community, Featured and
    Profile pages always see exactly the same records.

    Shape of the stored data:

        database = {
            users: [],
            recipes: [],
            ratings: [],
            favorites: []
        }
*/

/* In-memory snapshot of the four collections. Refreshed by loadDatabase(). */
const database = {
    users: [],
    recipes: [],
    ratings: [],
    favorites: []
};

/* Importance level to numeric weight. Used by the matching formula. */
const IMPORTANCE_TO_WEIGHT = {
    essential: 3,
    important: 2,
    optional: 1
};

/**
 * Small helper that builds one recipe ingredient object so the weight can
 * never drift away from the importance level.
 */
function ing(name, importance) {
    return {
        name: name,
        importance: importance,
        weight: IMPORTANCE_TO_WEIGHT[importance] || 1
    };
}

/* ---------------------------------------------------------------
   Sample users
   Simple credentials, on purpose, so the project can be demonstrated
   in class. Every account below uses the password: password123
   --------------------------------------------------------------- */
const DEFAULT_USERS = [
    {
        id: "USR001",
        username: "maria",
        email: "maria@sangkap.test",
        password: "password123",
        displayName: "Maria Santos",
        profileImage: "",
        dateCreated: "2026-07-02T08:00:00.000Z",
        role: "user"
    },
    {
        id: "USR002",
        username: "andrei",
        email: "andrei@sangkap.test",
        password: "password123",
        displayName: "Andrei Cruz",
        profileImage: "",
        dateCreated: "2026-07-18T08:00:00.000Z",
        role: "user"
    },
    {
        id: "USR003",
        username: "liza",
        email: "liza@sangkap.test",
        password: "password123",
        displayName: "Liza Ramos",
        profileImage: "",
        dateCreated: "2026-08-05T08:00:00.000Z",
        role: "user"
    },
    {
        id: "USR004",
        username: "kenji",
        email: "kenji@sangkap.test",
        password: "password123",
        displayName: "Kenji Bautista",
        profileImage: "",
        dateCreated: "2026-08-19T08:00:00.000Z",
        role: "user"
    },
    {
        id: "USR005",
        username: "grace",
        email: "grace@sangkap.test",
        password: "password123",
        displayName: "Grace Villanueva",
        profileImage: "",
        dateCreated: "2026-09-01T08:00:00.000Z",
        role: "user"
    }
];

/* ---------------------------------------------------------------
   Sample recipes
   The first 25 are built-in kitchen recipes. The last 5 are marked
   as community recipes so the Community page has content on a fresh
   install. Both kinds use the identical structure, which is what lets
   uploaded recipes join the matching system automatically.
   --------------------------------------------------------------- */
const DEFAULT_RECIPES = [
    {
        id: "REC001",
        title: "Chicken Adobo",
        description: "Chicken simmered in soy sauce, vinegar and plenty of garlic until the sauce turns glossy.",
        image: "assets/images/manoknaadobo.jpg",
        category: "Chicken",
        cookingTime: 45,
        difficulty: "Easy",
        ingredients: [
            ing("chicken", "essential"),
            ing("soy sauce", "essential"),
            ing("vinegar", "essential"),
            ing("garlic", "important"),
            ing("onion", "important"),
            ing("pepper", "optional")
        ],
        instructions: [
            "Cut the chicken into serving pieces and pat them dry.",
            "Brown the chicken in a hot pan, then set it aside.",
            "Saute the garlic and onion until soft and fragrant.",
            "Return the chicken, pour in the soy sauce and vinegar, and let it boil without stirring for two minutes.",
            "Lower the heat, cover, and simmer for 30 minutes until the sauce thickens.",
            "Season with pepper and serve hot with rice."
        ],
        tags: ["filipino", "chicken", "budget", "classic"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.8,
        ratingCount: 420,
        dateCreated: "2026-06-04T09:00:00.000Z"
    },
    {
        id: "REC002",
        title: "Pork Adobo",
        description: "Pork belly braised low and slow in vinegar and soy sauce until the fat turns tender.",
        image: "assets/images/PORKNAADBO.jpg",
        category: "Pork",
        cookingTime: 55,
        difficulty: "Easy",
        ingredients: [
            ing("pork", "essential"),
            ing("soy sauce", "essential"),
            ing("vinegar", "essential"),
            ing("garlic", "important"),
            ing("onion", "important"),
            ing("bay leaf", "optional"),
            ing("pepper", "optional")
        ],
        instructions: [
            "Sear the pork pieces in a dry pan until the edges brown.",
            "Add the garlic and onion and cook until softened.",
            "Pour in the soy sauce, vinegar and a cup of water with the bay leaf.",
            "Simmer covered for 40 minutes, stirring once or twice.",
            "Uncover and reduce the sauce until it coats the pork."
        ],
        tags: ["filipino", "pork", "budget", "classic"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.7,
        ratingCount: 310,
        dateCreated: "2026-06-06T09:00:00.000Z"
    },
    {
        id: "REC003",
        title: "Pork Sinigang",
        description: "A sour tamarind soup loaded with pork and vegetables, best on a rainy afternoon.",
        image: "assets/images/Pork Sinigang.jpg",
        category: "Soup",
        cookingTime: 60,
        difficulty: "Medium",
        ingredients: [
            ing("pork", "essential"),
            ing("tamarind mix", "essential"),
            ing("tomato", "important"),
            ing("onion", "important"),
            ing("radish", "optional"),
            ing("kangkong", "optional"),
            ing("salt", "optional")
        ],
        instructions: [
            "Boil the pork with onion and tomato until tender, skimming the foam.",
            "Stir in the tamarind mix and taste for sourness.",
            "Add the radish and cook until just soft.",
            "Drop in the kangkong, turn off the heat, and cover for two minutes.",
            "Season with salt and serve with rice."
        ],
        tags: ["filipino", "soup", "pork"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.7,
        ratingCount: 285,
        dateCreated: "2026-06-08T09:00:00.000Z"
    },
    {
        id: "REC004",
        title: "Chicken Tinola",
        description: "Clear ginger broth with chicken and green papaya. Light, warm and very forgiving.",
        image: "assets/images/Chicken Tinola.jpg",
        category: "Soup",
        cookingTime: 40,
        difficulty: "Easy",
        ingredients: [
            ing("chicken", "essential"),
            ing("ginger", "essential"),
            ing("onion", "important"),
            ing("garlic", "important"),
            ing("fish sauce", "important"),
            ing("green papaya", "optional"),
            ing("chili leaves", "optional")
        ],
        instructions: [
            "Saute the ginger, garlic and onion until aromatic.",
            "Add the chicken and cook until the outside turns opaque.",
            "Season with fish sauce, pour in water, and simmer for 20 minutes.",
            "Add the green papaya and cook until tender.",
            "Finish with chili leaves just before serving."
        ],
        tags: ["filipino", "chicken", "soup", "budget"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.6,
        ratingCount: 245,
        dateCreated: "2026-06-11T09:00:00.000Z"
    },
    {
        id: "REC005",
        title: "Pancit Bihon",
        description: "Thin rice noodles tossed with chicken and vegetables. The default handaan dish.",
        image: "assets/images/easy-pancit-bihon.jpg",
        category: "Noodles",
        cookingTime: 35,
        difficulty: "Medium",
        ingredients: [
            ing("noodles", "essential"),
            ing("soy sauce", "essential"),
            ing("chicken", "important"),
            ing("carrot", "important"),
            ing("cabbage", "important"),
            ing("garlic", "important"),
            ing("onion", "important"),
            ing("pepper", "optional")
        ],
        instructions: [
            "Soak the rice noodles in water until pliable, then drain.",
            "Saute the garlic and onion, add the chicken, and cook through.",
            "Add the carrot and cabbage and stir fry briefly.",
            "Pour in broth and soy sauce, then bring to a simmer.",
            "Add the noodles and toss until they absorb the sauce.",
            "Season with pepper and serve with calamansi on the side."
        ],
        tags: ["filipino", "noodles", "budget"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.7,
        ratingCount: 352,
        dateCreated: "2026-06-14T09:00:00.000Z"
    },
    {
        id: "REC006",
        title: "Tortang Talong",
        description: "Grilled eggplant flattened and fried in egg. Five ingredients, ten pesos of effort.",
        image: "assets/images/Tortang Talong.jpg",
        category: "Egg",
        cookingTime: 20,
        difficulty: "Easy",
        ingredients: [
            ing("eggplant", "essential"),
            ing("egg", "essential"),
            ing("salt", "optional"),
            ing("pepper", "optional"),
            ing("oil", "optional")
        ],
        instructions: [
            "Grill or broil the eggplant until the skin blisters, then peel it.",
            "Flatten the eggplant gently with a fork.",
            "Beat the eggs with salt and pepper in a shallow dish.",
            "Soak the eggplant in the egg and fry each side until golden."
        ],
        tags: ["filipino", "egg", "budget", "quick"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.5,
        ratingCount: 180,
        dateCreated: "2026-06-17T09:00:00.000Z"
    },
    {
        id: "REC007",
        title: "Arroz Caldo",
        description: "Thick ginger rice porridge with chicken, topped with toasted garlic and egg.",
        image: "assets/images/Arroz Caldo.jpg",
        category: "Rice",
        cookingTime: 45,
        difficulty: "Easy",
        ingredients: [
            ing("rice", "essential"),
            ing("chicken", "essential"),
            ing("ginger", "important"),
            ing("garlic", "important"),
            ing("onion", "important"),
            ing("fish sauce", "optional"),
            ing("egg", "optional")
        ],
        instructions: [
            "Fry half the garlic until golden and set it aside for topping.",
            "Saute the remaining garlic with ginger and onion.",
            "Add the chicken and season with fish sauce.",
            "Stir in the rice, pour in plenty of water, and simmer for 30 minutes.",
            "Stir often until thick, then top with boiled egg and toasted garlic."
        ],
        tags: ["filipino", "rice", "soup", "budget"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.6,
        ratingCount: 262,
        dateCreated: "2026-06-19T09:00:00.000Z"
    },
    {
        id: "REC008",
        title: "Beef Tapa",
        description: "Sweet and salty cured beef, fried fast and served with garlic rice and egg.",
        image: "assets/images/Beef Tapa.jpg",
        category: "Beef",
        cookingTime: 20,
        difficulty: "Easy",
        ingredients: [
            ing("beef", "essential"),
            ing("soy sauce", "essential"),
            ing("garlic", "important"),
            ing("vinegar", "important"),
            ing("sugar", "optional"),
            ing("pepper", "optional")
        ],
        instructions: [
            "Slice the beef thinly against the grain.",
            "Marinate with soy sauce, garlic, vinegar, sugar and pepper for at least an hour.",
            "Fry in a hot pan in a single layer until the edges caramelise.",
            "Serve with garlic rice and a fried egg."
        ],
        tags: ["filipino", "beef", "quick"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.6,
        ratingCount: 205,
        dateCreated: "2026-06-22T09:00:00.000Z"
    },
    {
        id: "REC009",
        title: "Ginisang Gulay",
        description: "A plain sauteed vegetable dish that works with whatever is left in the crisper.",
        image: "assets/images/Ginisang Gulay.jpg",
        category: "Vegetable",
        cookingTime: 25,
        difficulty: "Easy",
        ingredients: [
            ing("cabbage", "essential"),
            ing("carrot", "important"),
            ing("garlic", "important"),
            ing("onion", "important"),
            ing("tomato", "important"),
            ing("soy sauce", "optional"),
            ing("oil", "optional")
        ],
        instructions: [
            "Saute the garlic, onion and tomato until the tomato breaks down.",
            "Add the carrot and cook for three minutes.",
            "Add the cabbage and toss over high heat.",
            "Season with soy sauce and serve while the vegetables still have bite."
        ],
        tags: ["filipino", "vegetable", "budget", "healthy"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.3,
        ratingCount: 142,
        dateCreated: "2026-06-25T09:00:00.000Z"
    },
    {
        id: "REC010",
        title: "Chicken Fried Rice",
        description: "Day-old rice fried hard with chicken, egg and garlic. The classic clean-out-the-fridge meal.",
        image: "assets/images/Chicken Fried Rice.jpg",
        category: "Rice",
        cookingTime: 20,
        difficulty: "Easy",
        ingredients: [
            ing("rice", "essential"),
            ing("chicken", "essential"),
            ing("egg", "important"),
            ing("garlic", "important"),
            ing("soy sauce", "optional"),
            ing("pepper", "optional")
        ],
        instructions: [
            "Break up the cold rice with your hands so no clumps remain.",
            "Scramble the egg in a hot pan, then set it aside.",
            "Fry the garlic, add the chicken, and cook until browned.",
            "Add the rice and press it against the pan to toast.",
            "Return the egg, season with soy sauce and pepper, and toss."
        ],
        tags: ["rice", "chicken", "quick", "budget", "asian"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.8,
        ratingCount: 400,
        dateCreated: "2026-06-28T09:00:00.000Z"
    },
    {
        id: "REC011",
        title: "Garlic Fried Rice",
        description: "Sinangag. Rice, garlic, oil, salt. Nothing else, and nothing else is needed.",
        image: "assets/images/Garlic Fried Rice.jpg",
        category: "Rice",
        cookingTime: 10,
        difficulty: "Easy",
        ingredients: [
            ing("rice", "essential"),
            ing("garlic", "essential"),
            ing("oil", "important"),
            ing("salt", "optional"),
            ing("pepper", "optional")
        ],
        instructions: [
            "Fry the chopped garlic in oil over low heat until pale gold.",
            "Raise the heat and add the cold rice.",
            "Toss until every grain is coated and slightly toasted.",
            "Season with salt and pepper."
        ],
        tags: ["filipino", "rice", "quick", "budget"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.6,
        ratingCount: 300,
        dateCreated: "2026-06-30T09:00:00.000Z"
    },
    {
        id: "REC012",
        title: "Chicken Curry",
        description: "Mild coconut curry with potato and carrot. Filipino-style, not too spicy.",
        image: "assets/images/Chicken Curry.jpg",
        category: "Chicken",
        cookingTime: 50,
        difficulty: "Medium",
        ingredients: [
            ing("chicken", "essential"),
            ing("curry powder", "essential"),
            ing("coconut milk", "essential"),
            ing("potato", "important"),
            ing("carrot", "important"),
            ing("onion", "important"),
            ing("garlic", "important")
        ],
        instructions: [
            "Saute the garlic and onion, then add the chicken.",
            "Stir in the curry powder and cook until fragrant.",
            "Pour in the coconut milk and simmer gently.",
            "Add the potato and carrot and cook until fork tender.",
            "Taste, adjust the salt, and serve with rice."
        ],
        tags: ["asian", "chicken"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.5,
        ratingCount: 195,
        dateCreated: "2026-07-02T09:00:00.000Z"
    },
    {
        id: "REC013",
        title: "Vegetable Stir Fry",
        description: "High heat, soy sauce, and whatever vegetables are in the basket. Ready in a quarter hour.",
        image: "assets/images/Vegetable Stir Fry.jpg",
        category: "Vegetable",
        cookingTime: 15,
        difficulty: "Easy",
        ingredients: [
            ing("cabbage", "essential"),
            ing("carrot", "essential"),
            ing("garlic", "important"),
            ing("soy sauce", "important"),
            ing("onion", "important"),
            ing("oil", "optional"),
            ing("pepper", "optional")
        ],
        instructions: [
            "Slice all vegetables to a similar thickness so they cook evenly.",
            "Heat the oil until it shimmers, then add the garlic and onion.",
            "Add the carrot first, then the cabbage.",
            "Splash in the soy sauce and toss for one more minute."
        ],
        tags: ["asian", "vegetable", "quick", "budget", "healthy"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.4,
        ratingCount: 165,
        dateCreated: "2026-07-05T09:00:00.000Z"
    },
    {
        id: "REC014",
        title: "Simple Shoyu Ramen",
        description: "A weeknight ramen built on soy sauce broth, a soft egg, and instant noodles.",
        image: "assets/images/Simple Shoyu Ramen.jpg",
        category: "Noodles",
        cookingTime: 30,
        difficulty: "Medium",
        ingredients: [
            ing("noodles", "essential"),
            ing("soy sauce", "essential"),
            ing("egg", "important"),
            ing("garlic", "important"),
            ing("onion", "important"),
            ing("pork", "optional"),
            ing("spring onion", "optional")
        ],
        instructions: [
            "Boil the eggs for seven minutes, then chill them in cold water.",
            "Simmer garlic, onion and soy sauce in water for 15 minutes to build the broth.",
            "Cook the noodles separately so the broth stays clear.",
            "Assemble the noodles and broth, then top with halved egg, pork and spring onion."
        ],
        tags: ["asian", "noodles"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.6,
        ratingCount: 225,
        dateCreated: "2026-07-08T09:00:00.000Z"
    },
    {
        id: "REC015",
        title: "Teriyaki Chicken",
        description: "Pan-fried chicken glazed in a four-ingredient sauce that thickens on its own.",
        image: "assets/images/Teriyaki Chicken.jpg",
        category: "Chicken",
        cookingTime: 25,
        difficulty: "Easy",
        ingredients: [
            ing("chicken", "essential"),
            ing("soy sauce", "essential"),
            ing("sugar", "important"),
            ing("garlic", "important"),
            ing("ginger", "optional"),
            ing("vinegar", "optional")
        ],
        instructions: [
            "Cook the chicken skin side down until the skin is crisp.",
            "Mix the soy sauce, sugar, garlic, ginger and vinegar.",
            "Pour the sauce into the pan and let it bubble.",
            "Spoon the glaze over the chicken until it turns shiny and thick.",
            "Rest for two minutes, slice, and serve over rice."
        ],
        tags: ["asian", "chicken", "quick"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.7,
        ratingCount: 272,
        dateCreated: "2026-07-11T09:00:00.000Z"
    },
    {
        id: "REC016",
        title: "Egg Sandwich",
        description: "Chopped egg, mayonnaise, bread. A ten-minute breakfast or a midnight snack.",
        image: "assets/images/Egg Sandwich.jpg",
        category: "Snack",
        cookingTime: 10,
        difficulty: "Easy",
        ingredients: [
            ing("egg", "essential"),
            ing("bread", "essential"),
            ing("mayonnaise", "important"),
            ing("salt", "optional"),
            ing("pepper", "optional")
        ],
        instructions: [
            "Hard boil the eggs, cool them, then peel and chop.",
            "Mix with mayonnaise, salt and pepper.",
            "Spread thickly on bread and press the sandwich closed."
        ],
        tags: ["quick", "budget", "egg", "snack"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.2,
        ratingCount: 124,
        dateCreated: "2026-07-13T09:00:00.000Z"
    },
    {
        id: "REC017",
        title: "Tuna Pasta",
        description: "Canned tuna, tomato and garlic turned into a full meal for the price of a snack.",
        image: "assets/images/Tuna Pasta.jpg",
        category: "Pasta",
        cookingTime: 25,
        difficulty: "Easy",
        ingredients: [
            ing("pasta", "essential"),
            ing("tuna", "essential"),
            ing("garlic", "important"),
            ing("onion", "important"),
            ing("tomato", "important"),
            ing("oil", "optional"),
            ing("pepper", "optional")
        ],
        instructions: [
            "Boil the pasta in salted water until just firm.",
            "Saute the garlic and onion in oil, then add the tomato.",
            "Stir in the tuna along with its oil and cook for five minutes.",
            "Toss the drained pasta in the sauce with a splash of pasta water."
        ],
        tags: ["pasta", "budget", "quick"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.5,
        ratingCount: 212,
        dateCreated: "2026-07-16T09:00:00.000Z"
    },
    {
        id: "REC018",
        title: "Classic Omelette",
        description: "Eggs beaten with tomato and onion, cooked gently so the centre stays soft.",
        image: "assets/images/Classic Omelette.jpg",
        category: "Egg",
        cookingTime: 10,
        difficulty: "Easy",
        ingredients: [
            ing("egg", "essential"),
            ing("onion", "important"),
            ing("tomato", "important"),
            ing("salt", "optional"),
            ing("pepper", "optional"),
            ing("oil", "optional")
        ],
        instructions: [
            "Beat the eggs with salt and pepper until fully combined.",
            "Soften the onion and tomato in a little oil.",
            "Pour in the egg and lower the heat.",
            "Fold once the edges set but the middle is still glossy."
        ],
        tags: ["egg", "quick", "budget"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.3,
        ratingCount: 155,
        dateCreated: "2026-07-18T09:00:00.000Z"
    },
    {
        id: "REC019",
        title: "Garlic Butter Pasta",
        description: "Three ingredients, twenty minutes, and it still tastes like a restaurant order.",
        image: "assets/images/Garlic Butter Pasta.jpg",
        category: "Pasta",
        cookingTime: 20,
        difficulty: "Easy",
        ingredients: [
            ing("pasta", "essential"),
            ing("garlic", "essential"),
            ing("butter", "essential"),
            ing("salt", "optional"),
            ing("pepper", "optional"),
            ing("parsley", "optional")
        ],
        instructions: [
            "Boil the pasta and save a cup of the cooking water.",
            "Melt the butter over low heat and add the sliced garlic.",
            "Cook the garlic slowly until it smells sweet, never letting it brown.",
            "Toss the pasta in the butter with a little pasta water until creamy."
        ],
        tags: ["pasta", "quick", "budget"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.6,
        ratingCount: 234,
        dateCreated: "2026-07-21T09:00:00.000Z"
    },
    {
        id: "REC020",
        title: "Potato Hash",
        description: "Crisp cubed potatoes with onion and garlic. Good under a fried egg.",
        image: "assets/images/Potato Hash.jpg",
        category: "Vegetable",
        cookingTime: 25,
        difficulty: "Easy",
        ingredients: [
            ing("potato", "essential"),
            ing("onion", "important"),
            ing("garlic", "important"),
            ing("salt", "optional"),
            ing("pepper", "optional"),
            ing("oil", "optional")
        ],
        instructions: [
            "Dice the potatoes small and dry them with a towel.",
            "Fry in a single layer without stirring for five minutes.",
            "Turn, add the onion and garlic, and cook until everything browns.",
            "Season generously with salt and pepper."
        ],
        tags: ["budget", "vegetable", "breakfast"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.2,
        ratingCount: 118,
        dateCreated: "2026-07-23T09:00:00.000Z"
    },
    {
        id: "REC021",
        title: "Egg Fried Rice",
        description: "The two-ingredient dinner. Rice and egg, with garlic and soy sauce doing the rest.",
        image: "assets/images/Egg Fried Rice.jpg",
        category: "Rice",
        cookingTime: 15,
        difficulty: "Easy",
        ingredients: [
            ing("rice", "essential"),
            ing("egg", "essential"),
            ing("garlic", "important"),
            ing("soy sauce", "important"),
            ing("spring onion", "optional"),
            ing("oil", "optional")
        ],
        instructions: [
            "Beat the eggs and pour them into a very hot oiled pan.",
            "Add the rice while the egg is still wet so it coats the grains.",
            "Toss constantly for three minutes.",
            "Add the garlic and soy sauce, then finish with spring onion."
        ],
        tags: ["rice", "quick", "budget", "asian"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.5,
        ratingCount: 268,
        dateCreated: "2026-07-26T09:00:00.000Z"
    },
    {
        id: "REC022",
        title: "Chicken Stir Fry",
        description: "Chicken and vegetables cooked fast in one pan with a simple soy glaze.",
        image: "assets/images/Chicken Stir Fry.jpg",
        category: "Chicken",
        cookingTime: 25,
        difficulty: "Easy",
        ingredients: [
            ing("chicken", "essential"),
            ing("soy sauce", "essential"),
            ing("garlic", "important"),
            ing("onion", "important"),
            ing("carrot", "important"),
            ing("bell pepper", "optional"),
            ing("oil", "optional")
        ],
        instructions: [
            "Slice the chicken thin so it cooks in minutes.",
            "Sear the chicken in a hot pan and remove it once browned.",
            "Stir fry the garlic, onion, carrot and bell pepper.",
            "Return the chicken, add the soy sauce, and toss until glazed."
        ],
        tags: ["asian", "chicken", "quick"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.5,
        ratingCount: 178,
        dateCreated: "2026-07-29T09:00:00.000Z"
    },
    {
        id: "REC023",
        title: "Tomato and Egg Stir Fry",
        description: "Soft scrambled egg folded into sweet cooked tomato. Serve it over hot rice.",
        image: "assets/images/Tomato and Egg Stir Fry.jpg",
        category: "Egg",
        cookingTime: 15,
        difficulty: "Easy",
        ingredients: [
            ing("egg", "essential"),
            ing("tomato", "essential"),
            ing("garlic", "important"),
            ing("onion", "important"),
            ing("salt", "optional"),
            ing("sugar", "optional")
        ],
        instructions: [
            "Scramble the eggs until barely set and remove them from the pan.",
            "Cook the garlic, onion and tomato until saucy.",
            "Add a pinch of sugar to balance the acidity.",
            "Fold the eggs back in and turn off the heat immediately."
        ],
        tags: ["asian", "egg", "quick", "budget"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.4,
        ratingCount: 136,
        dateCreated: "2026-08-01T09:00:00.000Z"
    },
    {
        id: "REC024",
        title: "Tuna Rice Bowl",
        description: "Canned tuna, hot rice and a soft egg in one bowl. Fifteen minutes, one plate to wash.",
        image: "assets/images/Tuna Rice Bowl.jpg",
        category: "Rice",
        cookingTime: 15,
        difficulty: "Easy",
        ingredients: [
            ing("rice", "essential"),
            ing("tuna", "essential"),
            ing("egg", "important"),
            ing("soy sauce", "important"),
            ing("spring onion", "optional"),
            ing("mayonnaise", "optional")
        ],
        instructions: [
            "Warm the tuna in a pan with a splash of soy sauce.",
            "Fry an egg with crisp edges and a runny centre.",
            "Pile hot rice into a bowl and spoon the tuna over it.",
            "Top with the egg, spring onion and a line of mayonnaise."
        ],
        tags: ["rice", "quick", "budget"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.3,
        ratingCount: 108,
        dateCreated: "2026-08-04T09:00:00.000Z"
    },
    {
        id: "REC025",
        title: "Ginisang Munggo",
        description: "Mung beans simmered soft with garlic, tomato and a little pork for flavour.",
        image: "assets/images/Ginisang Munggo.jpg",
        category: "Soup",
        cookingTime: 45,
        difficulty: "Easy",
        ingredients: [
            ing("mung beans", "essential"),
            ing("garlic", "important"),
            ing("onion", "important"),
            ing("tomato", "important"),
            ing("pork", "optional"),
            ing("spinach", "optional"),
            ing("fish sauce", "optional")
        ],
        instructions: [
            "Boil the mung beans until they burst and thicken, about 30 minutes.",
            "Saute the garlic, onion and tomato in a separate pan with the pork.",
            "Combine the two pots and season with fish sauce.",
            "Add the spinach at the very end and serve hot."
        ],
        tags: ["filipino", "budget", "soup", "healthy"],
        authorId: null,
        authorName: "S.A.N.G.K.A.P. Kitchen",
        communityRecipe: false,
        rating: 4.4,
        ratingCount: 149,
        dateCreated: "2026-08-07T09:00:00.000Z"
    },

    /* ----- community uploads that ship with the prototype ----- */
    {
        id: "REC026",
        title: "Creamy Tuna Macaroni",
        description: "My rainy-day version of macaroni salad, served warm instead of chilled.",
        image: "assets/images/Creamy Tuna Macaroni.webp",
        category: "Pasta",
        cookingTime: 30,
        difficulty: "Easy",
        ingredients: [
            ing("pasta", "essential"),
            ing("tuna", "essential"),
            ing("milk", "important"),
            ing("onion", "important"),
            ing("carrot", "optional"),
            ing("cheese", "optional")
        ],
        instructions: [
            "Boil the macaroni until soft, then drain.",
            "Cook the onion and carrot until soft, then add the tuna.",
            "Pour in the milk and let it reduce slightly.",
            "Fold in the macaroni and cheese and serve warm."
        ],
        tags: ["pasta", "budget", "community"],
        authorId: "USR001",
        authorName: "Maria Santos",
        communityRecipe: true,
        rating: 4.6,
        ratingCount: 46,
        dateCreated: "2026-08-22T10:30:00.000Z"
    },
    {
        id: "REC027",
        title: "Budget Egg Curry Rice",
        description: "Curry powder, egg and rice. This got me through the last two weeks of the semester.",
        image: "assets/images/Egg Curry and Cumin rice.jpg",
        category: "Rice",
        cookingTime: 25,
        difficulty: "Easy",
        ingredients: [
            ing("rice", "essential"),
            ing("egg", "essential"),
            ing("curry powder", "important"),
            ing("onion", "important"),
            ing("garlic", "important"),
            ing("coconut milk", "optional")
        ],
        instructions: [
            "Boil the eggs and set them aside.",
            "Saute the onion and garlic, then bloom the curry powder in the oil.",
            "Add a splash of water or coconut milk and simmer into a sauce.",
            "Halve the eggs, lay them on rice, and spoon the sauce over."
        ],
        tags: ["budget", "asian", "quick", "community"],
        authorId: "USR002",
        authorName: "Andrei Cruz",
        communityRecipe: true,
        rating: 4.4,
        ratingCount: 28,
        dateCreated: "2026-08-27T14:10:00.000Z"
    },
    {
        id: "REC028",
        title: "Tofu Sisig",
        description: "All of the crunch and sourness of sisig without the pork. Works with firm tofu only.",
        image: "assets/images/Tofu Sisig.jpg",
        category: "Vegetable",
        cookingTime: 35,
        difficulty: "Medium",
        ingredients: [
            ing("tofu", "essential"),
            ing("onion", "important"),
            ing("garlic", "important"),
            ing("soy sauce", "important"),
            ing("calamansi", "optional"),
            ing("chili", "optional"),
            ing("mayonnaise", "optional")
        ],
        instructions: [
            "Press the tofu dry, cube it, and fry until every side is crisp.",
            "Saute the onion, garlic and chili.",
            "Return the tofu and season with soy sauce and calamansi.",
            "Finish with a spoon of mayonnaise off the heat."
        ],
        tags: ["filipino", "vegetable", "community"],
        authorId: "USR003",
        authorName: "Liza Ramos",
        communityRecipe: true,
        rating: 4.7,
        ratingCount: 34,
        dateCreated: "2026-09-02T11:45:00.000Z"
    },
    {
        id: "REC029",
        title: "Five-Ingredient Chicken Sopas",
        description: "Creamy chicken macaroni soup made with pantry items when the rain will not stop.",
        image: "assets/images/Five-Ingredient Chicken Sopas.jpg",
        category: "Soup",
        cookingTime: 40,
        difficulty: "Easy",
        ingredients: [
            ing("chicken", "essential"),
            ing("macaroni", "essential"),
            ing("milk", "important"),
            ing("carrot", "important"),
            ing("onion", "important"),
            ing("cabbage", "optional")
        ],
        instructions: [
            "Boil the chicken, then shred it and keep the broth.",
            "Cook the onion and carrot in a pot, then pour the broth back in.",
            "Add the macaroni and simmer until tender.",
            "Stir in the milk and cabbage and heat through without boiling."
        ],
        tags: ["filipino", "soup", "budget", "community"],
        authorId: "USR004",
        authorName: "Kenji Bautista",
        communityRecipe: true,
        rating: 4.5,
        ratingCount: 21,
        dateCreated: "2026-09-06T09:20:00.000Z"
    },
    {
        id: "REC030",
        title: "Leftover Rice Pancake",
        description: "Turns yesterday's rice into a crisp savoury pancake. Good with ketchup, better with vinegar.",
        image: "assets/images/Leftover Rice Pancake.jpg",
        category: "Snack",
        cookingTime: 15,
        difficulty: "Easy",
        ingredients: [
            ing("rice", "essential"),
            ing("egg", "essential"),
            ing("flour", "important"),
            ing("spring onion", "optional"),
            ing("salt", "optional"),
            ing("oil", "optional")
        ],
        instructions: [
            "Mash the cold rice with the egg and flour until it holds together.",
            "Stir in the spring onion and salt.",
            "Press thin rounds into an oiled pan.",
            "Fry both sides until deep golden and crisp at the edges."
        ],
        tags: ["quick", "budget", "snack", "community"],
        authorId: "USR005",
        authorName: "Grace Villanueva",
        communityRecipe: true,
        rating: 4.2,
        ratingCount: 12,
        dateCreated: "2026-09-10T16:05:00.000Z"
    }
];

/* Sample ratings so profiles and averages are not empty on a fresh install. */
const DEFAULT_RATINGS = [
    { id: "RATE001", recipeId: "REC026", userId: "USR002", rating: 5, dateCreated: "2026-08-24T10:00:00.000Z" },
    { id: "RATE002", recipeId: "REC026", userId: "USR003", rating: 4, dateCreated: "2026-08-25T10:00:00.000Z" },
    { id: "RATE003", recipeId: "REC027", userId: "USR001", rating: 5, dateCreated: "2026-08-28T10:00:00.000Z" },
    { id: "RATE004", recipeId: "REC028", userId: "USR004", rating: 5, dateCreated: "2026-09-03T10:00:00.000Z" },
    { id: "RATE005", recipeId: "REC028", userId: "USR005", rating: 4, dateCreated: "2026-09-04T10:00:00.000Z" },
    { id: "RATE006", recipeId: "REC029", userId: "USR002", rating: 4, dateCreated: "2026-09-07T10:00:00.000Z" },
    { id: "RATE007", recipeId: "REC030", userId: "USR003", rating: 4, dateCreated: "2026-09-11T10:00:00.000Z" },
    { id: "RATE008", recipeId: "REC010", userId: "USR001", rating: 5, dateCreated: "2026-08-12T10:00:00.000Z" },
    { id: "RATE009", recipeId: "REC001", userId: "USR004", rating: 5, dateCreated: "2026-08-14T10:00:00.000Z" },
    { id: "RATE010", recipeId: "REC019", userId: "USR005", rating: 4, dateCreated: "2026-08-16T10:00:00.000Z" },
    { id: "RATE011", recipeId: "REC021", userId: "USR002", rating: 5, dateCreated: "2026-08-18T10:00:00.000Z" },
    { id: "RATE012", recipeId: "REC017", userId: "USR003", rating: 4, dateCreated: "2026-08-20T10:00:00.000Z" }
];

/* Sample favorites. */
const DEFAULT_FAVORITES = [
    { userId: "USR001", recipeId: "REC010", dateSaved: "2026-08-12T10:05:00.000Z" },
    { userId: "USR001", recipeId: "REC019", dateSaved: "2026-08-13T10:05:00.000Z" },
    { userId: "USR002", recipeId: "REC001", dateSaved: "2026-08-15T10:05:00.000Z" },
    { userId: "USR003", recipeId: "REC026", dateSaved: "2026-08-26T10:05:00.000Z" }
];

/* ---------------------------------------------------------------
   Initialisation
   --------------------------------------------------------------- */

/**
 * Adds the two bookkeeping fields used by the rating system.
 * baseRatingTotal and baseRatingCount hold the seeded demo ratings so that
 * real ratings entered by users can be added on top of them instead of
 * replacing them.
 */
function prepareRecipeRecord(recipe) {
    const prepared = Object.assign({}, recipe);
    const count = Number(prepared.ratingCount) || 0;
    const average = Number(prepared.rating) || 0;
    prepared.baseRatingCount = count;
    prepared.baseRatingTotal = Math.round(average * count * 10) / 10;
    return prepared;
}

/**
 * Writes the sample data, but only for collections that do not exist yet.
 * Existing accounts, uploads, ratings and favorites are never overwritten.
 */
function initializeDatabase() {
    if (loadFromLocalStorage(SANGKAP_KEYS.USERS, null) === null) {
        saveToLocalStorage(SANGKAP_KEYS.USERS, DEFAULT_USERS);
    }
    if (loadFromLocalStorage(SANGKAP_KEYS.RECIPES, null) === null) {
        saveToLocalStorage(SANGKAP_KEYS.RECIPES, DEFAULT_RECIPES.map(prepareRecipeRecord));
    }
    if (loadFromLocalStorage(SANGKAP_KEYS.RATINGS, null) === null) {
        saveToLocalStorage(SANGKAP_KEYS.RATINGS, DEFAULT_RATINGS);
    }
    if (loadFromLocalStorage(SANGKAP_KEYS.FAVORITES, null) === null) {
        saveToLocalStorage(SANGKAP_KEYS.FAVORITES, DEFAULT_FAVORITES);
    }
    return loadDatabase();
}

/**
 * Reads all four collections at once and refreshes the in-memory snapshot.
 */
function loadDatabase() {
    database.users = loadFromLocalStorage(SANGKAP_KEYS.USERS, []);
    database.recipes = loadFromLocalStorage(SANGKAP_KEYS.RECIPES, []);
    database.ratings = loadFromLocalStorage(SANGKAP_KEYS.RATINGS, []);
    database.favorites = loadFromLocalStorage(SANGKAP_KEYS.FAVORITES, []);
    return database;
}

/**
 * Writes all four collections at once.
 */
function saveDatabase(data) {
    const next = data || database;
    saveToLocalStorage(SANGKAP_KEYS.USERS, next.users || []);
    saveToLocalStorage(SANGKAP_KEYS.RECIPES, next.recipes || []);
    saveToLocalStorage(SANGKAP_KEYS.RATINGS, next.ratings || []);
    saveToLocalStorage(SANGKAP_KEYS.FAVORITES, next.favorites || []);
}

/**
 * Builds the next unused id for a collection, for example USR006 or REC031.
 */
function generateId(prefix, records) {
    const list = Array.isArray(records) ? records : [];
    const numbers = list
        .map(function (record) {
            const digits = String(record.id || "").replace(prefix, "");
            return parseInt(digits, 10);
        })
        .filter(function (value) {
            return !isNaN(value);
        });

    const next = numbers.length > 0 ? Math.max.apply(null, numbers) + 1 : 1;
    return prefix + String(next).padStart(3, "0");
}

/* ---------------------------------------------------------------
   Users
   --------------------------------------------------------------- */
function getUsers() {
    return loadFromLocalStorage(SANGKAP_KEYS.USERS, []);
}

function saveUsers(users) {
    return saveToLocalStorage(SANGKAP_KEYS.USERS, users);
}

function getUserById(userId) {
    if (!userId) {
        return null;
    }
    return getUsers().find(function (user) {
        return user.id === userId;
    }) || null;
}

function getUserByUsername(username) {
    const needle = String(username || "").trim().toLowerCase();
    if (!needle) {
        return null;
    }
    return getUsers().find(function (user) {
        return String(user.username).toLowerCase() === needle;
    }) || null;
}

function getUserByEmail(email) {
    const needle = String(email || "").trim().toLowerCase();
    if (!needle) {
        return null;
    }
    return getUsers().find(function (user) {
        return String(user.email).toLowerCase() === needle;
    }) || null;
}

/**
 * Stores a new account. Validation happens in auth.js before this is called.
 */
function createUser(details) {
    const users = getUsers();
    const user = {
        id: generateId("USR", users),
        username: details.username,
        email: details.email,
        password: details.password,
        displayName: details.displayName || details.username,
        profileImage: details.profileImage || "",
        dateCreated: new Date().toISOString(),
        role: "user"
    };

    users.push(user);
    saveUsers(users);
    return user;
}

function updateUser(userId, changes) {
    const users = getUsers();
    const index = users.findIndex(function (user) {
        return user.id === userId;
    });

    if (index === -1) {
        return null;
    }

    users[index] = Object.assign({}, users[index], changes);
    saveUsers(users);
    return users[index];
}

/* ---------------------------------------------------------------
   Recipes
   --------------------------------------------------------------- */
function getRecipes() {
    return loadFromLocalStorage(SANGKAP_KEYS.RECIPES, []);
}

function saveRecipes(recipes) {
    return saveToLocalStorage(SANGKAP_KEYS.RECIPES, recipes);
}

function getRecipeById(recipeId) {
    if (!recipeId) {
        return null;
    }
    return getRecipes().find(function (recipe) {
        return recipe.id === recipeId;
    }) || null;
}

/**
 * Adds a recipe built by submit-recipe.html. New uploads start with no
 * ratings at all, so their average is genuinely zero until someone rates them.
 */
function addRecipe(recipe) {
    const recipes = getRecipes();
    const record = Object.assign({}, recipe, {
        id: generateId("REC", recipes),
        rating: 0,
        ratingCount: 0,
        baseRatingTotal: 0,
        baseRatingCount: 0,
        dateCreated: new Date().toISOString()
    });

    recipes.push(record);
    saveRecipes(recipes);
    return record;
}

function updateRecipe(recipeId, changes) {
    const recipes = getRecipes();
    const index = recipes.findIndex(function (recipe) {
        return recipe.id === recipeId;
    });

    if (index === -1) {
        return null;
    }

    recipes[index] = Object.assign({}, recipes[index], changes);
    saveRecipes(recipes);
    return recipes[index];
}

/**
 * Removes a recipe together with the ratings and favorites that point at it,
 * so no orphan records are left behind.
 */
function deleteRecipe(recipeId) {
    const recipes = getRecipes().filter(function (recipe) {
        return recipe.id !== recipeId;
    });
    saveRecipes(recipes);

    const ratings = getRatings().filter(function (rating) {
        return rating.recipeId !== recipeId;
    });
    saveRatings(ratings);

    const favorites = getFavorites().filter(function (favorite) {
        return favorite.recipeId !== recipeId;
    });
    saveFavorites(favorites);

    return true;
}

/* ---------------------------------------------------------------
   Ratings and favorites
   The logic that uses these lives in ratings.js and favorites.js.
   --------------------------------------------------------------- */
function getRatings() {
    return loadFromLocalStorage(SANGKAP_KEYS.RATINGS, []);
}

function saveRatings(ratings) {
    return saveToLocalStorage(SANGKAP_KEYS.RATINGS, ratings);
}

function getFavorites() {
    return loadFromLocalStorage(SANGKAP_KEYS.FAVORITES, []);
}

function saveFavorites(favorites) {
    return saveToLocalStorage(SANGKAP_KEYS.FAVORITES, favorites);
}

/* The database is prepared as soon as this file loads, before any page script
   asks for data. */
initializeDatabase();
