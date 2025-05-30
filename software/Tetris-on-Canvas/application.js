/*
Tetris on Canvas
Sergey A Kryukov, derived work
http://www.SAKryukov.org
http://www.codeproject.com/Members/SAKryukov

Based on algorithms and working prototype developed by Jake Gordon:
http://codeincomplete.com
http://codeincomplete.com/posts/2011/10/10/javascript_tetris
https://github.com/jakesgordon/javascript-tetris

License: MIT (http://en.wikipedia.org/wiki/MIT_License)

S A Kryukov implemented:
Configurable game: board size, tetromino colors/shapes, score rules, timing
Auto-resizeable depending on the browser window size 
Drop of tetromino to bottom
Automatic optional clutter at the end of the game (since v.5)
Pause/continue
Help
FSM (states)
Fixed random tetromino generation
Javascript "strict mode"
Flex layout
Touch screen support
Code improvements, exception handling, readability, fixes

Publication:
http://www.codeproject.com/Articles/876475/Tetris-On-Canvas
*/

"use strict";

const definitionSet = {
    clutterUnit: "%",
    showException: exception =>
        alert(exception.name + ":\n" + exception.message +
            "\n" + "\nLine: " + exception.lineNumber + "; column: " + (exception.columnNumber + 1) +
            "\n\n" + exception.stack),
    splitPropertyChain: chain => chain.split("."),
    imageBackground: "white", // important: limitation imposed by tetromino image background colors
    tetrominoId: tetrominoName => `image.${tetrominoName}`,
    get2DDrawingContext: element => element.getContext("2d"),
    events: {
        keydown: 0, DOMContentLoaded: 0,
    },
    elementNames: {
        option: 0, a: 0, aside: 0, details: 0,
    },
    elementTypeNames: {
        checkbox: 0,
    },
    styleNames: {
        none: 0, block: 0, hidden: 0, inline: 0,
    },
    keyCodes: {
        Enter: 0, Space: 0,
    },
}; //definitionSet
(objectArray => {
    for (let object of objectArray) {
        for (let index in object)
            object[index] = index;   
        Object.freeze(object);
    } //loop
    Object.freeze(definitionSet);
})([
    definitionSet.events, definitionSet.elementNames, definitionSet.elementTypeNames,
    definitionSet.styleNames, definitionSet.keyCodes, 
]);

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const element = id => document.getElementById(id);
const indirectChildOf = (child, parent) => { if (child == parent) return true; while ((child = child.parentNode) && child !== parent); return !!child; };
const hide = (object, noDisplay) => { object.style.visibility = definitionSet.styleNames.hidden; if (noDisplay) object.style.display = definitionSet.styleNames.none; };
const show = object => { object.style.visibility = null; };
const showBlock = object => { object.style.display = definitionSet.styleNames.block; };
const setVisibility = (object, visible) => {
    if (visible) {
        show(object);
        object.style.display = definitionSet.styleNames.block;
    } else
        hide(object);
}; //setVisibility
const setText = (object, text) => { object.innerHTML = text; };
const maximum = function () {
    let big = Number.NEGATIVE_INFINITY;
    for (let argument of arguments) {
        let value = argument;
        if (value >= big)
            big = value;
    } //loop
    return big;
} //maximum

const assignProperty = (targetObject, propertyName, value) => {
    const propertyChain = definitionSet.splitPropertyChain(propertyName);
    for (let index = 0; index < propertyChain.length; ++index) {
        if (targetObject[propertyChain[index]] != undefined)
            targetObject = targetObject[propertyChain[index]];
        else {
            if (index == propertyChain.length - 1)
                targetObject[propertyChain[index]] = value;
            else
                targetObject[propertyChain[index]] = {};
            targetObject = targetObject[propertyChain[index]];
        } //if
    } //loop propertyChain
}; //assignProperty

const readProperty = (targetObject, propertyName) => {
    const propertyChain = definitionSet.splitPropertyChain(propertyName);
    for (let property of propertyChain)
        targetObject = targetObject[property];
    return targetObject;
}; //readProperty

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function Tetromino(shape, x, y, orientation, color) {
    this.shape = shape; //TetrominoShape
    this.shape.color = color;
    this.x = x;
    this.y = y;
    this.orientation = orientation;
} //Tetromino

Tetromino.prototype = {
    first: function (x0, y0, orientation, fn, doBreak) { // fn(x, y), accepts coordinates of each block, returns true to break
        let row = 0, col = 0, result = false;
        const blocks = this.shape.blocks[orientation];
        for (let bit = 0x8000; bit > 0; bit = bit >> 1) {
            if (blocks & bit) {
                result = fn(x0 + col, y0 + row);
                if (doBreak && result)
                    return result;
            } //if
            if (++col === 4) {
                col = 0;
                ++row;
            } //if
        } //loop
        return result;
    }, //Tetromino.prototype.first
    all: function (fn) { // fn(x, y), accepts coordinates of each block
        this.first(this.x, this.y, this.orientation, fn, false); // no break
    } //Tetromino.prototype.all
} //Tetromino.prototype

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const initializeGame = () => {

    const elements = {
        pageGame: document.querySelector("main#game-main"),
        pageSettings: document.querySelector("main#settings"),
        main: element("play-area"),
        game: element("game"),
        nav: element("toolbar"),
        left: element("left"),
        right: element("right"),
        board: element("board"),
        upcoming: element("upcoming"),
        sectionClutter: element("section-clutter"),
        checkboxClutter: element("checkboxClutter"),
        clutterSelector: element("clutterSelector"),
        promptText: element("prompt"),
        scoreText: element("score"),
        rowsText: element("rows"),
        pausedText: element("paused"),
        helpWindow: element("help"),
        helpImageHelp: element("id.help"),
        helpImageClose: element("id.close-help"),
        helpTouch: element("help-touch"),
        helpTouchNoSupport: element("help-touch-no-support"),
        downloadImage: element("id.download"),
        settingsImage: element("id.settings"),
        statusVerb: element("statusVerb"),
        statusKeyName: element("statusKeyName"),
        touchIndicator: element("touch-indicator"),
        helpVersion: element("help-version"),
    }; //elements

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const layout = {

        blockSize: 0,

        resizeBody: function () {
            elements.left.style.paddingLeft = settingsEditor.sizeStyle(layoutMetrics.spacing.inside);
            elements.left.style.paddingRight = settingsEditor.sizeStyle(layoutMetrics.spacing.inside);
            elements.left.style.paddingTop = settingsEditor.sizeStyle(layoutMetrics.spacing.inside * layoutMetrics.relativeVerticalInfoPanelPadding);
            elements.left.style.paddingBottom = settingsEditor.sizeStyle(layoutMetrics.spacing.inside * layoutMetrics.relativeVerticalInfoPanelPadding);
            elements.right.style.paddingRight = settingsEditor.sizeStyle(layoutMetrics.spacing.inside);
            elements.right.style.paddingTop = settingsEditor.sizeStyle(layoutMetrics.spacing.inside);
            elements.right.style.paddingBottom = settingsEditor.sizeStyle(layoutMetrics.spacing.inside);
            let verticalSize = window.innerHeight - 2 * layoutMetrics.spacing.outsize - 2 * layoutMetrics.spacing.inside - 2 * layoutMetrics.spacing.border;
            this.blockSize = Math.floor(verticalSize / this.effectiveSettings.gameSizeInBlocks.y);
            const adjustedVerticalSize = this.blockSize * this.effectiveSettings.gameSizeInBlocks.y;
            elements.board.style.height = settingsEditor.sizeStyle(adjustedVerticalSize);
            let boardWidth = this.blockSize * this.effectiveSettings.gameSizeInBlocks.x;
            elements.board.style.width = settingsEditor.sizeStyle(boardWidth);
            let upcomingWidth = this.blockSize * layoutMetrics.upcomingPreviewSize;
            elements.upcoming.style.height = settingsEditor.sizeStyle(upcomingWidth);
            elements.upcoming.style.width = settingsEditor.sizeStyle(upcomingWidth);
            setText(elements.statusVerb, UiTexts.statusWordSet.continue);
            let width1 = elements.promptText.offsetWidth;
            setText(elements.statusVerb, UiTexts.statusWordSet.start);
            setText(elements.statusKeyName, this.effectiveSettings.key.start.code);
            let width2 = elements.promptText.offsetWidth;
            const leftWidth = maximum(upcomingWidth, width1, width2, upcomingWidth);
            elements.left.style.width = settingsEditor.sizeStyle(leftWidth);
            elements.main.style.borderWidth = settingsEditor.sizeStyle(layoutMetrics.spacing.border);
            elements.board.width = elements.board.clientWidth;
            elements.board.height = elements.board.clientHeight;
            elements.upcoming.width = elements.upcoming.clientWidth;
            elements.upcoming.height = elements.upcoming.clientHeight;
            rendering.invalidate();
        }, //resizeBody

        resize: function () { try { this.resizeBody(); } catch (e) { definitionSet.showException(e); } },

        showKeyboard: settings => {
            for (let index in settings.key) {
                const keyboardItem = settings.key[index];
                for (let id in keyboardItem.ids)
                    document.getElementById(keyboardItem.ids[id]).innerHTML = createDisplayName(keyboardItem.code);
            } //loop
            elements.helpImageHelp.title = settings.key.help.display + UiTexts.toolBayKeyboardHintSpacer + elements.helpImageHelp.title;
            elements.helpImageClose.title = settings.key.help.display + UiTexts.toolBayKeyboardHintSpacer + elements.helpImageClose.title;
            elements.downloadImage.title = settings.key.downloadSource.display + UiTexts.toolBayKeyboardHintSpacer + elements.downloadImage.title;
            elements.settingsImage.title = settings.key.settings.display + UiTexts.toolBayKeyboardHintSpacer + elements.settingsImage.title;
        }, //showKeyboard

    }; //layout

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const game = {

        actions: { rotateRight: 0, rotateLeft: 1, right: 2, down: 3, left: 4, bottom: 5 },
        orientation: { min: 0, max: 3 },
        states: { cancelled: 0, paused: 1, playing: 2, current: 0 },
        blocks: [],
        queue: [],
        duration: 0,	// of current game
        score: 0,
        rows: 0,	// removed rows
        delay: 0,	// before moving down by 1 row
        current: null,
        next: null,

        initializeClutterLevels: function () {
            checkboxClutter.checked = this.effectiveSettings.clutterOptionSet.clutterEnabledDefault;
            for (let percent = this.effectiveSettings.clutterOptionSet.min; percent <= this.effectiveSettings.clutterOptionSet.max; percent += this.effectiveSettings.clutterOptionSet.step) {
                const option = document.createElement(definitionSet.elementNames.option);
                option.textContent = settingsEditor.sizeStyle(percent, definitionSet.clutterUnit);
                option.value = percent / 100.0;
                if (percent == this.effectiveSettings.clutterOptionSet.default)
                    option.selected = true;
                elements.clutterSelector.appendChild(option);
            }
        }, //initializeClutterLevels	

        setState: function (aState) {
            this.states.current = aState;
            rendering.invalidateState();
            const disabledControls = aState == this.states.playing || aState == this.states.paused;
            window.focus();
            if (disabledControls) { // only needed for Mozilla
                elements.checkboxClutter.blur();
                elements.clutterSelector.blur();
            } //if
            elements.checkboxClutter.disabled = disabledControls;
            elements.clutterSelector.disabled = disabledControls;
        },
        startContinue: function () {
            if (this.states.current === this.states.cancelled) {
                this.reset();
                if (elements.checkboxClutter.checked)
                    this.autoClutter();
            } //if
            this.setState(this.states.playing);
        }, //startContinue
        cancel: function () { this.setState(this.states.cancelled); },
        pause: function () { this.setState(this.states.paused); },

        willHitObstacle: function (tetromino, x0, y0, orientation) { // tentative move is blocked with some obstacle
            const gameSizeInBlocks = this.effectiveSettings.gameSizeInBlocks;
            return tetromino.first(x0, y0, orientation, (x, y) => {
                if ((x < 0) || (x >= gameSizeInBlocks.x) || (y < 0) || (y >= gameSizeInBlocks.y) || game.getBlock(x, y))
                    return true; // performance gain
            }, true);
        }, //willHitObstacle

        randomTetromino: function () {
            const chosen = this.effectiveSettings.tetrominoSet[randomInt(0, this.effectiveSettings.tetrominoSet.length - 1)];
            const color = this.effectiveSettings.tetrominoColor[chosen.colorIndex];
            return new Tetromino(chosen, randomInt(0, this.effectiveSettings.gameSizeInBlocks.x - chosen.size), 0, 0, color);
        }, //randomTetromino

        setScore: function (n) { this.score = n; rendering.invalidateScore(); },
        addScore: function (n) { this.setScore(this.score + n); },
        setRows: function (n) { this.rows = n; this.delay = Math.max(this.effectiveSettings.delays.min, this.effectiveSettings.delays.start - (this.effectiveSettings.delays.decrement * this.rows)); rendering.invalidateRows(); },
        addRows: function (n) { this.setRows(this.rows + n); },
        getBlock: function (x, y) { return (this.blocks && this.blocks[x] ? this.blocks[x][y] : null); },
        setBlock: function (x, y, shape) { this.blocks[x] = this.blocks[x] || []; this.blocks[x][y] = shape; rendering.invalidate(); },
        clearQueue: function () { this.queue = []; },
        setCurrentTetromino: function (t) { this.current = t || this.randomTetromino(); rendering.invalidate(); },
        setNextTetromino: function (t) { this.next = t || this.randomTetromino(); rendering.invalidateUpcoming(); },

        reset: function () {
            this.duration = 0;
            this.setScore(0);
            this.setRows(0);
            this.blocks = []; rendering.invalidate();
            this.clearQueue();
            this.setCurrentTetromino(this.next);
            this.setNextTetromino();
        }, //

        update: function (dTime) {
            if (this.states.current == this.states.playing) {
                this.handle(this.queue.shift());
                this.duration += dTime;
                if (this.duration > this.delay) { this.duration -= this.delay; this.drop(true); }
            } //if
            rendering.draw();
        }, //update 

        move: function (direction) {
            let x = this.current.x, y = this.current.y;
            switch (direction) {
                case this.actions.right: x += 1; break;
                case this.actions.left: x -= 1; break;
                case this.actions.down: y += 1; break;
            } //switch
            if (!this.willHitObstacle(this.current, x, y, this.current.orientation)) {
                this.current.x = x;
                this.current.y = y;
                rendering.invalidate();
                return true;
            } else
                return false;
        }, //move

        moveTo: function (clientX, clientY) { //SA??? touch
            const left = elements.board.offsetLeft;
            const width = elements.board.offsetWidth;
            const shift = this.current.shape.shiftsX[this.current.orientation];
            const x = Math.floor((clientX - left) / (width / this.effectiveSettings.gameSizeInBlocks.x)) - shift;
            if (x < -shift || x >= this.effectiveSettings.gameSizeInBlocks.x) return;
            while (this.current.x != x) {
                const direction = x > this.current.x ? this.actions.right : this.actions.left;
                if (!this.move(direction)) break;
            } //loop
        }, //moveTo

        moveDownToTouchStop: function (clientY) { //SA??? touch
            const top = elements.board.offsetTop;
            const height = elements.board.offsetHeight;
            const shift = this.current.shape.shiftsY[this.current.orientation];
            //SA??? -4 is the height, should be optional
            const y = Math.floor((clientY - top) / (height / this.effectiveSettings.gameSizeInBlocks.y)) - shift;
            while (this.current.y < y)
                if (!this.drop(true))
                    break;
        }, //moveDownToTouchStop
        showTouchHelp: () => {
            hide(elements.helpTouchNoSupport, true);
            showBlock(elements.helpTouch);
        }, //showTouchHelp

        rotate: function (left) {
            const newOrientation = left ?
                (this.current.orientation === this.orientation.min ? this.orientation.max : this.current.orientation - 1)
                :
                (this.current.orientation === this.orientation.max ? this.orientation.min : this.current.orientation + 1);
            if (this.willHitObstacle(this.current, this.current.x, this.current.y, newOrientation)) return;
            this.current.orientation = newOrientation;
            rendering.invalidate();
        }, //rotate

        drop: function (updateScore) {
            if (this.move(this.actions.down)) return false;
            if (updateScore) this.addScore(scoreRules.addOnDrop(this.rows, this.score));
            this.dropTetromino();
            this.removeLines();
            this.setCurrentTetromino(this.next);
            this.setNextTetromino(this.randomTetromino());
            this.clearQueue();
            if (this.willHitObstacle(this.current, this.current.x, this.current.y, this.current.orientation)) {
                this.cancel();
                return false;
            } //if
            return true;
        }, //drop

        dropTetromino: function () {
            this.current.all((x, y) => game.setBlock(x, y, game.current.shape));
        }, //dropTetromino

        dropDown: function (updateScore) {
            while (this.move(this.actions.down)) { }
            this.drop(updateScore);
        }, //dropDown

        getTopmostBlock: function () {
            for (let y = 0; y < this.effectiveSettings.gameSizeInBlocks.y; ++y)
                for (let x = 0; x < this.effectiveSettings.gameSizeInBlocks.x; ++x)
                    if (this.getBlock(x, y))
                        return y;
            return this.effectiveSettings.gameSizeInBlocks.y;
        }, //getTopmostBlock

        autoClutter: function () {
            while (true) {
                const level = this.effectiveSettings.gameSizeInBlocks.y - this.getTopmostBlock() - 1;
                if (level / this.effectiveSettings.gameSizeInBlocks.y >= elements.clutterSelector.value) break;
                this.dropDown(false);
            } //loop
        }, //autoClutter

        removeLine: function (lineLocation) {
            for (let y = lineLocation; y >= 0; --y)
                for (let x = 0; x < this.effectiveSettings.gameSizeInBlocks.x; ++x)
                    this.setBlock(x, y, (y === 0) ? null : this.getBlock(x, y - 1));
        }, //removeLine

        removeLines: function () {
            let complete, removedLines = 0;
            for (let y = this.effectiveSettings.gameSizeInBlocks.y; y > 0; --y) {
                complete = true;
                for (let x = 0; x < this.effectiveSettings.gameSizeInBlocks.x; ++x)
                    if (!this.getBlock(x, y))
                        complete = false;
                if (complete) {
                    this.removeLine(y);
                    y += 1; // recheck same line
                    ++removedLines;
                } //if
            } //loop y
            if (removedLines > 0) {
                this.addRows(removedLines);
                this.addScore(scoreRules.addOnRemovedLines(removedLines, this.rows, this.score));
            } //if removedLines
        }, //removeLines

        handle: function (action) {
            switch (action) {
                case this.actions.left: this.move(action); break;
                case this.actions.right: this.move(action); break;
                case this.actions.rotateRight: this.rotate(false); break;
                case this.actions.rotateLeft: this.rotate(true); break;
                case this.actions.down: this.drop(true); break;
                case this.actions.bottom: this.dropDown(true); break;
            } //switch
        }, //handle

        clickBody: function (event) {
            if (event.target.constructor == HTMLAnchorElement) return;
            if (event.target.constructor == HTMLImageElement) return;
            if (indirectChildOf(event.target, elements.sectionClutter)) return;
            if (this.states.current === this.states.playing)
                this.pause();
            else
                this.startContinue();
        }, //clickBody

        click: function (event) { try { this.clickBody(event); } catch (e) { definitionSet.showException(e); } },

        downloadHandler: () => {
            const downloadAnchor = (() => {
                const downloader = document.createElement(definitionSet.elementNames.a);
                downloader.href = fileNames.sourceCode;
                document.body.appendChild(downloader);
                return downloader;
            })();
            downloadAnchor.click();
            document.body.removeChild(downloadAnchor);
        },
        settingsHandler: () => {
            document.documentElement.style.backgroundColor =
                document.body.style.backgroundColor = definitionSet.imageBackground;
            hide(elements.pageGame, true);
            showBlock(elements.pageSettings);
            adjustSettings();
        },

        keydownBody: function (event) {
            if (rendering.showingHelp && event.code != this.effectiveSettings.key.help.code)
                return;
            if (this.specialKeySet.has(event.code)) {
                if (event.code === this.effectiveSettings.key.help.code) rendering.help();
                if (event.code === this.effectiveSettings.key.downloadSource.code) this.downloadHandler();
                if (event.code === this.effectiveSettings.key.settings.code) this.settingsHandler();
                event.preventDefault();
                return;
            } //if help		
            let handled = false;
            if (this.states.current === this.states.playing) {
                switch (event.code) {
                    case this.effectiveSettings.key.left.code: this.queue.push(this.actions.left); handled = true; break;
                    case this.effectiveSettings.key.right.code: this.queue.push(this.actions.right); handled = true; break;
                    case this.effectiveSettings.key.rotate.code:
                        const action = event.ctrlKey ? this.actions.rotateLeft : this.actions.rotateRight;
                        this.queue.push(action);
                        handled = true;
                        break;
                    case this.effectiveSettings.key.down.code:
                        this.queue.push(this.actions.down);
                        handled = true;
                        break;
                    case this.effectiveSettings.key.dropDown.code:
                        // using this.repeatedKeyDropDown because event.repeat, reportedly, is not currently supported by some smartphone/tablet browsers:
                        if (!this.repeatedKeyDropDown) {
                            this.repeatedKeyDropDown = true;
                            this.queue.push(this.actions.bottom);
                        } //if
                        handled = true;
                        break;
                    case this.effectiveSettings.key.cancel.code: this.cancel(); handled = true; break;
                    case this.effectiveSettings.key.start.code: this.pause(); handled = true; break;
                } //switch 
            } else if (event.code === this.effectiveSettings.key.start.code) {
                this.startContinue();
                handled = true;
            } //if
            if (handled)
                event.preventDefault(); // prevent arrow keys from scrolling the page (supported in IE9+ and all other browsers)
        }, //keydownBody

        repeatedKeyDropDown: false, //using it because event.repeat, reportedly, is not currently supported by some smartphone/tablet browsers

        keyupBody: function (event) {
            if (indirectChildOf(event.target, elements.sectionClutter))
                return;
            if (event.code == this.effectiveSettings.key.dropDown.code)
                this.repeatedKeyDropDown = false;
            event.preventDefault();
        }, //keyupBody

        keydown: function (event) { try { this.keydownBody(event); } catch (e) { definitionSet.showException(e); } },

        keyup: function (event) { try { this.keyupBody(event); } catch (e) { definitionSet.showException(e); } }

    }; //game

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const rendering = {

        boardContext: definitionSet.get2DDrawingContext(elements.board),
        upcomingContext: definitionSet.get2DDrawingContext(elements.upcoming),
        invalid: { board: true, upcoming: true, score: true, rows: true, state: true },
        invalidate: function () { this.invalid.board = true; },
        invalidateUpcoming: function () { this.invalid.upcoming = true; },
        invalidateScore: function () { this.invalid.score = true; },
        invalidateRows: function () { this.invalid.rows = true; },
        invalidateState: function () { this.invalid.state = true; },
        showingHelp: false,

        showHelpImage: doShow => {
            if (doShow) {
                elements.helpImageHelp.style.display = definitionSet.styleNames.inline;
                elements.helpImageClose.style.display = definitionSet.styleNames.none;
            } else {
                elements.helpImageHelp.style.display = definitionSet.styleNames.none;
                elements.helpImageClose.style.display = definitionSet.styleNames.inline;
            } //if
        }, //showHelpImage
        initializeHelp: function () {          
            const versionElement = elements.helpVersion;
            versionElement.textContent = this.effectiveSettings.version;
        }, //initializeHelp
        help: function () {
            this.showHelpImage(this.showingHelp);
            setVisibility(elements.helpWindow, this.showingHelp = !this.showingHelp);
        }, //help

        draw: function () {
            const drawTetromino = (context, tetromino) =>
                tetromino.all((x, y) => drawBlock(context, x, y, tetromino.shape.color));
            const drawTetrominoAt = (context, tetromino, location) =>
                tetromino.all((x, y) =>
                    drawBlock(context, x + location.x - tetromino.x, y + location.y - tetromino.y, tetromino.shape.color));
            const drawBlock = (context, x, y, color) => {
                context.fillStyle = color;
                context.fillRect(x * layout.blockSize, y * layout.blockSize, layout.blockSize, layout.blockSize);
                context.strokeRect(x * layout.blockSize, y * layout.blockSize, layout.blockSize, layout.blockSize)
            }; //drawBlock
            const finerLines = context => {
                context.lineWidth = 1;
                context.translate(0.5, 0.5);
            }; //finerLines
            const drawUpcoming = function (context) {
                if (!this.invalid.upcoming) return;
                if (game.states.current != game.states.playing) return;
                const padding = (layoutMetrics.upcomingPreviewSize - game.next.shape.size) / 2; // half-arsed attempt at centering next tetromino display
                context.save();
                finerLines(context);
                context.clearRect(-1, -1, layoutMetrics.upcomingPreviewSize * layout.blockSize + 1, layoutMetrics.upcomingPreviewSize * layout.blockSize + 1);
                drawTetrominoAt(context, game.next, { x: padding, y: padding });
                context.restore();
                this.invalid.upcoming = false;
            }; //drawUpcoming
            const drawBoard = function (context) {
                if (!this.invalid.board) return;
                context.save();
                finerLines(context);
                context.clearRect(-1, -1, context.canvas.width + 1, context.canvas.height + 1);
                if (game.states.current === game.states.playing)
                    drawTetromino(context, game.current);
                let block;
                for (let y = 0; y < this.effectiveSettings.gameSizeInBlocks.y; y++)
                    for (let x = 0; x < this.effectiveSettings.gameSizeInBlocks.x; x++)
                        if (block = game.getBlock(x, y)) {
                            drawBlock(context, x, y, block.color);
                        }
                context.strokeRect(0, 0, context.canvas.width - 1, context.canvas.height - 1); // board boundary
                context.restore();
                this.invalid.board = false;
            }; //drawBoard
            const drawScore = function () {
                if (!this.invalid.score) return;
                setText(elements.scoreText, game.score);
                this.invalid.score = false;
            }; //drawScore
            const drawRows = function () {
                if (!this.invalid.rows) return;
                setText(elements.rowsText, game.rows);
                this.invalid.rows = false;
            }; //drawRows
            const drawState = function () {
                if (!this.invalid.state) return;
                setText(elements.statusVerb, game.states.current === game.states.paused ? UiTexts.statusWordSet.continue : UiTexts.statusWordSet.start);
                setVisibility(elements.pausedText, game.states.current === game.states.paused);
                setVisibility(elements.promptText, game.states.current != game.states.playing);
                this.invalid.state = false;
            }; //drawState
            drawBoard.call(this, this.boardContext);
            drawUpcoming.call(this, this.upcomingContext);
            drawScore.call(this);
            drawRows.call(this);
            drawState.call(this);
        } //draw

    }; //rendering

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    (() => { // main
        const effectiveSettings = getSettings();
        layout.effectiveSettings = effectiveSettings;
        game.effectiveSettings = effectiveSettings;
        rendering.effectiveSettings = effectiveSettings;
        layout.showKeyboard(effectiveSettings);
        game.specialKeySet = new Set([effectiveSettings.key.help.code, effectiveSettings.key.downloadSource.code, effectiveSettings.key.settings.code]);
        document.body.title = document.title;
        game.initializeClutterLevels();
        rendering.initializeHelp();
        layout.resize();
        game.reset();
        window.onresize = () => layout.resize();
        window.addEventListener(definitionSet.events.keydown, event => game.keydown(event));
        window.onkeyup = event => game.keyup(event);
        window.onclick = event => game.click(event);
        elements.helpWindow.onclick = () => rendering.help();
        elements.helpImageHelp.onclick = () => rendering.help();
        elements.helpImageClose.onclick = () => rendering.help();
        elements.checkboxClutter.focus();
        (() => { // downloader setup
            const downloader = document.createElement(definitionSet.elementNames.a);
            downloader.href = effectiveSettings.fileNames.sourceCode;
            document.body.appendChild(downloader);
        })(); // downloader setup
        (() => { // touch screen support:
            elements.downloadImage.onclick = game.downloadHandler;
            elements.settingsImage.onclick = game.settingsHandler;
            setupTouch(effectiveSettings.touchScreen, elements.main, game, elements.touchIndicator);
        })(); // touch screen support:
        { // main animation cycle
            let before;
            (function frame(timestamp) {
                if (before)
                    game.update((timestamp - before) / 1000.0); // milliseconds to seconds
                before = timestamp;
                window.requestAnimationFrame(frame, elements.board);
            })();
        } // main animation cycle
    })(); // main

}; //initializeGame

let adjustSettings = null;

const initializeSettings = () => {
    const setTargetImage = node => {
        const cell = node.parentElement;
        if (cell.constructor != HTMLTableCellElement) return;
        let tetrominoName = definitionSet.splitPropertyChain(node.dataset.property);
        tetrominoName = tetrominoName[tetrominoName.length - 1];
        const tetrominoId = definitionSet.tetrominoId(tetrominoName);
        const targetImage = document.getElementById(tetrominoId);
        if (!targetImage) return null; 
        node.targetImage = targetImage;
        targetImage.onclick = event => {
            const cell = event.target.parentElement;
            const index = Array.prototype.indexOf.call(cell.parentElement.children, cell);
            const table = event.target.parentElement.parentElement.parentElement;
            const parallelRow = table.rows[table.rows.length - 1];
            const select = parallelRow.cells[index].children[0];
            select.focus();
            if (select.showPicker)
                select.showPicker();
            event.preventDefault(); 
        };
        return targetImage;
    }; //setTargetImage

    const detectKeyboardEditorElements = node => {
        const button = node.lastElementChild.lastElementChild;
        const inputName = node.lastElementChild.firstElementChild;
        return { button: button, inputName: inputName };
    }; //detectKeyboardEditorElements

    const populate = (elements, defaultOnly) => {
        const effectiveSettings = getSettings(defaultOnly);
        settingsEditor.traverse(document.body, function(node) {
            if (!node.dataset) return;
            if (!node.dataset.property) return;
            let value = readProperty(effectiveSettings, node.dataset.property);
            if (node.constructor == HTMLTableRowElement) { // keyboard
                const keyboardEditorElements = detectKeyboardEditorElements(node);            
                keyboardEditorElements.inputName.value = value.code;
                keyboardEditorElements.inputName.data = {};
                keyboardEditorElements.inputName.data.code = value.code;
                keyboardEditorElements.button.onclick = () => {
                    elements.keyEditor.tabIndex = 0;
                    elements.keyEditor.onkeydown = event => {
                        event.preventDefault();
                        event.target.innerHTML = event.code;
                        keyboardEditorElements.inputName.value = event.code;
                        keyboardEditorElements.inputName.data = {};
                        keyboardEditorElements.inputName.data.code = event.code;
                        event.target.style.display = definitionSet.styleNames.none;
                        keyboardEditorElements.inputName.focus();
                    }; //elements.keyEditor
                    elements.keyEditor.innerHTML = settingsEditor.keyEditorInstruction;
                    elements.keyEditor.style.display = definitionSet.styleNames.block;
                    const buttonBounds = keyboardEditorElements.button.getBoundingClientRect();
                    elements.keyEditor.style.top = settingsEditor.sizeStyle((buttonBounds.top + window.pageYOffset));
                    elements.keyEditor.style.left = settingsEditor.sizeStyle((buttonBounds.right + window.pageXOffset));
                    elements.keyEditor.focus();
                }; //keyboardEditorElements.button.onclick
            } else if (node.constructor == HTMLSelectElement) {
                while (node.firstChild)
                    node.removeChild(node.firstChild);
                if (setTargetImage(node)) { // case of image
                    node.onchange = function(event) {
                        if (event.target.targetImage.constructor == HTMLImageElement)
                            event.target.targetImage.style.backgroundColor = event.target.value;
                    }; //node.onselect
                    for (let color of settingsEditor.namedCssColors) {
                        const option = document.createElement(definitionSet.elementNames.option);
                        const colorBox = document.createElement(definitionSet.elementNames.aside);
                        colorBox.style.backgroundColor = color;
                        const colorName = document.createTextNode(color);
                        option.appendChild(colorBox);
                        option.appendChild(colorName);
                        option.selected = value.toLowerCase() == color.toLowerCase();
                        option.value = color;
                        node.add(option);
                    } //loop
                    node.targetImage.style.backgroundColor = node.value;
                } else { //if image, now considering text
                    const editorOptionSet = readProperty(effectiveSettings, node.dataset.editor);
                    if (!editorOptionSet) return;
                    const count = ((editorOptionSet.max - editorOptionSet.min) / editorOptionSet.step) + 1;
                    const rounder = settingsEditor.findRoundingFactor(editorOptionSet);
                    for (let index = 0; index < count; ++index) {
                        let optionValue = editorOptionSet.min + index * editorOptionSet.step;
                        optionValue = Math.floor(optionValue * rounder) / rounder; 
                        const option = document.createElement(definitionSet.elementNames.option);
                        option.selected = optionValue == value;
                        option.textContent = optionValue + editorOptionSet.unit;
                        node.add(option);
                    } //loop
                } //if text
            } else if (node.constructor == HTMLInputElement && node.type == definitionSet.elementTypeNames.checkbox) {
                node.checked = value;
            } else // not editable
                settingsEditor.setText(node.id, value);
        });
        return effectiveSettings.localStorageAccessible; 
    }; //populate

    const extractKeyboardData = (settings, node) => {
        const parentProperty = readProperty(settings, node.dataset.property);
        const keyboardEditorElements = detectKeyboardEditorElements(node);
        const code = keyboardEditorElements.inputName.data.code;
        const display = createDisplayName(keyboardEditorElements.inputName.value);
        parentProperty.code = code;
        parentProperty.display = display;
        return parentProperty;
    }; //extractKeyboardData

    const apply = () => {
        const target = {};
        const currentSettings = getSettings(false); // effective
        settingsEditor.traverse(document.body, function(node) {
            if (!node.dataset) return;
            if (!node.dataset.property) return;
            if (node.constructor != HTMLTableRowElement && node.constructor != HTMLSelectElement && node.type != definitionSet.elementTypeNames.checkbox) return;
            let currentObject = target;
            let value = null;
            if (node.constructor == HTMLTableRowElement) {
                value = extractKeyboardData(currentSettings, node);
            } else {
                value = node.value;
                if (node.type == definitionSet.elementTypeNames.checkbox) 
                    value = node.checked;
                else {
                    const numericValue = parseFloat(node.value);
                    if (!Number.isNaN(numericValue)) value = numericValue;
                } //if
            } //if
            if (value == undefined || value == null) return;
            assignProperty(currentObject, node.dataset.property, value);
        });
        const result = JSON.stringify(target);
        localStorage.setItem(settingsEditor.localStorageKey, result);
        window.location = fileNames.main;
    }; //apply

    (() => {
        const elements = {
            version: document.getElementById("version"),
            keyEditor: document.getElementById("keyEditor"),
            buttonApply: document.getElementById("apply"),
            buttonClean: document.getElementById("clean"),
            buttonReset: document.getElementById("reset"),
            badBrowser: document.getElementById("badBrowser"),
        };
        adjustSettings = () => {
            const keyReadButtons = document.querySelectorAll("main#settings td button");
            for (let keyReadButton of keyReadButtons)
                keyReadButton.style.width = settingsEditor.sizeStyle(keyReadButton.offsetHeight);
        }; //adjustSettings
        const details = document.querySelectorAll(definitionSet.elementNames.details);
        for (let detail of details) {
            detail.onkeydown = event => {
                if (event.target.parentElement != event.currentTarget) return;
                if (event.code == definitionSet.keyCodes.Space || event.code == definitionSet.keyCodes.Enter)
                    event.currentTarget.open = !event.currentTarget.open;
            }; //detail.onkeydown
            detail.onpointerdown = event =>
                event.target.focus();
        } //loop
        elements.version.textContent = version;
        const localStorageAccessible = populate(elements, false);
        elements.buttonReset.onclick = () => { populate(elements, true); };
        if (localStorageAccessible) {
            elements.buttonApply.onclick = apply;
            elements.buttonClean.onclick = () => {
                localStorage.removeItem(settingsEditor.localStorageKey);
                location.reload(true);
            }; //buttonClean.onclick
        } else {
            elements.badBrowser.innerHTML = settingsEditor.badBrowserHTML;
            elements.badBrowser.parentElement.style.color = settingsEditor.badBrowserColor;
            elements.buttonApply.disabled = true;
            elements.buttonClean.disabled = true;
        } //if
    })();
}; //initializeSettings

document.addEventListener(definitionSet.events.DOMContentLoaded, () => {
    try {
        fixAccessKeyAttributes();     
        initializeGame();
        initializeSettings();
    } catch (e) { definitionSet.showException(e); }
});
