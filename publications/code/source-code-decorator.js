"use strict";

/**
 * Source code decorator
 * Creates a header to a <pre> code fragment, containing the name of the computing language and an element to copy it to the clipboard
 *
 * @author Sergey A Kryukov, https://www.SAKryukov.org
 */

window.onload = () => {

    const clipboardLabel = "Copy:\n\n";
    const preCodeElements = document.querySelectorAll("pre");
    for (let element of preCodeElements) {
        const summary = document.createElement("summary");
        const language = element.getAttribute("lang");
        if (!language) continue;
        const left = document.createTextNode(language);
        const right = document.createElement("span");
        left.textContent = language;
        right.textContent = String.fromCodePoint(0x1F4CB);
        right.title = `${clipboardLabel}${element.textContent}`;
        right.style.cursor = "pointer";
        right.onclick = event => 
            navigator.clipboard.writeText(
                event.target.title.slice(clipboardLabel.length));
        summary.appendChild(left);
        summary.appendChild(right);
        element.parentElement.insertBefore(summary, element);
    } //loop

};
      
        