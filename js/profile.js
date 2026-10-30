/*
    S.A.N.G.K.A.P. - profile.js

    profile.html?id=USR001 shows any member's public profile.
    Editing controls only appear when the signed-in user owns the profile.

    getUserRatingsCount() lives in ratings.js since it works on the ratings
    table; it is used here for the statistics row.
*/

/**
 * Every recipe uploaded by one member, newest first.
 * The link is recipe.authorId, not the copied author name.
 */
function getUserRecipes(userId) {
    return getRecipes()
        .filter(function (recipe) {
            return recipe.authorId === userId;
        })
        .sort(function (a, b) {
            return new Date(b.dateCreated) - new Date(a.dateCreated);
        });
}

function getUserFavoritesCount(userId) {
    return getUserFavorites(userId).length;
}

/**
 * Decides whose profile to show: the id in the address bar, or the signed-in
 * user when no id was given.
 */
function loadProfile() {
    const id = getQueryParam("id");
    if (id) {
        return getUserById(id);
    }
    return getCurrentUser();
}

function updateProfile(userId, changes) {
    const displayName = String(changes.displayName || "").trim();

    if (displayName.length < 2) {
        return { success: false, message: "Your display name needs at least 2 characters." };
    }

    const user = updateUser(userId, {
        displayName: displayName,
        profileImage: String(changes.profileImage || "").trim()
    });

    if (!user) {
        return { success: false, message: "That profile could not be updated." };
    }

    /* Recipe cards show a copied author name, so refresh those too. */
    getUserRecipes(userId).forEach(function (recipe) {
        updateRecipe(recipe.id, { authorName: displayName });
    });

    return { success: true, message: "Your profile was updated.", user: user };
}

function renderProfile(user) {
    const root = document.getElementById("profileRoot");
    const current = getCurrentUser();
    const isOwner = Boolean(current && current.id === user.id);

    const avatar = user.profileImage || "assets/images/avatar.svg";

    root.innerHTML =
        '<div class="profile-head">' +
        '<img class="profile-head__avatar" src="' + escapeHtml(avatar) +
        '" alt="' + escapeHtml(user.displayName) + '" data-fallback="assets/images/avatar.svg">' +
        "<div>" +
        "<h1>" + escapeHtml(user.displayName) + "</h1>" +
        '<p class="profile-head__handle">' + escapeHtml(user.username) + "</p>" +
        '<p class="small muted">' + escapeHtml(formatJoinDate(user.dateCreated)) + "</p>" +
        (isOwner ? '<button type="button" class="btn btn--outline btn--small" id="editProfileButton">Edit Profile</button>' : "") +
        "</div>" +
        "</div>";
}

function renderProfileStats(user) {
    const stats = document.getElementById("profileStats");
    const recipes = getUserRecipes(user.id).length;
    const ratings = getUserRatingsCount(user.id);
    const saved = getUserFavoritesCount(user.id);

    stats.innerHTML =
        '<div class="stat"><span class="stat__value">' + recipes + '</span><span class="stat__label">Recipes submitted</span></div>' +
        '<div class="stat"><span class="stat__value">' + ratings + '</span><span class="stat__label">Ratings given</span></div>' +
        '<div class="stat"><span class="stat__value">' + saved + '</span><span class="stat__label">Recipes saved</span></div>';
}

function initProfilePage() {
    const root = document.getElementById("profileRoot");
    const user = loadProfile();

    if (!user) {
        const id = getQueryParam("id");
        root.innerHTML =
            '<div class="empty"><h3>' + (id ? "User not found." : "No profile to show.") + "</h3>" +
            "<p>" + (id
                ? "That profile is not in the database."
                : "Log in to see your own profile, or open a profile from any community recipe.") +
            "</p>" +
            '<div class="btn-row"><a class="btn btn--primary" href="login.html">Login</a>' +
            '<a class="btn btn--outline" href="community.html">Visit the community</a></div></div>';

        document.getElementById("profileStats").hidden = true;
        document.getElementById("recipesSection").hidden = true;
        return;
    }

    const current = getCurrentUser();
    const isOwner = Boolean(current && current.id === user.id);

    renderProfile(user);
    renderProfileStats(user);

    /* Uploaded recipes */
    document.getElementById("recipesTitle").textContent =
        isOwner ? "Your recipes" : "Recipes by " + user.displayName;

    const recipes = getUserRecipes(user.id);
    if (recipes.length === 0) {
        renderEmptyState(
            document.getElementById("profileRecipes"),
            isOwner ? "You have not shared a recipe yet." : "No recipes shared yet.",
            isOwner
                ? "Upload the first one and it joins ingredient matching immediately."
                : "This member has not uploaded a recipe so far.",
            isOwner ? "Share a Recipe" : "",
            "submit-recipe.html"
        );
    } else {
        renderRecipeCards(document.getElementById("profileRecipes"), recipes, { showMatch: false });
    }

    /* Saved recipes are private, so only the owner sees the list. */
    const savedSection = document.getElementById("savedSection");
    if (isOwner) {
        savedSection.hidden = false;
        const saved = getUserFavoriteRecipes(user.id);

        if (saved.length === 0) {
            renderEmptyState(
                document.getElementById("savedRecipes"),
                "You have not saved any recipes yet.",
                "Open any recipe and choose Save Recipe to keep it here.",
                "Browse recipes",
                "recipes.html"
            );
        } else {
            renderRecipeCards(document.getElementById("savedRecipes"), saved, { showMatch: false });
        }
    }

    /* Editing, owner only. */
    const editPanel = document.getElementById("profileEdit");
    const editButton = document.getElementById("editProfileButton");

    if (isOwner && editButton && editPanel) {
        const nameField = document.getElementById("editDisplayName");
        const imageField = document.getElementById("editImage");
        const errorBox = document.getElementById("editError");

        editButton.addEventListener("click", function () {
            if (!requireLogin("edit your profile")) {
                return;
            }
            nameField.value = user.displayName;
            imageField.value = user.profileImage || "";
            editPanel.hidden = !editPanel.hidden;
        });

        document.getElementById("cancelEdit").addEventListener("click", function () {
            editPanel.hidden = true;
            errorBox.textContent = "";
        });

        document.getElementById("profileEditForm").addEventListener("submit", function (event) {
            event.preventDefault();
            errorBox.textContent = "";

            const result = updateProfile(user.id, {
                displayName: nameField.value,
                profileImage: imageField.value
            });

            if (!result.success) {
                errorBox.textContent = result.message;
                return;
            }

            setFlashMessage(result.message, "success");
            window.location.reload();
        });
    }
}

document.addEventListener("DOMContentLoaded", function () {
    if (document.body.getAttribute("data-page") === "profile") {
        initProfilePage();
    }
});
