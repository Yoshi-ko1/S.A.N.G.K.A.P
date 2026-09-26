/*
    S.A.N.G.K.A.P. - ratings.js

    Ratings are stored as their own records:

        { id, recipeId, userId, rating, dateCreated }

    A recipe keeps a running average in recipe.rating and recipe.ratingCount.
    The sample recipes ship with seeded demo ratings held in baseRatingTotal
    and baseRatingCount, and real ratings are added on top of those numbers,
    so nothing displayed on screen is invented.
*/

const STAR_PATH =
    "M12 2.2l2.9 6.05 6.6.9-4.8 4.6 1.2 6.55L12 17.2l-5.9 3.1 1.2-6.55-4.8-4.6 6.6-.9z";

/**
 * Read-only star row used on cards and headers.
 */
function renderStars(rating) {
    const value = Math.max(0, Math.min(5, Number(rating) || 0));
    let full = Math.floor(value);
    const remainder = value - full;
    let half = false;

    if (remainder >= 0.75) {
        full += 1;
    } else if (remainder >= 0.25) {
        half = true;
    }

    let markup = '<span class="stars" role="img" aria-label="Rating ' + value.toFixed(1) + ' out of 5">';

    for (let index = 0; index < 5; index += 1) {
        let className = "star--empty";
        if (index < full) {
            className = "star--full";
        } else if (index === full && half) {
            className = "star--half";
        }
        markup +=
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="' +
            className +
            '" d="' +
            STAR_PATH +
            '"></path></svg>';
    }

    return markup + "</span>";
}

function getRecipeRatings(recipeId) {
    return getRatings().filter(function (rating) {
        return rating.recipeId === recipeId;
    });
}

function getUserRating(userId, recipeId) {
    if (!userId) {
        return null;
    }
    return getRatings().find(function (rating) {
        return rating.userId === userId && rating.recipeId === recipeId;
    }) || null;
}

function getUserRatingsCount(userId) {
    return getRatings().filter(function (rating) {
        return rating.userId === userId;
    }).length;
}

/**
 * Average rating for one recipe, rounded to one decimal place.
 * Seeded demo ratings and real user ratings are combined here.
 */
function calculateRecipeRating(recipeId) {
    const recipe = getRecipeById(recipeId);
    if (!recipe) {
        return { average: 0, count: 0 };
    }

    const baseCount = Number(recipe.baseRatingCount) || 0;
    const baseTotal = Number(recipe.baseRatingTotal) || 0;

    const userRatings = getRecipeRatings(recipeId);
    const userTotal = userRatings.reduce(function (sum, item) {
        return sum + (Number(item.rating) || 0);
    }, 0);

    const count = baseCount + userRatings.length;
    if (count === 0) {
        return { average: 0, count: 0 };
    }

    const average = Math.round(((baseTotal + userTotal) / count) * 10) / 10;
    return { average: average, count: count };
}

/**
 * Writes the freshly calculated average back onto the recipe record so that
 * the Community, Featured and results pages all read the same numbers.
 */
function syncRecipeRating(recipeId) {
    const result = calculateRecipeRating(recipeId);
    updateRecipe(recipeId, { rating: result.average, ratingCount: result.count });
    return result;
}

/**
 * Runs once per page load. Only writes when something actually changed.
 */
function syncAllRecipeRatings() {
    const recipes = getRecipes();
    const ratings = getRatings();
    let changed = false;

    const updated = recipes.map(function (recipe) {
        const baseCount = Number(recipe.baseRatingCount) || 0;
        const baseTotal = Number(recipe.baseRatingTotal) || 0;

        const own = ratings.filter(function (rating) {
            return rating.recipeId === recipe.id;
        });
        const ownTotal = own.reduce(function (sum, item) {
            return sum + (Number(item.rating) || 0);
        }, 0);

        const count = baseCount + own.length;
        const average = count === 0 ? 0 : Math.round(((baseTotal + ownTotal) / count) * 10) / 10;

        if (recipe.rating !== average || recipe.ratingCount !== count) {
            changed = true;
            return Object.assign({}, recipe, { rating: average, ratingCount: count });
        }
        return recipe;
    });

    if (changed) {
        saveRecipes(updated);
    }
}

function addRating(recipeId, userId, value) {
    const ratings = getRatings();
    const record = {
        id: generateId("RATE", ratings),
        recipeId: recipeId,
        userId: userId,
        rating: Number(value),
        dateCreated: new Date().toISOString()
    };

    ratings.push(record);
    saveRatings(ratings);
    return record;
}

function updateRating(ratingId, value) {
    const ratings = getRatings();
    const index = ratings.findIndex(function (rating) {
        return rating.id === ratingId;
    });

    if (index === -1) {
        return null;
    }

    ratings[index].rating = Number(value);
    ratings[index].dateCreated = new Date().toISOString();
    saveRatings(ratings);
    return ratings[index];
}

/**
 * One rating per user per recipe. Rating again replaces the old score
 * instead of adding a second record.
 */
function submitRating(recipeId, userId, value) {
    const score = Number(value);

    if (!recipeId || !userId) {
        return { success: false, message: "That rating could not be saved." };
    }
    if (!(score >= 1 && score <= 5)) {
        return { success: false, message: "Choose a rating between 1 and 5." };
    }

    const existing = getUserRating(userId, recipeId);
    let replaced = false;

    if (existing) {
        updateRating(existing.id, score);
        replaced = true;
    } else {
        addRating(recipeId, userId, score);
    }

    const result = syncRecipeRating(recipeId);

    return {
        success: true,
        replaced: replaced,
        message: replaced ? "Your rating was updated." : "Thanks for rating this recipe.",
        average: result.average,
        count: result.count
    };
}

/**
 * Builds the five clickable stars.
 * Guests can click them, but the login modal opens instead of a rating
 * being stored.
 */
function renderRatingWidget(container, recipeId, onRated) {
    if (!container) {
        return;
    }

    const user = getCurrentUser();
    const existing = user ? getUserRating(user.id, recipeId) : null;
    let currentValue = existing ? Number(existing.rating) : 0;

    container.innerHTML = "";

    const stars = document.createElement("div");
    stars.className = "rate-stars";

    const note = document.createElement("p");
    note.className = "rating-note";

    function paint(value) {
        Array.prototype.forEach.call(stars.children, function (button, index) {
            button.classList.toggle("is-on", index < value);
        });
    }

    function describe() {
        if (!user) {
            note.textContent = "Log in to rate this recipe.";
        } else if (currentValue) {
            note.textContent = "You rated this recipe " + currentValue + " out of 5. Choose again to change it.";
        } else {
            note.textContent = "Select a star to rate this recipe.";
        }
    }

    for (let index = 1; index <= 5; index += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "rate-star";
        button.setAttribute("aria-label", "Rate " + index + " out of 5");
        button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR_PATH + '"></path></svg>';

        button.addEventListener("mouseenter", function () {
            paint(index);
        });

        button.addEventListener("focus", function () {
            paint(index);
        });

        button.addEventListener("click", function () {
            if (!requireLogin("rate this recipe")) {
                paint(currentValue);
                return;
            }

            const active = getCurrentUser();
            const result = submitRating(recipeId, active.id, index);

            if (!result.success) {
                showNotification(result.message, "error");
                return;
            }

            currentValue = index;
            paint(currentValue);
            describe();
            showNotification(result.message, "success");

            if (typeof onRated === "function") {
                onRated(result);
            }
        });

        stars.appendChild(button);
    }

    stars.addEventListener("mouseleave", function () {
        paint(currentValue);
    });

    container.appendChild(stars);
    container.appendChild(note);
    paint(currentValue);
    describe();
}
