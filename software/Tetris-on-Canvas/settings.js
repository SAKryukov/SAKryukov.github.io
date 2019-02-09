"use strict";

const version = "7.5.2";

const gameSizeInBlocks = { x: 10, y:20 };

const fileNames = {
    main: "index.html",
    sourceCode: "Tetris.zip",
    settingsEditor: "settings.html"
}; //fileNames

const UiTexts = {
    statusWordSet: { start: "start", continue: "continue" },
    toolBayKeyboardHintSpacer: ": "
}; //UiTexts

const layoutMetrics = {
    upcomingPreviewSize: 5, // size of upcoming preview (in blocks), for "upcoming" canvas
    spacing: { outsize: 20, inside: 24, border: 1 },
    relativeVerticalInfoPanelPadding: 1.6 // in spacing.inside units
}; //layoutMetrics

const key = {
    start: { keyCode: 13, display: "Enter", ids: ["help.startPauseContinue"] },	// (start/pause/continue)
    cancel: { keyCode: 27, display: "Escape", ids: ["help.cancelGame"] },
    left: { keyCode: 37, display: "&larr;", ids: ["help.left"] },
    right: { keyCode: 39, display: "&rarr;", ids: ["help.right"] },
    down: { keyCode: 40, display: "&darr;", ids: ["help.down"] },
    space: { keyCode: 32, display: "Space", ids: [] },
    dropDown: { keyCode: 32, display: "Space", ids: ["help.dropDown"] },
    rotate: { keyCode: 38, display: "&uarr;", ids: ["help.rotateRight", "help.rotateLeft"] }, // Up, Ctrl-Up
    help: { keyCode: 112, display: "F1", ids: ["help.help"] },
    downloadSource: { keyCode: 86, display: 'V', ids: ["help.downloadSource"]  },
    settings: { keyCode: 83, display: 'S', ids: ["help.settings"] }
}; //key

const delays = { // before piece drops by 1 row (seconds)
    start: 0.7,
    decrement: 0.003,
    min: 0.1
}; //delays

const scoreRules = {
    addOnDrop: function(totalRemovedLineCount, currentScore) { return 10; },
    addOnRemovedLines: function(lineCount, totalRemovedLineCount, currentScore) { return 100 * Math.pow(2, lineCount - 1); }
}; //scoreRules

const tetrominoColor = {
/* ── 	*/	I: "orange",
/* ☐	*/	O: "red",
/* ┬ 	*/	T: "yellow",   
/* ─┐	*/	J: "orchid",
/*┌─ 	*/	L: "blue",
/* _┌	*/	S: "lightskyblue",
/* ┐_	*/	Z: "lawngreen"
}; //tetrominoColor
'`'
function TetrominoShape(size, blocks, colorIndex) { this.size = size; this.blocks = blocks; this.colorIndex = colorIndex; }
const tetrominoSet = [
    new TetrominoShape(4, [0x0F00, 0x2222, 0x00F0, 0x4444], 'I'),
    new TetrominoShape(3, [0x0E20, 0x44C0, 0x8E00, 0x6440], 'J'),
    new TetrominoShape(3, [0x0E80, 0xC440, 0x2E00, 0x4460], 'L'),
    new TetrominoShape(2, [0xCC00, 0xCC00, 0xCC00, 0xCC00], 'O'),
    new TetrominoShape(3, [0x06C0, 0x8C40, 0x6C00, 0x4620], 'S'),
    new TetrominoShape(3, [0x0E40, 0x4C40, 0x4E00, 0x4640], 'T'),
    new TetrominoShape(3, [0x0C60, 0x4C80, 0xC600, 0x2640], 'Z')];

//-------------------------------------------------------------------------
// tetramino:
//
// blocks: each element represents a rotation of the piece (0, 90, 180, 270)
//         each element is a 16 bit integer where the 16 bits represent
//         a 4x4 set of blocks, e.g. "J"-shaped tetrominoSet[1].blocks[1] = 0x44C0
//
//             0100 = 0x4 << 3 = 0x4000 
//             0100 = 0x4 << 2 = 0x0400
//             1100 = 0xC << 1 = 0x00C0
//             0000 = 0x0 << 0 = 0x0000
//                               ------
//                               0x44C0
//
//-------------------------------------------------------------------------

const clutterOptionSet = {   
    clutterEnabledDefault: false,
    min: 5, //%
    max: 80, //%
    step: 1, //%
    default: 65 //%
}; //clutterOptionSet

const defaultSettings = {
    version: version,
    gameSizeInBlocks: gameSizeInBlocks,
    gameSizeInBlocksEditor: {
        x: { min: 5, max: 50, step: 1, unit: " blocks" },
        y: { min: 5, max: 40, step: 1, unit: " blocks" }
    },
    fileNames: fileNames,
    key: key,
    delays: delays,
    delaysEditor: {
        start: { min: 0.1, max: 4, step: 0.01, unit: " s"  },
        decrement: { min: 0.001, max: 0.5, step: 0.0001, unit: " s" },
        min: { min: 0, max: 0.5, step: 0.01, unit: " s" }
    },
    scoreRules: scoreRules,
    tetrominoColor: tetrominoColor,
    tetrominoSet: tetrominoSet,
    clutterOptionSet: clutterOptionSet,
    clutterEditor: {
        min: { min: 0, max: 4, step: 1, unit: "%" }, //5%
        max: { min: 40, max: 90, step: 1, unit: "%" }, //80%
        step: { min: 1, max: 20, step: 1, unit: "%" }, //1%
        default: { min: 0, max: 90, step: 1, unit: "%" } //%            
    }
}; //defaultSettings

const getSettings = (defaultOnly) => {
    try {
        function populateWithOverride(value, overrideValue) {
            if (!overrideValue) return;
            if (!value) return;
            if ((overrideValue.constructor == Object && value.constructor == Object) || (overrideValue.constructor == Array && value.constructor == Array)) {
                for (const index in overrideValue)
                    if (index in value) {
                        const override = overrideValue[index];
                        if (override != null && override.constructor != Object && override.constructor != Array)
                            value[index] = overrideValue[index];
                        else
                            populateWithOverride(value[index], overrideValue[index]);
                    } //if
            } else
                value = defaultValue;
        }; //populateWithOverride
        const effectiveSettings = new Object(defaultSettings);
        if (defaultOnly) return effectiveSettings;
        const localStorageJson = localStorage.getItem(settingsEditor.localStorageKey);
        if (localStorageJson) {
            let localStorageResult = undefined;
            try {
                localStorageResult = JSON.parse(localStorageJson);
            } catch (ex) {
                localStorageResult = undefined;
            }
            if (localStorageResult)
                populateWithOverride(effectiveSettings, localStorageResult);
        } //if
        effectiveSettings.localStorageAccessible = true;
        return effectiveSettings;
    } catch (ex) {
        defaultSettings.badBrowser = true;
        return defaultSettings;
    }
}; //getSettings

const settingsEditor = {
    localStorageKey: "S.A.Kryukov-Tetris-on-Canvas-61133481-30CA-4F41-82B8-8C4D2450A73C",
    keyEditorInstruction: "Press desired key<br/>Optionally, edit a key name to make it more descriptive",
    badBrowserHTML: "&mdash; you cannot store or use your custom settings with your browser unless you can configure it to use local storage or DOM storage",
    badBrowserColor: "red",
    sizeStyle: (number, unit) => { if (!unit) unit = "px"; return number + unit; },
    traverse: function(node, handler) {
        handler(node);
        node = node.firstChild;
        while (node) {
            this.traverse(node, handler);
            node = node.nextSibling;
        }
    }, //traverse
    findRoundingFactor: (editorOptionSet) => {
        let rounder = 1;
        const fraction = editorOptionSet.step.toString().split('.');
        if (fraction.length == 2)
            rounder = parseInt("1" + "0".repeat(fraction[1].length));
        return rounder;
    }, //findRoundingFactor
    setText: (id, value) => {
        document.getElementById(id).textContent = value;
    }, //setText
    getVariableName: (objectSet) => { return Object.keys(objectSet)[0]; }, // usage: const someObject = 2, const displayName = getVariableName({someObj});
    namedCssColors: [
        "transparent",
        "AliceBlue", "AntiqueWhite", "Aqua", "Aquamarine", "Azure", "Beige", "Bisque", "Black", "BlanchedAlmond", "Blue", "BlueViolet", "Brown", "BurlyWood",
        "CadetBlue", "Chartreuse", "Chocolate", "Coral", "CornflowerBlue", "Cornsilk", "Crimson", "Cyan",
        "DarkBlue", "DarkCyan", "DarkGoldenRod", "DarkGray", "DarkGrey", "DarkGreen", "DarkKhaki", "DarkMagenta", "DarkOliveGreen", "DarkOrange", "DarkOrchid", "DarkRed",
        "DarkSalmon", "DarkSeaGreen", "DarkSlateBlue", "DarkSlateGray", "DarkSlateGrey", "DarkTurquoise", "DarkViolet", "DeepPink", "DeepSkyBlue", "DimGray", "DimGrey", "DodgerBlue",
        "FireBrick", "FloralWhite", "ForestGreen", "Fuchsia", "Gainsboro", "GhostWhite", "Gold", "GoldenRod", "Gray", "Grey", "Green", "GreenYellow",
        "HoneyDew", "HotPink", "IndianRed ", "Indigo ", "Ivory", "Khaki",
        "Lavender", "LavenderBlush", "LawnGreen", "LemonChiffon", "LightBlue", "LightCoral", "LightCyan", "LightGoldenRodYellow", "LightGray", "LightGrey", "LightGreen",
        "LightPink", "LightSalmon", "LightSeaGreen", "LightSkyBlue", "LightSlateGray", "LightSlateGrey", "LightSteelBlue", "LightYellow", "Lime", "LimeGreen", "Linen",
        "Magenta", "Maroon", "MediumAquaMarine", "MediumBlue", "MediumOrchid", "MediumPurple", "MediumSeaGreen", "MediumSlateBlue", "MediumSpringGreen",
        "MediumTurquoise", "MediumVioletRed", "MidnightBlue", "MintCream", "MistyRose","Moccasin",
        "NavajoWhite", "Navy", "OldLace", "Olive", "OliveDrab", "Orange", "OrangeRed", "Orchid",
        "PaleGoldenRod", "PaleGreen", "PaleTurquoise", "PaleVioletRed", "PapayaWhip", "PeachPuff", "Peru", "Pink", "Plum", "PowderBlue", "Purple",
        "RebeccaPurple", "Red", "RosyBrown", "RoyalBlue",
        "SaddleBrown", "Salmon", "SandyBrown", "SeaGreen", "SeaShell", "Sienna", "Silver", "SkyBlue", "SlateBlue",
        "SlateGray", "SlateGrey", "Snow", "SpringGreen", "SteelBlue",
        "Tan", "Teal", "Thistle", "Tomato", "Turquoise", "Violet", "Wheat", "White", "WhiteSmoke", "Yellow", "YellowGreen"
    ]
}; //settingsEditor
