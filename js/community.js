/*
    S.A.N.G.K.A.P. - community.js

    The Community page and the recipe upload form.
    Uploaded recipes are stored in the same recipe table as the built-in ones,
    so they are searchable, ratable, and part of ingredient matching straight
    away.
*/

function getCommunityRecipes() {
    return getRecipes().filter(function (recipe) {
        return recipe.communityRecipe === true;
    });
}

/**
 * Trending balances how good a recipe is, how many people rated it, and how
 * recently it was posted, so a new recipe is not buried by older favourites.
 */
function calculateTrendingScore(recipe) {
    const rating = Number(recipe.rating) || 0;
    const count = Number(recipe.ratingCount) || 0;
    const quality = rating * Math.log10(count + 1);

    const ageInDays = Math.max(0, (Date.now() - new Date(recipe.dateCreated).getTime()) / 86400000);
    const freshness = 1 / (1 + ageInDays / 30);

    return quality * (0.7 + 0.6 * freshness);
}

function sortCommunityRecipes(recipes, mode) {
    const list = (recipes || []).slice();

    if (mode === "rated") {
        return list.sort(function (a, b) {
            return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        });
    }
    if (mode === "newest") {
        return list.sort(function (a, b) {
            return new Date(b.dateCreated) - new Date(a.dateCreated);
        });
    }
    if (mode === "quick") {
        return list.sort(function (a, b) {
            return (Number(a.cookingTime) || 0) - (Number(b.cookingTime) || 0);
        });
    }

    return list.sort(function (a, b) {
        return calculateTrendingScore(b) - calculateTrendingScore(a);
    });
}

function filterCommunityRecipes(recipes, filters) {
    const settings = filters || {};
    return (recipes || []).filter(function (recipe) {
        return recipePassesFilters(recipe, settings) && recipeMatchesSearch(recipe, settings.search);
    });
}

function renderCommunityRecipes(container, recipes) {
    if (!recipes || recipes.length === 0) {
        renderEmptyState(
            container,
            "No community recipes are available yet.",
            "Be the first to share what you cooked this week.",
            "Share a Recipe",
            "submit-recipe.html"
        );
        return;
    }
    renderRecipeCards(container, recipes, { showMatch: false });
}

/* ---------------------------------------------------------------
   community.html
   --------------------------------------------------------------- */
function initCommunityPage() {
    const grid = document.getElementById("communityGrid");
    const countLabel = document.getElementById("communityCount");
    const searchInput = document.getElementById("communitySearch");
    const shareButton = document.getElementById("shareRecipeButton");

    const state = { sort: "trending", tags: [], search: "" };

    function render() {
        const filtered = filterCommunityRecipes(getCommunityRecipes(), state);
        const sorted = sortCommunityRecipes(filtered, state.sort);

        countLabel.textContent = sorted.length + (sorted.length === 1 ? " recipe" : " recipes");
        renderCommunityRecipes(grid, sorted);
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
            const position = state.tags.indexOf(value);

            if (position === -1) {
                state.tags.push(value);
                button.classList.add("is-active");
            } else {
                state.tags.splice(position, 1);
                button.classList.remove("is-active");
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

    /* Guests can see the button, but it asks for an account instead of
       opening the form. */
    if (shareButton) {
        shareButton.addEventListener("click", function (event) {
            if (!requireLogin("share a recipe with the community")) {
                event.preventDefault();
            }
        });
    }

    render();
}

/* ---------------------------------------------------------------
   submit-recipe.html
   --------------------------------------------------------------- */

/**
 * Reads the ingredient and instruction rows out of the form.
 */
function collectRecipeFormData() {
    const ingredients = [];
    document.querySelectorAll("#ingredientRows .builder-row").forEach(function (row) {
        const name = row.querySelector(".ingredient-name").value.trim();
        const importance = row.querySelector(".ingredient-importance").value;
        if (name) {
            ingredients.push(ing(name.toLowerCase(), importance));
        }
    });

    const instructions = [];
    document.querySelectorAll("#stepRows .builder-row").forEach(function (row) {
        const text = row.querySelector(".step-text").value.trim();
        if (text) {
            instructions.push(text);
        }
    });

    const tags = document.getElementById("recipeTags").value
        .split(",")
        .map(function (tag) {
            return tag.trim().toLowerCase();
        })
        .filter(function (tag) {
            return tag.length > 0;
        });

    return {
        title: document.getElementById("recipeName").value.trim(),
        description: document.getElementById("recipeDescription").value.trim(),
        image: document.getElementById("recipeImage").value.trim(),
        category: document.getElementById("recipeCategory").value,
        cookingTime: Number(document.getElementById("recipeTime").value),
        difficulty: document.getElementById("recipeDifficulty").value,
        ingredients: ingredients,
        instructions: instructions,
        tags: tags
    };
}

function validateRecipeData(data) {
    if (data.title.length < 3) {
        return "Give the recipe a name of at least 3 characters.";
    }
    if (data.description.length < 10) {
        return "Write a short description so people know what the dish is.";
    }
    if (!data.category) {
        return "Choose a category.";
    }
    if (!(data.cookingTime > 0)) {
        return "Enter the cooking time in minutes.";
    }
    if (!data.difficulty) {
        return "Choose a difficulty level.";
    }
    if (data.ingredients.length === 0) {
        return "Add at least one ingredient.";
    }
    if (data.instructions.length === 0) {
        return "Add at least one instruction step.";
    }
    return "";
}

/**
 * Saves a new community recipe for the signed-in user.
 */
function submitCommunityRecipe(data, user) {
    const problem = validateRecipeData(data);
    if (problem) {
        return { success: false, message: problem };
    }

    const recipe = addRecipe({
        title: data.title,
        description: data.description,
        image: data.image || "assets/images/placeholder.svg",
        category: data.category,
        cookingTime: data.cookingTime,
        difficulty: data.difficulty,
        ingredients: data.ingredients,
        instructions: data.instructions,
        tags: data.tags,
        authorId: user.id,
        authorName: user.displayName,
        communityRecipe: true
    });

    return { success: true, message: "Recipe shared.", recipe: recipe };
}

function initSubmitRecipePage() {
    const lock = document.getElementById("submitLock");
    const panel = document.getElementById("submitPanel");

    /* Access control happens on page load, not only on the button. */
    if (!isLoggedIn()) {
        lock.hidden = false;
        panel.hidden = true;
        return;
    }

    lock.hidden = true;
    panel.hidden = false;

    const user = getCurrentUser();
    const form = document.getElementById("recipeForm");
    const errorBox = document.getElementById("submitError");
    const ingredientRows = document.getElementById("ingredientRows");
    const stepRows = document.getElementById("stepRows");
    const editId = getQueryParam("edit");

    const REMOVE_ICON =
        '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1.3 0 6 4.7 10.7 0 12 1.3 7.3 6 12 10.7 10.7 12 6 7.3 1.3 12 0 10.7 4.7 6 0 1.3z"/></svg>';

    function addIngredientRow(name, importance) {
        const row = document.createElement("div");
        row.className = "builder-row";
        row.innerHTML =
            '<input type="text" class="input ingredient-name" placeholder="Ingredient, for example garlic" value="' +
            escapeHtml(name || "") + '">' +
            '<select class="select ingredient-importance">' +
            '<option value="essential">Essential</option>' +
            '<option value="important">Important</option>' +
            '<option value="optional">Optional</option>' +
            "</select>" +
            '<button type="button" class="icon-btn" aria-label="Remove ingredient">' + REMOVE_ICON + "</button>";

        row.querySelector(".ingredient-importance").value = importance || "essential";
        row.querySelector(".icon-btn").addEventListener("click", function () {
            if (ingredientRows.children.length > 1) {
                row.remove();
            } else {
                showNotification("A recipe needs at least one ingredient.", "error");
            }
        });

        ingredientRows.appendChild(row);
    }

    function addStepRow(text) {
        const row = document.createElement("div");
        row.className = "builder-row builder-row--step";
        row.innerHTML =
            '<span class="builder-row__index"></span>' +
            '<textarea class="textarea step-text" placeholder="Describe this step"></textarea>' +
            '<button type="button" class="icon-btn" aria-label="Remove step">' + REMOVE_ICON + "</button>";

        row.querySelector(".step-text").value = text || "";
        row.querySelector(".icon-btn").addEventListener("click", function () {
            if (stepRows.children.length > 1) {
                row.remove();
                renumberSteps();
            } else {
                showNotification("A recipe needs at least one step.", "error");
            }
        });

        stepRows.appendChild(row);
        renumberSteps();
    }

    function renumberSteps() {
        Array.prototype.forEach.call(stepRows.children, function (row, index) {
            row.querySelector(".builder-row__index").textContent = String(index + 1);
        });
    }

    document.getElementById("addIngredientRow").addEventListener("click", function () {
        addIngredientRow("", "essential");
    });

    document.getElementById("addStepRow").addEventListener("click", function () {
        addStepRow("");
    });

    /* Edit mode reuses this same form. */
    let editing = null;

    if (editId) {
        editing = getRecipeById(editId);

        if (!editing) {
            showNotification("That recipe could not be found.", "error");
        } else if (editing.authorId !== user.id) {
            showNotification("You can only edit recipes that you uploaded.", "error");
            editing = null;
            window.location.href = "recipe-details.html?id=" + encodeURIComponent(editId);
            return;
        }
    }

    if (editing) {
        document.getElementById("formTitle").textContent = "Edit your recipe";
        document.getElementById("formIntro").textContent =
            "Changes appear on the Community page and in ingredient matching as soon as you save.";
        document.getElementById("formSubmitButton").textContent = "Save Changes";

        document.getElementById("recipeName").value = editing.title;
        document.getElementById("recipeDescription").value = editing.description;
        document.getElementById("recipeImage").value = editing.image === "assets/images/placeholder.svg" ? "" : editing.image;
        document.getElementById("recipeCategory").value = editing.category;
        document.getElementById("recipeTime").value = editing.cookingTime;
        document.getElementById("recipeDifficulty").value = editing.difficulty;
        document.getElementById("recipeTags").value = (editing.tags || []).join(", ");

        (editing.ingredients || []).forEach(function (item) {
            addIngredientRow(item.name, item.importance);
        });
        (editing.instructions || []).forEach(function (step) {
            addStepRow(step);
        });
    } else {
        addIngredientRow("", "essential");
        addIngredientRow("", "important");
        addStepRow("");
        addStepRow("");
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        errorBox.textContent = "";

        const data = collectRecipeFormData();

        if (editing) {
            const problem = validateRecipeData(data);
            if (problem) {
                errorBox.textContent = problem;
                return;
            }

            updateRecipe(editing.id, {
                title: data.title,
                description: data.description,
                image: data.image || "assets/images/placeholder.svg",
                category: data.category,
                cookingTime: data.cookingTime,
                difficulty: data.difficulty,
                ingredients: data.ingredients,
                instructions: data.instructions,
                tags: data.tags
            });

            setFlashMessage("Your recipe was updated.", "success");
            window.location.href = "recipe-details.html?id=" + encodeURIComponent(editing.id);
            return;
        }

        const result = submitCommunityRecipe(data, user);

        if (!result.success) {
            errorBox.textContent = result.message;
            return;
        }

        setFlashMessage(result.recipe.title + " is now live in the community.", "success");
        window.location.href = "community.html";
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const page = document.body.getAttribute("data-page");
    if (page === "community") {
        initCommunityPage();
    }
    if (page === "submit-recipe") {
        initSubmitRecipePage();
    }
});
