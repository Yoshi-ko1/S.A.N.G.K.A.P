/*
    S.A.N.G.K.A.P. - basket.js

    The basket is a plain list of normalised ingredient names kept in
    localStorage under sangkap_basket. Guests and registered users use the
    same basket, which is why guests can still get recommendations.
*/

const SUGGESTED_INGREDIENTS = [
    "Rice", "Egg", "Chicken", "Beef", "Pork", "Fish",
    "Onion", "Garlic", "Tomato", "Potato", "Carrot", "Cabbage",
    "Noodles", "Pasta", "Soy Sauce", "Vinegar", "Salt", "Pepper"
];

function getBasket() {
    const stored = loadFromLocalStorage(SANGKAP_KEYS.BASKET, []);
    if (!Array.isArray(stored)) {
        return [];
    }
    return stored.filter(function (item) {
        return typeof item === "string" && item.length > 0;
    });
}

function saveBasket(items) {
    return saveToLocalStorage(SANGKAP_KEYS.BASKET, items);
}

/**
 * Adds one ingredient. Case and spacing are normalised first, so Chicken,
 * chicken and CHICKEN can never appear twice.
 */
function addToBasket(rawName) {
    const name = normalizeIngredient(rawName);

    if (!name) {
        return { success: false, message: "Type an ingredient first." };
    }
    if (name.length > 30) {
        return { success: false, message: "That ingredient name is too long." };
    }

    const basket = getBasket();
    if (basket.indexOf(name) !== -1) {
        return { success: false, message: titleCase(name) + " is already in your basket." };
    }

    basket.push(name);
    saveBasket(basket);
    return { success: true, message: titleCase(name) + " added.", name: name };
}

function removeFromBasket(name) {
    const target = normalizeIngredient(name);
    const basket = getBasket().filter(function (item) {
        return item !== target;
    });
    saveBasket(basket);
    return basket;
}

function clearBasket() {
    removeFromLocalStorage(SANGKAP_KEYS.BASKET);
    return [];
}

/* ---------------------------------------------------------------
   basket.html
   --------------------------------------------------------------- */
function initBasketPage() {
    const form = document.getElementById("basketForm");
    const input = document.getElementById("ingredientInput");
    const chipBox = document.getElementById("basketChips");
    const emptyBox = document.getElementById("basketEmpty");
    const suggestionBox = document.getElementById("suggestedList");
    const clearButton = document.getElementById("clearBasket");
    const findButton = document.getElementById("findDish");
    const countLabel = document.getElementById("basketCount");
    const quickLook = document.getElementById("quickLook");
    const quickLookNote = document.getElementById("quickLookNote");

    const REMOVE_ICON =
        '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1.3 0 6 4.7 10.7 0 12 1.3 7.3 6 12 10.7 10.7 12 6 7.3 1.3 12 0 10.7 4.7 6 0 1.3z"/></svg>';

    function renderSuggestions() {
        const basket = getBasket();

        suggestionBox.innerHTML = SUGGESTED_INGREDIENTS.map(function (label) {
            const picked = basket.indexOf(normalizeIngredient(label)) !== -1;
            return (
                '<li><button type="button" class="chip chip--suggest' +
                (picked ? " is-picked" : "") +
                '" data-suggest="' + escapeHtml(label) + '">' +
                escapeHtml(label) +
                "</button></li>"
            );
        }).join("");
    }

    function renderQuickLook() {
        const basket = getBasket();

        if (basket.length === 0) {
            quickLook.innerHTML = "";
            quickLookNote.textContent = "Add an ingredient to see what comes close.";
            return;
        }

        const top = sortRecipeRecommendations(getAllRecipes(), basket).slice(0, 3);
        quickLookNote.textContent = "Top matches so far.";

        quickLook.innerHTML = top
            .map(function (entry) {
                return (
                    "<li>" +
                    '<img src="' + escapeHtml(entry.recipe.image || "assets/images/placeholder.svg") +
                    '" alt="' + escapeHtml(entry.recipe.title) + '">' +
                    "<span>" +
                    '<a class="quick-look__title" href="recipe-details.html?id=' +
                    encodeURIComponent(entry.recipe.id) + '">' + escapeHtml(entry.recipe.title) + "</a>" +
                    '<span class="quick-look__meta">' + entry.match + "% match, " +
                    escapeHtml(entry.status.label) + "</span>" +
                    "</span>" +
                    "</li>"
                );
            })
            .join("");
    }

    function render() {
        const basket = getBasket();

        countLabel.textContent = String(basket.length);
        emptyBox.hidden = basket.length > 0;

        chipBox.innerHTML = basket
            .map(function (item) {
                return (
                    '<li><span class="chip chip--selected">' +
                    escapeHtml(titleCase(item)) +
                    '<button type="button" class="chip__remove" data-remove="' +
                    escapeHtml(item) +
                    '" aria-label="Remove ' + escapeHtml(titleCase(item)) + '">' +
                    REMOVE_ICON +
                    "</button></span></li>"
                );
            })
            .join("");

        renderSuggestions();
        renderQuickLook();
        renderSponsoredSection(document.getElementById("sponsoredBasket"), basket, 2);
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        const result = addToBasket(input.value);

        if (!result.success) {
            showNotification(result.message, "error");
            return;
        }

        input.value = "";
        input.focus();
        render();
    });

    suggestionBox.addEventListener("click", function (event) {
        const button = event.target.closest("[data-suggest]");
        if (!button) {
            return;
        }

        const label = button.getAttribute("data-suggest");
        const name = normalizeIngredient(label);

        if (getBasket().indexOf(name) !== -1) {
            removeFromBasket(name);
        } else {
            addToBasket(label);
        }

        render();
    });

    chipBox.addEventListener("click", function (event) {
        const button = event.target.closest("[data-remove]");
        if (!button) {
            return;
        }
        removeFromBasket(button.getAttribute("data-remove"));
        render();
    });

    clearButton.addEventListener("click", function () {
        if (getBasket().length === 0) {
            showNotification("Your basket is already empty.", "info");
            return;
        }
        clearBasket();
        render();
        showNotification("Basket cleared.", "info");
    });

    findButton.addEventListener("click", function () {
        if (getBasket().length === 0) {
            showNotification("Add at least one ingredient before searching.", "error");
            return;
        }
        window.location.href = "recipes.html";
    });

    render();
}

document.addEventListener("DOMContentLoaded", function () {
    if (document.body.getAttribute("data-page") === "basket") {
        initBasketPage();
    }
});
