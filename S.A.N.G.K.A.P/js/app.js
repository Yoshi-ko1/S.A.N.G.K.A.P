/*
    S.A.N.G.K.A.P. - app.js

    Interface features shared by every page: navigation state, the mobile menu,
    notifications, the login-required modal, image fallbacks and a few small
    formatting helpers.
*/

/* ---------------------------------------------------------------
   Helpers
   --------------------------------------------------------------- */

/**
 * Escapes text before it is placed inside generated markup.
 * Recipe titles and display names come from users, so they are never trusted.
 */
function escapeHtml(value) {
    return String(value === null || value === undefined ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(name);
    return value === null ? "" : value.trim();
}

function titleCase(text) {
    return String(text || "")
        .split(" ")
        .map(function (word) {
            return word ? word.charAt(0).toUpperCase() + word.slice(1) : word;
        })
        .join(" ");
}

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

/**
 * Turns an ISO date into something readable, for example September 14, 2026.
 */
function formatDate(isoString) {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
        return "Unknown date";
    }
    return MONTH_NAMES[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
}

function formatJoinDate(isoString) {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
        return "Joined recently";
    }
    return "Joined " + MONTH_NAMES[date.getMonth()] + " " + date.getFullYear();
}

function formatMinutes(minutes) {
    const value = Number(minutes) || 0;
    if (value < 60) {
        return value + " minutes";
    }
    const hours = Math.floor(value / 60);
    const rest = value % 60;
    const hourLabel = hours + (hours === 1 ? " hour" : " hours");
    return rest ? hourLabel + " " + rest + " minutes" : hourLabel;
}

/**
 * Progress bars carry their value in a data attribute so the stylesheet stays
 * free of inline width declarations. This applies them after rendering.
 */
function applyMeters(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-meter]").forEach(function (element) {
        const percent = Math.max(0, Math.min(100, Number(element.getAttribute("data-meter")) || 0));
        element.style.width = percent + "%";
    });
}

/* ---------------------------------------------------------------
   Notifications
   --------------------------------------------------------------- */
const CLOSE_ICON = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1.3 0 6 4.7 10.7 0 12 1.3 7.3 6 12 10.7 10.7 12 6 7.3 1.3 12 0 10.7 4.7 6 0 1.3z"/></svg>';

function getToastStack() {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
        stack = document.createElement("div");
        stack.className = "toast-stack";
        document.body.appendChild(stack);
    }
    return stack;
}

/**
 * Shows a short message in the corner. Type is success, error or info.
 */
function showNotification(message, type) {
    if (!message) {
        return;
    }

    const toast = document.createElement("div");
    toast.className = "toast toast--" + (type || "info");

    const text = document.createElement("span");
    text.textContent = message;

    const close = document.createElement("button");
    close.className = "toast__close";
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss notification");
    close.innerHTML = CLOSE_ICON;
    close.addEventListener("click", function () {
        toast.remove();
    });

    toast.appendChild(text);
    toast.appendChild(close);
    getToastStack().appendChild(toast);

    window.setTimeout(function () {
        toast.remove();
    }, 5000);
}

/**
 * Stores a message that should appear on the next page, used after redirects.
 */
function setFlashMessage(message, type) {
    saveToLocalStorage(SANGKAP_KEYS.FLASH, { message: message, type: type || "info" });
}

function consumeFlashMessage() {
    const flash = loadFromLocalStorage(SANGKAP_KEYS.FLASH, null);
    if (flash && flash.message) {
        removeFromLocalStorage(SANGKAP_KEYS.FLASH);
        showNotification(flash.message, flash.type);
    }
}

/* ---------------------------------------------------------------
   Modal
   --------------------------------------------------------------- */
function getModalLayer() {
    let layer = document.getElementById("appModal");
    if (layer) {
        return layer;
    }

    layer = document.createElement("div");
    layer.className = "modal-layer";
    layer.id = "appModal";
    layer.innerHTML =
        '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="appModalTitle">' +
        '<h2 class="modal__title" id="appModalTitle"></h2>' +
        '<p class="modal__text"></p>' +
        '<div class="modal__actions"></div>' +
        "</div>";

    layer.addEventListener("click", function (event) {
        if (event.target === layer) {
            closeModal();
        }
    });

    document.body.appendChild(layer);
    return layer;
}

function closeModal() {
    const layer = document.getElementById("appModal");
    if (layer) {
        layer.classList.remove("is-open");
    }
}

/**
 * Opens the shared modal.
 * actions is a list of { label, href, variant, onClick } objects.
 */
function openModal(options) {
    const layer = getModalLayer();
    layer.querySelector(".modal__title").textContent = options.title || "";
    layer.querySelector(".modal__text").textContent = options.message || "";

    const actionBox = layer.querySelector(".modal__actions");
    actionBox.innerHTML = "";

    (options.actions || []).forEach(function (action) {
        const element = document.createElement(action.href ? "a" : "button");
        element.className = "btn " + (action.variant || "btn--outline");
        element.textContent = action.label;

        if (action.href) {
            element.href = action.href;
        } else {
            element.type = "button";
            element.addEventListener("click", function () {
                closeModal();
                if (typeof action.onClick === "function") {
                    action.onClick();
                }
            });
        }

        actionBox.appendChild(element);
    });

    layer.classList.add("is-open");
}

/**
 * The modal guests see when they try to rate, save or upload.
 * It never navigates away on its own.
 */
function showLoginRequiredModal(message) {
    openModal({
        title: "An account is needed",
        message: message || "Create an account or log in to participate in the S.A.N.G.K.A.P. community.",
        actions: [
            { label: "Login", href: "login.html", variant: "btn--primary" },
            { label: "Create Account", href: "register.html", variant: "btn--outline" },
            { label: "Cancel", variant: "btn--quiet" }
        ]
    });
}

/**
 * Simple yes or no confirmation, used before deleting a recipe.
 */
function confirmAction(options) {
    openModal({
        title: options.title || "Are you sure?",
        message: options.message || "",
        actions: [
            {
                label: options.confirmLabel || "Confirm",
                variant: "btn--danger",
                onClick: options.onConfirm
            },
            { label: options.cancelLabel || "Cancel", variant: "btn--quiet" }
        ]
    });
}

/* ---------------------------------------------------------------
   Navigation
   --------------------------------------------------------------- */

/**
 * Highlights the current page and fills the account area based on the session.
 */
function initNavigation() {
    const current = window.location.pathname.split("/").pop() || "index.html";
    const key = current.replace(".html", "");

    document.querySelectorAll("[data-nav]").forEach(function (link) {
        if (link.getAttribute("data-nav") === key) {
            link.classList.add("is-active");
            link.setAttribute("aria-current", "page");
        }
    });

    const toggle = document.getElementById("navToggle");
    const menu = document.getElementById("navMenu");

    if (toggle && menu) {
        toggle.addEventListener("click", function () {
            const open = menu.classList.toggle("is-open");
            toggle.classList.toggle("is-open", open);
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
        });
    }

    renderAccountArea();
}

function renderAccountArea() {
    const box = document.getElementById("navAccount");
    if (!box) {
        return;
    }

    box.innerHTML = "";

    if (isLoggedIn()) {
        const user = getCurrentUser();
        const profile = document.createElement("a");
        profile.href = "profile.html?id=" + (user ? user.id : "");
        profile.className = "btn btn--outline btn--small";
        profile.textContent = "My Profile";

        const logout = document.createElement("button");
        logout.type = "button";
        logout.className = "btn btn--quiet btn--small";
        logout.textContent = "Logout";
        logout.addEventListener("click", logoutUser);

        box.appendChild(profile);
        box.appendChild(logout);
        return;
    }

    if (isAnonymous()) {
        const label = document.createElement("span");
        label.className = "nav__user";
        label.textContent = "Guest";

        const signIn = document.createElement("a");
        signIn.href = "login.html";
        signIn.className = "btn btn--primary btn--small";
        signIn.textContent = "Sign In";

        box.appendChild(label);
        box.appendChild(signIn);
        return;
    }

    const login = document.createElement("a");
    login.href = "login.html";
    login.className = "btn btn--quiet btn--small";
    login.textContent = "Login";

    const register = document.createElement("a");
    register.href = "register.html";
    register.className = "btn btn--primary btn--small";
    register.textContent = "Create Account";

    box.appendChild(login);
    box.appendChild(register);
}

/* ---------------------------------------------------------------
   Images
   --------------------------------------------------------------- */

/**
 * Any image that fails to load, including a broken URL typed into the upload
 * form, is swapped for the local placeholder drawing.
 */
function initImageFallbacks() {
    document.addEventListener(
        "error",
        function (event) {
            const element = event.target;
            if (!element || element.tagName !== "IMG") {
                return;
            }
            if (element.getAttribute("data-fallback-applied") === "true") {
                return;
            }
            element.setAttribute("data-fallback-applied", "true");
            element.src = element.getAttribute("data-fallback") || "assets/images/placeholder.svg";
        },
        true
    );
}

/**
 * Hidden gradient used by half-filled rating stars.
 */
function injectStarGradient() {
    if (document.getElementById("sangkapSvgDefs")) {
        return;
    }
    const wrapper = document.createElement("div");
    wrapper.id = "sangkapSvgDefs";
    wrapper.className = "visually-hidden";
    wrapper.innerHTML =
        '<svg aria-hidden="true" focusable="false"><defs>' +
        '<linearGradient id="sangkapHalfStar" x1="0" x2="1" y1="0" y2="0">' +
        '<stop offset="50%" stop-color="#C9821F"></stop>' +
        '<stop offset="50%" stop-color="#D8C6AA"></stop>' +
        "</linearGradient></defs></svg>";
    document.body.appendChild(wrapper);
}

/* ---------------------------------------------------------------
   Start up
   --------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", function () {
    initImageFallbacks();
    injectStarGradient();
    initNavigation();

    /* Keeps stored averages in step with the ratings table. */
    if (typeof syncAllRecipeRatings === "function") {
        syncAllRecipeRatings();
    }

    consumeFlashMessage();
});
