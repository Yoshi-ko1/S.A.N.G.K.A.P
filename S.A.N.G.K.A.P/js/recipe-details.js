/*
    S.A.N.G.K.A.P. - recipe-details.js

    Reads recipe-details.html?id=REC001, then draws the recipe together with
    the Available and Missing ingredient lists worked out from the basket.
*/

function renderIngredientItem(ingredient, state) {
    const note = state === "available"
        ? "Available"
        : state === "missing"
            ? "Missing"
            : titleCase(ingredient.importance);

    const modifier = state ? " ing--" + state : "";

    return (
        '<li class="ing' + modifier + '">' +
        '<span class="ing__name">' + escapeHtml(ingredient.name) + "</span>" +
        '<span class="ing__note">' + escapeHtml(note) + " (weight " + ingredient.weight + ")</span>" +
        "</li>"
    );
}

function buildIngredientPanels(recipe, basket, match) {
    if (basket.length === 0) {
        return (
            '<div class="panel">' +
            '<h2 class="panel__title">Ingredients</h2>' +
            '<ul class="ing-list">' +
            recipe.ingredients.map(function (item) {
                return renderIngredientItem(item, "");
            }).join("") +
            "</ul>" +
            '<p class="small muted">Fill your basket to see which of these you already have.</p>' +
            "</div>"
        );
    }

    const availableList = match.available.length
        ? '<ul class="ing-list">' + match.available.map(function (item) {
            return renderIngredientItem(item, "available");
        }).join("") + "</ul>"
        : '<p class="small muted">None of your basket ingredients are used in this recipe.</p>';

    const missingList = match.missing.length
        ? '<ul class="ing-list">' + match.missing.map(function (item) {
            return renderIngredientItem(item, "missing");
        }).join("") + "</ul>"
        : '<p class="small muted">Nothing is missing. You can cook this now.</p>';

    return (
        '<div class="panel">' +
        '<h2 class="panel__title">Available Ingredients</h2>' +
        availableList +
        '<h2 class="panel__title">Missing Ingredients</h2>' +
        missingList +
        "</div>"
    );
}

function initRecipeDetailsPage() {
    const root = document.getElementById("detailRoot");
    const relatedSection = document.getElementById("relatedSection");
    const recipe = getRecipeFromQueryString();

    if (!recipe) {
        root.innerHTML =
            '<div class="empty"><h3>Recipe not found.</h3>' +
            "<p>The recipe you asked for is not in the database. It may have been removed by its author.</p>" +
            '<div class="btn-row"><a class="btn btn--primary" href="recipes.html">Browse recipes</a>' +
            '<a class="btn btn--outline" href="community.html">Visit the community</a></div></div>';
        return;
    }

    const basket = getBasket();
    const match = calculateIngredientMatch(recipe, basket);
    const status = getMatchStatus(match.percent);
    const score = calculateRecommendationScore(recipe, match.percent);
    const user = getCurrentUser();
    const isOwner = Boolean(user && recipe.authorId && recipe.authorId === user.id);

    const authorLink = recipe.authorId
        ? '<a href="profile.html?id=' + encodeURIComponent(recipe.authorId) + '">' +
          escapeHtml(recipe.authorName) + "</a>"
        : escapeHtml(recipe.authorName || "S.A.N.G.K.A.P. Kitchen");

    const matchPanel = basket.length
        ? '<div class="panel panel--warm">' +
          '<div class="match-row"><span>' + match.percent + "% Ingredient Match</span>" +
          '<span class="badge badge--' + status.key + '">' + escapeHtml(status.label) + "</span></div>" +
          '<div class="meter"><div class="meter__fill' +
          (status.key === "ready" ? " is-ready" : status.key === "almost" ? " is-almost" : "") +
          '" data-meter="' + match.percent + '"></div></div>' +
          '<p class="small muted">Matched weight ' + match.matchedWeight + " of " + match.totalWeight +
          ". Recommendation Score: " + score.toFixed(1) + "</p>" +
          "</div>"
        : "";

    const ownerActions = isOwner
        ? '<a class="btn btn--outline" href="submit-recipe.html?edit=' + encodeURIComponent(recipe.id) + '">Edit Recipe</a>' +
          '<button type="button" class="btn btn--danger" id="deleteRecipe">Delete Recipe</button>'
        : "";

    const ratingCount = Number(recipe.ratingCount) || 0;

    root.innerHTML =
        '<div class="detail">' +
        '<div class="detail__media">' +
        '<img src="' + escapeHtml(recipe.image || "assets/images/placeholder.svg") +
        '" alt="' + escapeHtml(recipe.title) + '">' +
        "</div>" +
        "<div>" +
        '<div class="pill-row">' +
        '<span class="pill pill--accent">' + escapeHtml(recipe.category) + "</span>" +
        (recipe.communityRecipe ? '<span class="pill pill--leaf">Community recipe</span>' : '<span class="pill">Kitchen recipe</span>') +
        "</div>" +
        '<h1 class="detail__title">' + escapeHtml(recipe.title) + "</h1>" +
        '<p class="detail__byline">By ' + authorLink + ", posted " + escapeHtml(formatDate(recipe.dateCreated)) + "</p>" +
        '<p>' + escapeHtml(recipe.description) + "</p>" +
        '<div class="detail-meta">' +
        "<div><span>Rating</span><strong>" +
        (ratingCount ? (Number(recipe.rating) || 0).toFixed(1) : "Not yet rated") + "</strong></div>" +
        "<div><span>Ratings</span><strong>" + ratingCount + "</strong></div>" +
        "<div><span>Cooking time</span><strong>" + formatMinutes(recipe.cookingTime) + "</strong></div>" +
        "<div><span>Difficulty</span><strong>" + escapeHtml(recipe.difficulty) + "</strong></div>" +
        "</div>" +
        matchPanel +
        '<div class="detail-actions">' +
        '<button type="button" class="btn btn--primary" id="saveRecipe">Save Recipe</button>' +
        '<a class="btn btn--outline" href="basket.html">Edit My Basket</a>' +
        ownerActions +
        "</div>" +
        "</div>" +
        "</div>" +
        '<div class="two-col section">' +
        buildIngredientPanels(recipe, basket, match) +
        '<div class="panel">' +
        '<h2 class="panel__title">Instructions</h2>' +
        '<ol class="steps">' +
        recipe.instructions.map(function (step) {
            return "<li><span>" + escapeHtml(step) + "</span></li>";
        }).join("") +
        "</ol>" +
        ((recipe.tags || []).length
            ? '<div class="pill-row">' + recipe.tags.map(function (tag) {
                return '<span class="pill">' + escapeHtml(tag) + "</span>";
            }).join("") + "</div>"
            : "") +
        "</div>" +
        "</div>" +
        '<div class="panel section" id="ratingPanel">' +
        '<h2 class="panel__title">Rate this recipe</h2>' +
        '<div class="rating-widget">' +
        '<span class="rating-line" id="ratingSummary"></span>' +
        "</div>" +
        '<div id="ratingWidget"></div>' +
        "</div>";

    applyMeters(root);

    function paintSummary() {
        const fresh = getRecipeById(recipe.id);
        const count = Number(fresh.ratingCount) || 0;
        const summary = document.getElementById("ratingSummary");

        summary.innerHTML = count
            ? renderStars(fresh.rating) + "<strong>Rating: " + (Number(fresh.rating) || 0).toFixed(1) +
              "</strong> from " + count + (count === 1 ? " rating" : " ratings")
            : "No ratings yet. Yours would be the first.";
    }

    paintSummary();
    renderRatingWidget(document.getElementById("ratingWidget"), recipe.id, paintSummary);
    bindSaveButton(document.getElementById("saveRecipe"), recipe.id);

    const deleteButton = document.getElementById("deleteRecipe");
    if (deleteButton) {
        deleteButton.addEventListener("click", function () {
            confirmAction({
                title: "Delete this recipe?",
                message: "This removes " + recipe.title + " along with its ratings and saved copies. It cannot be undone.",
                confirmLabel: "Delete Recipe",
                onConfirm: function () {
                    deleteRecipe(recipe.id);
                    setFlashMessage("The recipe was deleted.", "info");
                    window.location.href = "community.html";
                }
            });
        });
    }

    /* Three more recipes from the same category. */
    const related = getAllRecipes()
        .filter(function (item) {
            return item.category === recipe.category && item.id !== recipe.id;
        })
        .sort(function (a, b) {
            return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        })
        .slice(0, 3);

    if (related.length > 0) {
        relatedSection.hidden = false;
        renderRecipeCards(document.getElementById("relatedGrid"), related, { showMatch: false });
    }
}

document.addEventListener("DOMContentLoaded", function () {
    if (document.body.getAttribute("data-page") === "recipe-details") {
        initRecipeDetailsPage();
    }
});
