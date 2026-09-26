

function getAllRecipes() {
    return getRecipes();
}

/**
 * Reads recipe-details.html?id=REC001 and returns the record, or null when the
 * id is missing or points at something that no longer exists.
 */
function getRecipeFromQueryString() {
    const id = getQueryParam("id");
    if (!id) {
        return null;
    }
    return getRecipeById(id);
}

function recipeMatchesSearch(recipe, term) {
    const words = String(term || "")
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(function (word) {
            return word.length > 0;
        });

    if (words.length === 0) {
        return true;
    }

    const haystack = [
        recipe.title,
        recipe.description,
        recipe.category,
        recipe.authorName,
        (recipe.tags || []).join(" "),
        (recipe.ingredients || [])
            .map(function (item) {
                return item.name;
            })
            .join(" ")
    ]
        .join(" ")
        .toLowerCase();

    /* Every word must appear somewhere, so "chicken rice" finds a recipe whose
       title and ingredient list each hold one of the words. */
    return words.every(function (word) {
        return haystack.indexOf(word) !== -1;
    });
}

function searchRecipes(recipes, term) {
    return (recipes || []).filter(function (recipe) {
        return recipeMatchesSearch(recipe, term);
    });
}

/**
 * filters looks like { tags: ["budget"], difficulty: "Easy" }.
 */
function recipePassesFilters(recipe, filters) {
    const settings = filters || {};
    const tags = (recipe.tags || []).map(function (tag) {
        return String(tag).toLowerCase();
    });

    if (settings.difficulty && String(recipe.difficulty).toLowerCase() !== settings.difficulty.toLowerCase()) {
        return false;
    }

    return (settings.tags || []).every(function (tag) {
        return tags.indexOf(String(tag).toLowerCase()) !== -1;
    });
}

function filterRecipes(recipes, filters) {
    return (recipes || []).filter(function (recipe) {
        return recipePassesFilters(recipe, filters);
    });
}

/* ---------------------------------------------------------------
   Cards
   --------------------------------------------------------------- */

/**
 * Builds one recipe card.
 * entry may be a plain recipe or a recommendation object produced by
 * sortRecipeRecommendations().
 */
function createRecipeCardHtml(entry, options) {
    const settings = options || {};
    const recipe = entry.recipe ? entry.recipe : entry;
    const link = "recipe-details.html?id=" + encodeURIComponent(recipe.id);
    const image = recipe.image || "assets/images/placeholder.svg";
    const rating = Number(recipe.rating) || 0;
    const ratingCount = Number(recipe.ratingCount) || 0;

    let matchBlock = "";
    let badge = "";
    let scoreLine = "";

    if (settings.showMatch && entry.status) {
        badge = '<span class="badge badge--' + entry.status.key + ' recipe-card__flag">' +
            escapeHtml(entry.status.label) + "</span>";

        matchBlock =
            '<div>' +
            '<div class="match-row"><span>' + entry.match + "% Ingredient Match</span></div>" +
            '<div class="meter"><div class="meter__fill' +
            (entry.status.key === "ready" ? " is-ready" : entry.status.key === "almost" ? " is-almost" : "") +
            '" data-meter="' + entry.match + '"></div></div>' +
            "</div>";

        scoreLine = '<p class="recipe-card__score">Recommendation Score: ' + entry.score.toFixed(1) + "</p>";
    }

    const ratingLine = ratingCount > 0
        ? '<span class="rating-line">' + renderStars(rating) + "<strong>" + rating.toFixed(1) + "</strong></span>"
        : '<span class="rating-line">Not yet rated</span>';

    return (
        '<article class="recipe-card">' +
        '<a class="recipe-card__media" href="' + link + '">' +
        '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(recipe.title) + '" loading="lazy">' +
        badge +
        "</a>" +
        '<div class="recipe-card__body">' +
        '<div class="pill-row">' +
        '<span class="pill">' + escapeHtml(recipe.category) + "</span>" +
        '<span class="pill">' + escapeHtml(recipe.difficulty) + "</span>" +
        (recipe.communityRecipe ? '<span class="pill pill--leaf">Community</span>' : "") +
        "</div>" +
        '<h3 class="recipe-card__title"><a href="' + link + '">' + escapeHtml(recipe.title) + "</a></h3>" +
        '<p class="recipe-card__desc">' + escapeHtml(recipe.description) + "</p>" +
        matchBlock +
        '<ul class="recipe-card__stats">' +
        "<li>" + ratingLine + "</li>" +
        "<li>" + ratingCount + (ratingCount === 1 ? " rating" : " ratings") + "</li>" +
        "<li>" + formatMinutes(recipe.cookingTime) + "</li>" +
        "</ul>" +
        '<p class="recipe-card__author">By ' + escapeHtml(recipe.authorName || "S.A.N.G.K.A.P. Kitchen") + "</p>" +
        scoreLine +
        '<a class="btn btn--outline btn--block" href="' + link + '">View Recipe</a>' +
        "</div>" +
        "</article>"
    );
}

/**
 * Paints a list of cards into a container and applies the match meters.
 */
function renderRecipeCards(container, entries, options) {
    if (!container) {
        return;
    }

    if (!entries || entries.length === 0) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = entries
        .map(function (entry) {
            return createRecipeCardHtml(entry, options);
        })
        .join("");

    applyMeters(container);
}

/**
 * Shared empty state block.
 */
function renderEmptyState(container, title, text, actionLabel, actionHref) {
    if (!container) {
        return;
    }

    const action = actionLabel
        ? '<a class="btn btn--primary" href="' + actionHref + '">' + escapeHtml(actionLabel) + "</a>"
        : "";

    container.innerHTML =
        '<div class="empty"><h3>' + escapeHtml(title) + "</h3><p>" + escapeHtml(text) + "</p>" + action + "</div>";
}

/* ---------------------------------------------------------------
   recipes.html
   --------------------------------------------------------------- */
function initRecipesPage() {
    const results = document.getElementById("recipeResults");
    const countLabel = document.getElementById("resultsCount");
    const searchInput = document.getElementById("recipeSearch");
    const basketStrip = document.getElementById("basketStrip");
    const basketNotice = document.getElementById("basketNotice");

    const state = {
        sort: "best",
        tags: [],
        difficulty: "",
        search: ""
    };

    function renderBasketStrip() {
        const basket = getBasket();

        if (basket.length === 0) {
            basketStrip.innerHTML = "";
            basketStrip.hidden = true;
            basketNotice.hidden = false;
            return;
        }

        basketStrip.hidden = false;
        basketNotice.hidden = true;
        basketStrip.innerHTML =
            '<span class="toolbar__label">Your basket</span>' +
            basket
                .map(function (item) {
                    return '<span class="chip chip--static">' + escapeHtml(titleCase(item)) + "</span>";
                })
                .join("") +
            '<a class="btn btn--quiet btn--small" href="basket.html">Edit Basket</a>';
    }

    function render() {
        const basket = getBasket();
        let entries = sortRecipeRecommendations(getAllRecipes(), basket);

        entries = entries.filter(function (entry) {
            return recipePassesFilters(entry.recipe, state) && recipeMatchesSearch(entry.recipe, state.search);
        });

        if (state.sort === "rated") {
            entries.sort(function (a, b) {
                return (Number(b.recipe.rating) || 0) - (Number(a.recipe.rating) || 0);
            });
        } else if (state.sort === "quick") {
            entries.sort(function (a, b) {
                return (Number(a.recipe.cookingTime) || 0) - (Number(b.recipe.cookingTime) || 0);
            });
        }

        if (entries.length === 0) {
            countLabel.textContent = "";
            renderEmptyState(
                results,
                "No strong recipe match was found.",
                "Try adding more ingredients or explore recipes from the community.",
                "Explore Community",
                "community.html"
            );
            return;
        }

        countLabel.textContent =
            entries.length + (entries.length === 1 ? " recipe" : " recipes") +
            (basket.length > 0 ? " scored against " + basket.length + " ingredients" : "");

        renderRecipeCards(results, entries, { showMatch: basket.length > 0 });
    }

    document.querySelectorAll("[data-sort]").forEach(function (button) {
        button.addEventListener("click", function () {
            state.sort = button.getAttribute("data-sort");
            document.querySelectorAll("[data-sort]").forEach(function (other) {
                other.classList.toggle("is-active", other === button);
            });
            render();
        });
    });

    document.querySelectorAll("[data-filter]").forEach(function (button) {
        button.addEventListener("click", function () {
            const value = button.getAttribute("data-filter");
            const isDifficulty = button.getAttribute("data-filter-type") === "difficulty";

            if (isDifficulty) {
                state.difficulty = state.difficulty === value ? "" : value;
                button.classList.toggle("is-active", state.difficulty === value);
            } else {
                const position = state.tags.indexOf(value);
                if (position === -1) {
                    state.tags.push(value);
                    button.classList.add("is-active");
                } else {
                    state.tags.splice(position, 1);
                    button.classList.remove("is-active");
                }
            }

            render();
        });
    });

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            state.search = searchInput.value;
            render();
        });
    }

    renderBasketStrip();
    render();

    /* Sponsored dishes are matched to the same basket. */
    renderSponsoredSection(document.getElementById("sponsoredResults"), getBasket(), 3);
}

document.addEventListener("DOMContentLoaded", function () {
    if (document.body.getAttribute("data-page") === "recipes") {
        initRecipesPage();
    }
});
