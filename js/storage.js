/*
    S.A.N.G.K.A.P. - storage.js

    Every read and write to localStorage in this project goes through this file.
    Nothing else should call localStorage directly, so that corrupted or missing
    data is handled in exactly one place.
*/

/* All localStorage keys used by the prototype. */
const SANGKAP_KEYS = {
    USERS: "sangkap_users",
    RECIPES: "sangkap_recipes",
    RATINGS: "sangkap_ratings",
    FAVORITES: "sangkap_favorites",
    SESSION: "sangkap_session",
    BASKET: "sangkap_basket",
    FLASH: "sangkap_flash"
};

/**
 * Some browsers block localStorage (private mode, disabled cookies).
 * Checking once keeps the rest of the app from throwing.
 */
function isStorageAvailable() {
    try {
        const probe = "sangkap_probe";
        window.localStorage.setItem(probe, "1");
        window.localStorage.removeItem(probe);
        return true;
    } catch (error) {
        console.warn("S.A.N.G.K.A.P.: localStorage is not available in this browser.", error);
        return false;
    }
}

/**
 * Saves any JavaScript value as JSON. Returns true when the write succeeded.
 */
function saveToLocalStorage(key, data) {
    if (!isStorageAvailable()) {
        return false;
    }
    try {
        window.localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.warn("S.A.N.G.K.A.P.: could not save data for key " + key + ".", error);
        return false;
    }
}

/**
 * Reads JSON back out of localStorage.
 * If the stored text is missing or malformed the fallback value is returned
 * instead, and the broken entry is cleared so the site keeps working.
 */
function loadFromLocalStorage(key, fallback) {
    if (!isStorageAvailable()) {
        return fallback;
    }

    const raw = window.localStorage.getItem(key);
    if (raw === null) {
        return fallback;
    }

    try {
        const parsed = JSON.parse(raw);
        if (parsed === null || parsed === undefined) {
            return fallback;
        }
        return parsed;
    } catch (error) {
        console.warn(
            "S.A.N.G.K.A.P.: the data stored under " + key + " was unreadable, " +
            "so the fallback value was used instead.",
            error
        );
        window.localStorage.removeItem(key);
        return fallback;
    }
}

/**
 * Removes a single key. Used by logout and by Clear Basket.
 */
function removeFromLocalStorage(key) {
    if (!isStorageAvailable()) {
        return false;
    }
    try {
        window.localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.warn("S.A.N.G.K.A.P.: could not remove key " + key + ".", error);
        return false;
    }
}
