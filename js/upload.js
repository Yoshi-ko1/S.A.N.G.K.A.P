/*
    S.A.N.G.K.A.P. - upload.js

    Lets people choose a picture from their device instead of pasting a link.
    Used by the register page (profile picture), the recipe form (dish picture)
    and the profile editor.

    How it works
      - A page marks a hidden input with data-image-picker. That input keeps the
        picture's address, so the rest of the code reads it exactly as before.
      - This file adds a file chooser, a preview and a Remove button next to it.
      - The chosen picture is shrunk in the browser (smaller and faster to send),
        then uploaded to the server, which saves it as a file and returns its path.
      - With no server (files opened directly), the shrunken picture is kept in the
        browser instead.

    Options on the hidden input:
        data-max-side="400"    longest side in pixels after shrinking
        data-shape="round"     round preview for profile pictures ("wide" otherwise)
*/

const IMAGE_PICKER_TYPES = ["image/jpeg", "image/png", "image/webp"];
const IMAGE_PICKER_MAX_FILE_MB = 10;

function loadPickedImage(file) {
    return new Promise(function (resolve, reject) {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = function () {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = function () {
            URL.revokeObjectURL(url);
            reject(new Error("That file could not be read as a picture."));
        };
        image.src = url;
    });
}

/** Scales the picture down so its longest side is maxSide, and returns a JPEG data URL. */
function shrinkImage(image, maxSide) {
    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = Math.min(1, maxSide / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";                     /* transparent areas become white */
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
}

async function sendImageToServer(dataUrl) {
    let response;
    try {
        response = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: dataUrl })
        });
    } catch (error) {
        throw new Error("The server could not be reached. Try again.");
    }
    let body = null;
    try { body = await response.json(); } catch (error) { body = null; }
    if (!response.ok || !body || !body.path) {
        throw new Error((body && body.error) || "The picture could not be uploaded.");
    }
    return body.path;
}

/** Shows the current value of the hidden input in the preview. Call it after setting the value in code. */
function refreshImagePicker(valueId) {
    const field = document.getElementById(valueId);
    const preview = document.getElementById(valueId + "Preview");
    const remove = document.getElementById(valueId + "Remove");
    if (!field || !preview) {
        return;
    }
    const value = field.value;
    const has = Boolean(value) && value !== "assets/images/placeholder.svg";
    /* style.display is used because the hidden attribute loses to CSS rules that set display. */
    preview.style.display = has ? "block" : "none";
    if (remove) {
        remove.style.display = has ? "inline-flex" : "none";
    }
    if (has) {
        preview.src = value;
    } else {
        preview.removeAttribute("src");
    }
    const pick = document.getElementById(valueId + "Pick");
    if (pick) {
        pick.textContent = has ? "Change picture" : "Choose picture";
    }
}

function setImagePickerStatus(valueId, message, isError) {
    const status = document.getElementById(valueId + "Status");
    if (status) {
        status.textContent = message;
        status.style.color = isError ? "var(--danger)" : "";
    }
}

function initImagePicker(field) {
    const id = field.id;
    const maxSide = Number(field.getAttribute("data-max-side")) || 1000;
    const round = field.getAttribute("data-shape") === "round";

    const chooser = document.createElement("input");
    chooser.type = "file";
    chooser.id = id + "File";
    chooser.accept = IMAGE_PICKER_TYPES.join(",");
    chooser.style.display = "none";          /* the native box looks out of place, so a site button opens it */

    const pick = document.createElement("button");
    pick.type = "button";
    pick.id = id + "Pick";
    pick.className = "btn btn--outline btn--small";
    pick.textContent = "Choose picture";
    pick.addEventListener("click", function () {
        chooser.click();
    });

    const preview = document.createElement("img");
    preview.id = id + "Preview";
    preview.alt = "Picture preview";
    preview.style.cssText =
        "margin-top:10px;object-fit:cover;border:1px solid var(--line);" +
        (round ? "width:96px;height:96px;border-radius:50%;" : "width:220px;max-width:100%;height:150px;border-radius:var(--radius);");

    const remove = document.createElement("button");
    remove.type = "button";
    remove.id = id + "Remove";
    remove.className = "btn btn--outline btn--small";
    remove.textContent = "Remove picture";
    remove.style.marginTop = "8px";

    const status = document.createElement("span");
    status.id = id + "Status";
    status.className = "field__hint";
    status.setAttribute("role", "status");

    field.insertAdjacentElement("afterend", chooser);
    chooser.insertAdjacentElement("afterend", pick);
    pick.insertAdjacentElement("afterend", preview);
    preview.insertAdjacentElement("afterend", remove);
    remove.insertAdjacentElement("afterend", status);

    chooser.addEventListener("change", async function () {
        const file = chooser.files && chooser.files[0];
        if (!file) {
            return;
        }
        if (IMAGE_PICKER_TYPES.indexOf(file.type) === -1) {
            chooser.value = "";
            setImagePickerStatus(id, "Choose a JPG, PNG or WebP picture.", true);
            return;
        }
        if (file.size > IMAGE_PICKER_MAX_FILE_MB * 1024 * 1024) {
            chooser.value = "";
            setImagePickerStatus(id, "That picture is larger than " + IMAGE_PICKER_MAX_FILE_MB + " MB.", true);
            return;
        }

        field.setAttribute("data-busy", "1");
        setImagePickerStatus(id, "Preparing your picture...", false);
        try {
            const image = await loadPickedImage(file);
            const dataUrl = shrinkImage(image, maxSide);
            field.value = SangkapAPI.enabled ? await sendImageToServer(dataUrl) : dataUrl;
            refreshImagePicker(id);
            setImagePickerStatus(id, "Picture ready.", false);
        } catch (error) {
            chooser.value = "";
            setImagePickerStatus(id, error.message, true);
        } finally {
            field.removeAttribute("data-busy");
        }
    });

    remove.addEventListener("click", function () {
        field.value = "";
        chooser.value = "";
        refreshImagePicker(id);
        setImagePickerStatus(id, "Picture removed.", false);
    });

    /* Do not let the form submit while a picture is still uploading. */
    const form = field.closest("form");
    if (form) {
        form.addEventListener("submit", function (event) {
            if (field.getAttribute("data-busy") === "1") {
                event.preventDefault();
                event.stopImmediatePropagation();
                setImagePickerStatus(id, "Please wait, your picture is still uploading.", true);
            }
        }, true);
    }

    refreshImagePicker(id);
}

document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("input[data-image-picker]").forEach(initImagePicker);
});
