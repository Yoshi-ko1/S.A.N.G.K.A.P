/*
    S.A.N.G.K.A.P. - home.js

    The homepage shows previews only. The full systems live on
    basket.html, recipes.html, community.html and featured.html.
*/

const HOME_EXAMPLE_BASKET = ["rice", "egg", "garlic"];

function renderHeroPreview() {
    const chipBox = document.getElementById("heroBasketChips");
    const note = document.getElementById("heroBasketNote");
    const resultBox = document.getElementById("heroResult");

    const basket = getBasket();
    const usingExample = basket.length === 0;
    const working = usingExample ? HOME_EXAMPLE_BASKET : basket;

    note.textContent = usingExample
        ? "An example basket. Yours replaces it as soon as you add something."
        : "Your basket right now.";

    chipBox.innerHTML = working
        .slice(0, 6)
        .map(function (item) {
            return '<li><span class="chip chip--static">' + escapeHtml(titleCase(item)) + "</span></li>";
        })
        .join("");

    const top = sortRecipeRecommendations(getAllRecipes(), working)[0];
    if (!top) {
        resultBox.innerHTML = "";
        return;
    }

    resultBox.innerHTML =
        '<img src="' + escapeHtml(top.recipe.image || "assets/images/placeholder.svg") +
        '" alt="' + escapeHtml(top.recipe.title) + '">' +
        "<div>" +
        '<p class="hero-result__title">' + escapeHtml(top.recipe.title) + "</p>" +
        '<p class="hero-result__meta">' + top.match + "% Ingredient Match, " +
        escapeHtml(top.status.label) + "</p>" +
        "</div>" +
        '<a class="btn btn--outline btn--small" href="recipe-details.html?id=' +
        encodeURIComponent(top.recipe.id) + '">Open</a>';
}

function renderHomeGreeting() {
    const greeting = document.getElementById("heroGreeting");
    if (!greeting) {
        return;
    }

    const user = getCurrentUser();
    greeting.textContent = user ? "Kumusta, " + user.displayName + "." : "Anong lulutuin natin?";
}

function initHomePage() {
    renderHomeGreeting();
    renderHeroPreview();

    const featured = getFeaturedRecipes().slice(0, 3);
    if (featured.length > 0) {
        renderRecipeCards(document.getElementById("featuredPreview"), featured, { showMatch: false });
    } else {
        renderEmptyState(
            document.getElementById("featuredPreview"),
            "Nothing is featured yet.",
            "Recipes appear here once the community has rated them enough times.",
            "Visit Featured",
            "featured.html"
        );
    }

    const community = sortCommunityRecipes(getCommunityRecipes(), "trending").slice(0, 3);
    if (community.length > 0) {
        renderRecipeCards(document.getElementById("communityPreview"), community, { showMatch: false });
    } else {
        renderEmptyState(
            document.getElementById("communityPreview"),
            "No community recipes are available yet.",
            "Share the first one and it will appear here.",
            "Share a Recipe",
            "submit-recipe.html"
        );
    }

    renderSponsoredSection(document.getElementById("sponsoredPreview"), getBasket(), 3);
}

document.addEventListener("DOMContentLoaded", function () {
    if (document.body.getAttribute("data-page") === "index") {
        initHomePage();
    }
});
