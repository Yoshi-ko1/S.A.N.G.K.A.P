/*
    S.A.N.G.K.A.P. - featured.js

    Featured is decided by the community, not chosen by hand.

        FeaturedScore = Rating x log10(RatingCount + 1)

    A recipe needs at least 10 ratings before it can be featured, so a single
    five-star rating cannot push a brand new recipe to the top. The score is
    always calculated on the spot and never stored.
*/

const FEATURED_MINIMUM_RATINGS = 10;

function calculateFeaturedScore(recipe) {
    return (Number(recipe.rating) || 0) * Math.log10((Number(recipe.ratingCount) || 0) + 1);
}

function getFeaturedRecipes() {
    return getRecipes()
        .filter(function (recipe) {
            return (Number(recipe.ratingCount) || 0) >= FEATURED_MINIMUM_RATINGS;
        })
        .sort(function (a, b) {
            return calculateFeaturedScore(b) - calculateFeaturedScore(a);
        });
}

/**
 * Ranked row used on featured.html.
 */
function createFeaturedRowHtml(recipe, rank) {
    const link = "recipe-details.html?id=" + encodeURIComponent(recipe.id);
    const rating = Number(recipe.rating) || 0;
    const count = Number(recipe.ratingCount) || 0;

    return (
        '<article class="featured-row">' +
        '<div class="featured-rank">' + rank + "</div>" +
        '<a href="' + link + '"><img src="' + escapeHtml(recipe.image || "assets/images/placeholder.svg") +
        '" alt="' + escapeHtml(recipe.title) + '" loading="lazy"></a>' +
        "<div>" +
        "<h3><a href=\"" + link + "\">" + escapeHtml(recipe.title) + "</a></h3>" +
        '<p class="small muted">By ' + escapeHtml(recipe.authorName || "S.A.N.G.K.A.P. Kitchen") +
        ' <span aria-hidden="true">·</span> ' + escapeHtml(recipe.category) +
        ' <span aria-hidden="true">·</span> ' + formatMinutes(recipe.cookingTime) + "</p>" +
        '<span class="rating-line">' + renderStars(rating) +
        "<strong>" + rating.toFixed(1) + "</strong> from " + count + " ratings</span>" +
        "</div>" +
        '<div class="featured-score"><strong>' + calculateFeaturedScore(recipe).toFixed(2) + "</strong>" +
        "<span>Featured Score</span></div>" +
        "</article>"
    );
}

function initFeaturedPage() {
    const list = document.getElementById("featuredList");
    const countLabel = document.getElementById("featuredCount");
    const featured = getFeaturedRecipes();

    if (featured.length === 0) {
        countLabel.textContent = "";
        renderEmptyState(
            list,
            "Nothing is featured yet.",
            "Recipes join this page once they collect at least " + FEATURED_MINIMUM_RATINGS + " ratings.",
            "Browse the community",
            "community.html"
        );
        return;
    }

    countLabel.textContent =
        featured.length + (featured.length === 1 ? " recipe has" : " recipes have") +
        " passed " + FEATURED_MINIMUM_RATINGS + " ratings";

    list.innerHTML = featured
        .map(function (recipe, index) {
            return createFeaturedRowHtml(recipe, index + 1);
        })
        .join("");
}

document.addEventListener("DOMContentLoaded", function () {
    if (document.body.getAttribute("data-page") === "featured") {
        initFeaturedPage();
    }
});
