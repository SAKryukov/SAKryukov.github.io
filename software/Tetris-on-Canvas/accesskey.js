/*
  Replace discouraged and non-portable accesskey attributes with key handling
  Event handling will not depend on language and other keyboard detail,
  as it is based on raw keyboard input

  Copyright (c) 2025 by Sergey A Kryukov
  http://www.SAKryukov.org
  https://github.com/SAKryukov/word-games
*/

"use strict";

const fixAccessKeyAttributes = (altKey = true, shiftKey = false, ctrlKey = false, metaKey = false) => {

    const definitionSet = (() => {
        const definitionSet = {
            accesskey: 0,
            keydown: 0,
            radio: 0,
            checkbox: 0,
            clickTypes: { button: 0, submit: 0, image: 0, },
        }; //definitionSet
        for (let index in definitionSet)
            if (definitionSet[index] === 0)
                definitionSet[index] = index;
        const clickSet = new Set();
        for (let index in definitionSet.clickTypes)
            clickSet.add(index);
        definitionSet.clickTypes = clickSet;
        return Object.freeze(definitionSet);
    })(); //definitionSet

    const eventMap = new Map();
    const elements = document.querySelectorAll(`[${definitionSet.accesskey}]`);

    for (let element of elements) {
        const key = element.getAttribute(definitionSet.accesskey);
        let action = element => element.focus();
        if (element instanceof HTMLInputElement) {
            if (element.type == definitionSet.radio)
                action = element => element.checked = true;
            else if (element.type == definitionSet.checkbox)
                action = element => element.checked = !element.checked;
            else if (definitionSet.clickTypes.has(element.type) && element.click)
                action = element => element.click();
        } else if (element instanceof HTMLButtonElement)
            action = element => element.click();
        eventMap.set(key, { element, action });
        element.removeAttribute(definitionSet.accesskey);
    } //loop

    window.addEventListener(definitionSet.keydown, event => {
        if (event.altKey != altKey ||
            event.shiftKey != shiftKey ||
            event.ctrlKey != ctrlKey ||
            event.metaKey != metaKey)
                return;
        const value = eventMap.get(event.code);
        if (!value) return;
        if (!value.element.disabled)
            value.action(value.element);
        event.preventDefault();
}); //window.addEventListener

};
