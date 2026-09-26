/*
    S.A.N.G.K.A.P. - sponsored.js

    Mock restaurant placements for the prototype. They are always labelled
    Sponsored and are never mixed into the recipe results, so a paid listing
    can never be mistaken for a community recipe.

    No payment processing of any kind is part of this project.
*/

const SPONSORED_DISHES = [
    {
        id: "SP001",
        restaurant: "Mama's Kitchen",
        dish: "Chicken Teriyaki Bowl",
        price: 149,
        image: "assets/images/Chicken Teriyaki Bowl.jpg",
        description: "Chicken teriyaki served over rice with pickled cucumber.",
        ingredients: ["chicken", "rice", "soy sauce"],
        sponsored: true
    },
    {
        id: "SP002",
        restaurant: "Lutong Bahay Express",
        dish: "Pork Adobo Rice Meal",
        price: 129,
        image: "assets/images/Pork Adobo Rice Meal.jpg",
        description: "Slow-cooked pork adobo with two cups of rice.",
        ingredients: ["pork", "rice", "soy sauce", "vinegar"],
        sponsored: true
    },
    {
        id: "SP003",
        restaurant: "Noodle Corner",
        dish: "Garlic Beef Noodles",
        price: 165,
        image: "assets/images/Garlic Beef Noodles.jpg",
        description: "Hand-pulled noodles tossed with beef and toasted garlic.",
        ingredients: ["beef", "noodles", "garlic"],
        sponsored: true
    },
    {
        id: "SP004",
        restaurant: "Tita's Silogan",
        dish: "Tapsilog Plate",
        price: 139,
        image: "assets/images/sponsored-silog.svg",
        description: "Beef tapa, garlic rice and a sunny side up egg.",
        ingredients: ["beef", "rice", "egg", "garlic"],
        sponsored: true
    },
    {
        id: "SP005",
        restaurant: "Green Bowl Cafe",
        dish: "Vegetable Stir Fry Bowl",
        price: 119,
        image: "assets/images/sponsored-veg.svg",
        description: "Cabbage, carrot and tofu stir fried to order over rice.",
        ingredients: ["cabbage", "carrot", "garlic", "rice"],
        sponsored: true
    },
    {
        id: "SP006",
        restaurant: "Pasta Pronto",
        dish: "Creamy Tuna Pasta",
        price: 159,
        image: "assets/images/sponsored-pasta.svg",
        description: "Tuna and garlic cream sauce over fettuccine.",
        ingredients: ["pasta", "tuna", "garlic"],
        sponsored: true
    }
];

/**
 * Sorts the sponsored list by how many basket ingredients each dish shares.
 * With an empty basket the original order is kept.
 */
function getSponsoredMatches(basket, limit) {
    const basketSet = buildBasketSet(basket);
    const size = limit || 3;

    const scored = SPONSORED_DISHES.map(function (item) {
        const overlap = item.ingredients.filter(function (name) {
            return basketSet.has(normalizeIngredient(name));
        });
        return { item: item, shared: overlap };
    });

    if (basketSet.size > 0) {
        scored.sort(function (a, b) {
            return b.shared.length - a.shared.length;
        });
    }

    return scored.slice(0, size);
}

/**
 * Renders sponsored cards into a container. Safe to call with a missing
 * container so pages can share this function freely.
 */
function renderSponsoredSection(container, basket, limit) {
    if (!container) {
        return;
    }

    const matches = getSponsoredMatches(basket, limit);

    container.innerHTML = matches
        .map(function (entry) {
            const item = entry.item;
            const sharedNote = entry.shared.length
                ? "Matches " + entry.shared.map(titleCase).join(", ") + " in your basket"
                : "Near you today";

            return (
                '<article class="sponsored-card">' +
                '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.dish) + '" loading="lazy">' +
                '<div class="sponsored-card__body">' +
                '<span class="badge badge--sponsored">Sponsored</span>' +
                '<h3 class="sponsored-card__dish">' + escapeHtml(item.dish) + "</h3>" +
                '<p class="sponsored-card__meta">' + escapeHtml(item.restaurant) +
                ' <span class="sponsored-card__price">PHP ' + item.price + "</span></p>" +
                '<p class="sponsored-card__meta">' + escapeHtml(sharedNote) + "</p>" +
                "</div>" +
                "</article>"
            );
        })
        .join("");
}
