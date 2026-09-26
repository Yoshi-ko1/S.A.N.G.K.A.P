/*
S.A.N.G.K.A.P. Prototype Authentication System

This frontend-only project uses localStorage to simulate
user accounts, sessions, recipes, ratings, and favorites.

Passwords are stored locally for demonstration purposes only.

This method is not secure enough for a real production website.

A real version should use:
- Secure backend authentication
- Password hashing
- Server-side validation
- Database server
- Secure sessions
- Input sanitization
*/

/* ---------------------------------------------------------------
   Session handling
   --------------------------------------------------------------- */

/**
 * Returns the stored session object, or null when nobody has entered the site.
 */
function getCurrentSession() {
    return loadFromLocalStorage(SANGKAP_KEYS.SESSION, null);
}

function setCurrentSession(session) {
    return saveToLocalStorage(SANGKAP_KEYS.SESSION, session);
}

function isLoggedIn() {
    const session = getCurrentSession();
    return Boolean(session && session.isLoggedIn === true && session.userId);
}

function isAnonymous() {
    const session = getCurrentSession();
    return Boolean(session && session.isAnonymous === true);
}

/**
 * The full user record for whoever is signed in, or null for guests.
 */
function getCurrentUser() {
    if (!isLoggedIn()) {
        return null;
    }
    return getUserById(getCurrentSession().userId);
}

/**
 * Guests get their own session so the site can tell the difference between
 * "browsing without an account" and "has not chosen yet".
 */
function createGuestSession() {
    setCurrentSession({
        isLoggedIn: false,
        isAnonymous: true,
        userId: null,
        username: "Guest"
    });
}

/* ---------------------------------------------------------------
   Registration and login
   --------------------------------------------------------------- */

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim());
}

/**
 * Validates the registration form and creates the account.
 * Returns { success, message, user } so the page can show the message itself.
 */
function registerUser(details) {
    const username = String(details.username || "").trim();
    const email = String(details.email || "").trim();
    const password = String(details.password || "");
    const confirmPassword = String(details.confirmPassword || "");
    const displayName = String(details.displayName || "").trim();
    const profileImage = String(details.profileImage || "").trim();

    if (!username) {
        return { success: false, message: "Enter a username." };
    }
    if (username.length < 3) {
        return { success: false, message: "The username must be at least 3 characters long." };
    }
    if (!email) {
        return { success: false, message: "Enter an email address." };
    }
    if (!isValidEmail(email)) {
        return { success: false, message: "Enter a valid email address." };
    }
    if (!password) {
        return { success: false, message: "Enter a password." };
    }
    if (password.length < 6) {
        return { success: false, message: "The password must contain at least 6 characters." };
    }
    if (password !== confirmPassword) {
        return { success: false, message: "Passwords do not match." };
    }
    if (getUserByUsername(username)) {
        return { success: false, message: "This username is already in use." };
    }
    if (getUserByEmail(email)) {
        return { success: false, message: "This email is already registered." };
    }

    const user = createUser({
        username: username,
        email: email,
        password: password,
        displayName: displayName || username,
        profileImage: profileImage
    });

    return { success: true, message: "Account created.", user: user };
}

/**
 * Accepts either the username or the email address.
 */
function loginUser(identifier, password) {
    const value = String(identifier || "").trim();

    if (!value) {
        return { success: false, message: "Enter your username or email address." };
    }
    if (!password) {
        return { success: false, message: "Enter your password." };
    }

    const user = getUserByUsername(value) || getUserByEmail(value);

    if (!user) {
        return { success: false, message: "No account was found with that username or email." };
    }
    if (user.password !== password) {
        return { success: false, message: "That password is incorrect. Try again." };
    }

    setCurrentSession({
        isLoggedIn: true,
        isAnonymous: false,
        userId: user.id
    });

    return { success: true, message: "Signed in.", user: user };
}

/**
 * Clears the session only. Accounts, recipes, ratings and favorites all stay.
 */
function logoutUser() {
    removeFromLocalStorage(SANGKAP_KEYS.SESSION);
    setFlashMessage("You have successfully logged out.", "info");
    window.location.href = "login.html";
}

/* ---------------------------------------------------------------
   Protected actions
   --------------------------------------------------------------- */

/**
 * Gate for rating, saving, uploading and profile editing.
 * Returns true when the visitor may continue. Guests get a modal instead of
 * an error, and stay on the page they were reading.
 */
function requireLogin(action) {
    if (isLoggedIn()) {
        return true;
    }

    const label = action ? String(action) : "";
    const message = label
        ? "Create an account or log in to " + label + "."
        : "Create an account or log in to participate in the S.A.N.G.K.A.P. community.";

    showLoginRequiredModal(message);
    return false;
}

/* ---------------------------------------------------------------
   Login page
   --------------------------------------------------------------- */
function initLoginPage() {
    const form = document.getElementById("loginForm");
    const errorBox = document.getElementById("loginError");
    const guestButton = document.getElementById("guestButton");

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            errorBox.textContent = "";

            const identifier = document.getElementById("loginIdentifier").value;
            const password = document.getElementById("loginPassword").value;
            const result = loginUser(identifier, password);

            if (!result.success) {
                errorBox.textContent = result.message;
                return;
            }

            setFlashMessage("Welcome back, " + result.user.displayName + ".", "success");
            window.location.href = "index.html";
        });
    }

    if (guestButton) {
        guestButton.addEventListener("click", function () {
            createGuestSession();
            setFlashMessage("You are browsing as a guest. Recipes and the basket are all yours.", "info");
            window.location.href = "index.html";
        });
    }
}

/* ---------------------------------------------------------------
   Register page
   --------------------------------------------------------------- */
function initRegisterPage() {
    const form = document.getElementById("registerForm");
    const errorBox = document.getElementById("registerError");

    if (!form) {
        return;
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        errorBox.textContent = "";

        const result = registerUser({
            username: document.getElementById("registerUsername").value,
            email: document.getElementById("registerEmail").value,
            password: document.getElementById("registerPassword").value,
            confirmPassword: document.getElementById("registerConfirm").value,
            displayName: document.getElementById("registerDisplayName").value,
            profileImage: document.getElementById("registerImage").value
        });

        if (!result.success) {
            errorBox.textContent = result.message;
            return;
        }

        /* A new account is signed in straight away. */
        setCurrentSession({
            isLoggedIn: true,
            isAnonymous: false,
            userId: result.user.id
        });

        setFlashMessage("Welcome to S.A.N.G.K.A.P., " + result.user.displayName + ".", "success");
        window.location.href = "index.html";
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const page = document.body.getAttribute("data-page");
    if (page === "login") {
        initLoginPage();
    }
    if (page === "register") {
        initRegisterPage();
    }
});
