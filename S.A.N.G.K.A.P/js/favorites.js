/*
    S.A.N.G.K.A.P. - favorites.js

    A favorite is stored as:

        { userId, recipeId, dateSaved }

    Only registered users can save. Guests see the login modal instead.
*/

function getUserFavorites(userId) {
    if (!userId) {
        return [];
    }
    return getFavorites().filter(function (favorite) {
        return favorite.userId === userId;
    });
}

function isFavorite(userId, recipeId) {
    if (!userId) {
        return false;
    }
    return getFavorites().some(function (favorite) {
        return favorite.userId === userId && favorite.recipeId === recipeId;
    });
}

/**
 * Saves a recipe. The duplicate check happens here, not in the page code.
 */
function addFavorite(userId, recipeId) {
    if (isFavorite(userId, recipeId)) {
        return false;
    }

    const favorites = getFavorites();
    favorites.push({
        userId: userId,
        recipeId: recipeId,
        dateSaved: new Date().toISOString()
    });
    saveFavorites(favorites);
    return true;
}

function removeFavorite(userId, recipeId) {
    const favorites = getFavorites().filter(function (favorite) {
        return !(favorite.userId === userId && favorite.recipeId === recipeId);
    });
    saveFavorites(favorites);
    return true;
}

function toggleFavorite(userId, recipeId) {
    if (isFavorite(userId, recipeId)) {
        removeFavorite(userId, recipeId);
        return false;
    }
    addFavorite(userId, recipeId);
    return true;
}

/**
 * The full recipe records a user has saved, newest first.
 * Recipes that were deleted in the meantime are skipped.
 */
function getUserFavoriteRecipes(userId) {
    return getUserFavorites(userId)
        .slice()
        .sort(function (a, b) {
            return new Date(b.dateSaved) - new Date(a.dateSaved);
        })
        .map(function (favorite) {
            return getRecipeById(favorite.recipeId);
        })
        .filter(function (recipe) {
            return Boolean(recipe);
        });
}

/**
 * Connects the Save Recipe button on the details page.
 */
function bindSaveButton(button, recipeId) {
    if (!button) {
        return;
    }

    function paint() {
        const user = getCurrentUser();
        const saved = user ? isFavorite(user.id, recipeId) : false;

        button.textContent = saved ? "Saved" : "Save Recipe";
        button.classList.toggle("btn--primary", !saved);
        button.classList.toggle("btn--outline", saved);
        button.setAttribute("aria-pressed", saved ? "true" : "false");
    }

    button.addEventListener("click", function () {
        if (!requireLogin("save recipes to your profile")) {
            return;
        }

        const user = getCurrentUser();
        const nowSaved = toggleFavorite(user.id, recipeId);
        paint();
        showNotification(nowSaved ? "Recipe saved to your profile." : "Recipe removed from your saved list.", "success");
    });

    paint();
}
