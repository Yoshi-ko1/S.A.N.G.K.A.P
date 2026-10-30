/*
    S.A.N.G.K.A.P. - api.js
*/

const SangkapAPI = {
    enabled: false,
    lastError: "",

    /** Sends one request. Returns { ok, status, data }. Never throws. */
    call: function (method, path, body) {
        try {
            const xhr = new XMLHttpRequest();
            xhr.open(method, path, false);
            xhr.setRequestHeader("Accept", "application/json");
            if (body !== undefined) {
                xhr.setRequestHeader("Content-Type", "application/json");
            }
            xhr.send(body === undefined ? null : JSON.stringify(body));

            let data = null;
            try { data = JSON.parse(xhr.responseText); } catch (e) { data = null; }

            const ok = xhr.status >= 200 && xhr.status < 300;
            this.lastError = ok ? "" : ((data && data.error) || "The server could not be reached.");
            return { ok: ok, status: xhr.status, data: data };
        } catch (error) {
            this.lastError = "The server could not be reached.";
            return { ok: false, status: 0, data: null };
        }
    },

    /** Copies the database contents into localStorage. Returns true on success. */
    pull: function () {
        const result = this.call("GET", "/api/sync");
        if (!result.ok || !result.data || !Array.isArray(result.data.recipes)) {
            return false;
        }
        const d = result.data;

        saveToLocalStorage(SANGKAP_KEYS.USERS, d.users || []);
        saveToLocalStorage(SANGKAP_KEYS.RECIPES, d.recipes);
        saveToLocalStorage(SANGKAP_KEYS.RATINGS, d.ratings || []);
        saveToLocalStorage(SANGKAP_KEYS.FAVORITES, d.favorites || []);

        if (d.me) {
            /* The server cookie says who is signed in, so the page session follows it. */
            saveToLocalStorage(SANGKAP_KEYS.SESSION, { isLoggedIn: true, isAnonymous: false, userId: d.me.id });
            if (Array.isArray(d.basket)) {
                saveToLocalStorage(SANGKAP_KEYS.BASKET, d.basket);
            }
        } else {
            const session = loadFromLocalStorage(SANGKAP_KEYS.SESSION, null);
            if (session && session.isLoggedIn) {
                /* The server session ended (expired or logged out elsewhere). */
                removeFromLocalStorage(SANGKAP_KEYS.SESSION);
            }
        }
        return true;
    },

    /** True when this call would be saved to the database for a signed-in user. */
    isSignedIn: function () {
        const session = loadFromLocalStorage(SANGKAP_KEYS.SESSION, null);
        return Boolean(this.enabled && session && session.isLoggedIn && session.userId);
    }
};

/* Try the server once when the page loads. */
if (typeof window !== "undefined" && /^https?:$/.test(window.location.protocol)) {
    SangkapAPI.enabled = SangkapAPI.pull();
}
