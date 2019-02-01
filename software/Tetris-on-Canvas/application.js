/*
Tetris on Canvas, v.7.0
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
Code improvements, exception handling, readability, fixes

Publication:
http://www.codeproject.com/Articles/876475/Tetris-On-Canvas
*/

"use strict";

// class syntax works, ECMAScript 2015, but may be incompatible with some browsers
// class Tetromino {
// 	constructor (shape, x, y, orientation) {
// 		this.shape = shape; //TetrominoShape
// 		this.x = x;
// 		this.y = y;
// 		this.orientation = orientation;
// 	}
// 	first (x0, y0, orientation, fn, doBreak) { // fn(x, y), accepts coordinates of each block, returns true to break
// 		let row = 0, col = 0, result = false, blocks = this.shape.blocks[orientation];
// 		for (let bit = 0x8000; bit > 0; bit = bit >> 1) {
// 			if (blocks & bit) {
// 				result = fn(x0 + col, y0 + row);
// 				if (doBreak && result)
// 					return result;
// 			} //if
// 			if (++col === 4) {
// 				col = 0;
// 				++row;
// 			} //if
// 		} //loop
// 		return result;
// 	} //first
// 	all(fn) { // fn(x, y), accepts coordinates of each block
// 		this.first(this.x, this.y, this.orientation, fn, false); // no break
// 	} //all
// } //class Tetromino

// Equivalent code without ECMAScript 2015 class syntax:

function Tetromino(shape, x, y, orientation, color) {
    this.shape = shape; //TetrominoShape
    this.shape.color = color;
    this.x = x;
    this.y = y;
    this.orientation = orientation;
} //Tetromino

Tetromino.prototype = {
    first: function (x0, y0, orientation, fn, doBreak) { // fn(x, y), accepts coordinates of each block, returns true to break
        let row = 0, col = 0, result = false, blocks = this.shape.blocks[orientation];
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

const elements = {
    main: element("main"),
    left: element("left"),
    right: element("right"),
    board: element("board"),
    upcoming: element("upcoming"),
    sectionClutter: element("sectionClutter"),
    checkboxClutter: element("checkboxClutter"),
    clutterSelector: element("clutterSelector"),
    promptText: element("prompt"),
    scoreText: element("score"),
    rowsText: element("rows"),
    pausedText: element("paused"),
    helpWindow: element("help"),
    helpImageHelp: element("id.help"),
    helpImageClose: element("id.close-help"),
    downloadImage: element("id.download"),
    settingsImage: element("id.settings"),
    statusVerb: element("statusVerb")
}; //elements

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const layout = {

    upcomingPreviewSize: 5, // size of upcoming preview (in blocks), for "upcoming" canvas
    spacing: { outsize: 18, inside: 24, border: 1 },
    statusWordSet: { start: "start", continue: "continue" },
    blockSize: 0,

    resizeBody: function () {
        elements.left.style.paddingLeft = this.spacing.inside;
        elements.left.style.paddingRight = this.spacing.inside;
        elements.left.style.paddingTop = this.spacing.inside;
        elements.left.style.paddingBottom = this.spacing.inside;
        elements.right.style.paddingRight = this.spacing.inside;
        elements.right.style.paddingTop = this.spacing.inside;
        elements.right.style.paddingBottom = this.spacing.inside;
        let verticalSize = window.innerHeight - 2 * this.spacing.outsize - 2 * this.spacing.inside - 2 * this.spacing.border;
        this.blockSize = Math.floor(verticalSize / this.effectiveSettings.gameSizeInBlocks.y);
        let adjustedVerticalSize = this.blockSize * this.effectiveSettings.gameSizeInBlocks.y;
        elements.board.style.height = adjustedVerticalSize;
        let boardWidth = this.blockSize * this.effectiveSettings.gameSizeInBlocks.x;
        elements.board.style.width = boardWidth;
        let upcomingWidth = this.blockSize * this.upcomingPreviewSize;
        elements.upcoming.style.height = upcomingWidth;
        elements.upcoming.style.width = upcomingWidth;
        setText(elements.statusVerb, this.statusWordSet.continue);
        let width1 = elements.promptText.offsetWidth;
        setText(elements.statusVerb, this.statusWordSet.start);
        let width2 = elements.promptText.offsetWidth;
        elements.left.style.width = maximum(upcomingWidth, width1, width2, upcomingWidth);
        elements.main.style.borderWidth = this.spacing.border;
        elements.main.style.marginTop = (window.innerHeight - elements.main.offsetHeight) / 2;
        elements.main.style.marginLeft = (window.innerWidth - elements.main.offsetWidth) / 2;
        elements.board.width = elements.board.clientWidth;
        elements.board.height = elements.board.clientHeight;
        elements.upcoming.width = elements.upcoming.clientWidth;
        elements.upcoming.height = elements.upcoming.clientHeight;
        rendering.invalidate();
    }, //resizeBody
    resize: function () { try { this.resizeBody(); } catch (e) { showException(e); } },
    showKeyboard : function (settings) {
        for (let index in settings.key) {
            const keyboardItem = settings.key[index];
            for (let id in keyboardItem.ids)
                document.getElementById(keyboardItem.ids[id]).innerHTML = keyboardItem.display;
        } //loop
        const spacer = ": "; //SA???
        elements.helpImageHelp.title = settings.key.help.display + spacer + elements.helpImageHelp.title;
        elements.helpImageClose.title = settings.key.help.display + spacer + elements.helpImageClose.title;
        elements.downloadImage.title = settings.key.downloadSource.display + spacer + elements.downloadImage.title;
        elements.settingsImage.title = settings.key.settings.display + spacer + elements.settingsImage.title;
    } //showKeyboard

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
            const option = document.createElement("option");
            option.textContent = percent + "%";
            option.value = percent/100.0;
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
        return tetromino.first(x0, y0, orientation, function (x, y) {
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
        if (this.states.current != this.states.playing) return;
        this.handle(this.queue.shift());
        this.duration += dTime;
        if (this.duration > this.delay) { this.duration -= this.delay; this.drop(); }
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

    rotate: function (left) {
        const newOrientation = left ? 
            (this.current.orientation === this.orientation.min ? this.orientation.max : this.current.orientation - 1)
            :
            (this.current.orientation === this.orientation.max ? this.orientation.min : this.current.orientation + 1);
        if (this.willHitObstacle(this.current, this.current.x, this.current.y, newOrientation)) return;
        this.current.orientation = newOrientation;
        rendering.invalidate();
    }, //rotate

    drop: function () {
        if (this.move(this.actions.down)) return;
        this.addScore(this.effectiveSettings.scoreRules.addOnDrop(this.rows, this.score));
        this.dropTetromino();
        this.removeLines();
        this.setCurrentTetromino(this.next);
        this.setNextTetromino(this.randomTetromino());
        this.clearQueue();
        if (this.willHitObstacle(this.current, this.current.x, this.current.y, this.current.orientation))
            this.cancel();
    }, //drop

    dropTetromino: function () {
        this.current.all(function (x, y) {
            game.setBlock(x, y, game.current.shape);
        });
    }, //dropTetromino

    dropDown: function () {
        while (this.move(this.actions.down)) { }
        this.drop();
    }, //dropDown

    getTopmostBlock: function() {
        for (let y = 0; y < this.effectiveSettings.gameSizeInBlocks.y; ++y)
            for (let x = 0; x < this.effectiveSettings.gameSizeInBlocks.x; ++x)
                if (this.getBlock(x, y))
                    return y;
        return this.effectiveSettings.gameSizeInBlocks.y;
    }, //getTopmostBlock

    autoClutter: function() {
        while (true) {
            const level = this.effectiveSettings.gameSizeInBlocks.y - this.getTopmostBlock() - 1;
            if ( level / this.effectiveSettings.gameSizeInBlocks.y >= elements.clutterSelector.value ) break; 
            this.dropDown();
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
            this.addScore(this.effectiveSettings.scoreRules.addOnRemovedLines(removedLines, this.rows, this.score));
        } //if removedLines
    }, //removeLines

    handle: function (action) {
        switch (action) {
            case this.actions.left: this.move(action); break;
            case this.actions.right: this.move(action); break;
            case this.actions.rotateRight: this.rotate(false); break;
            case this.actions.rotateLeft: this.rotate(true); break;
            case this.actions.down: this.drop(); break;
            case this.actions.bottom: this.dropDown(); break;
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

    click: function (event) { try { this.clickBody(event); } catch (e) { showException(e); } },

    downloadHandler: function() {
        const downloadAnchor = (function() {
            const downloader = document.createElement('a');
            downloader.href = fileNames.sourceCode;
            document.body.appendChild(downloader);
            return downloader;    
        })();
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
    },
    settingsHandler: function() { window.location = fileNames.settingsEditor; },

    keydownBody: function (event) {
        if (this.specialKeySet.has(event.keyCode)) {
            if (event.keyCode === this.effectiveSettings.key.help.keyCode) rendering.help();
            if (event.keyCode === this.effectiveSettings.key.downloadSource.keyCode) this.downloadHandler();
            if (event.keyCode === this.effectiveSettings.key.settings.keyCode) this.settingsHandler();
            event.preventDefault();
            return;
        } //if help		
        let handled = false;
        if (this.states.current === this.states.playing) {
            switch (event.keyCode) {
                case this.effectiveSettings.key.left.keyCode: this.queue.push(this.actions.left); handled = true; break;
                case this.effectiveSettings.key.right.keyCode: this.queue.push(this.actions.right); handled = true; break;
                case this.effectiveSettings.key.rotate.keyCode:
                    const action = event.ctrlKey ? this.actions.rotateLeft : this.actions.rotateRight;
                    this.queue.push(action);
                    handled = true;
                    break;
                case this.effectiveSettings.key.down.keyCode: this.queue.push(this.actions.down); handled = true; break;
                case this.effectiveSettings.key.dropDown.keyCode:
                    // using this.repeatedKeyDropDown because event.repeat, reportedly, is not currently supported by some smartphone/tablet browsers:
                    if (!this.repeatedKeyDropDown) {
                        this.repeatedKeyDropDown = true;
                        this.queue.push(this.actions.bottom);
                    } //if
                    handled = true;
                    break;
                case this.effectiveSettings.key.cancel.keyCode: this.cancel(); handled = true; break;
                case this.effectiveSettings.key.start.keyCode: this.pause(); handled = true; break;
            } //switch 
        } else if (event.keyCode === this.effectiveSettings.key.start.keyCode) {
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
        if (event.keyCode == this.effectiveSettings.key.dropDown.keyCode)
            this.repeatedKeyDropDown = false;
        event.preventDefault();
    }, //keyupBody
    
    keydown: function (event) { try { this.keydownBody(event); } catch (e) { showException(e); } },
    
    keyup: function (event) { try { this.keyupBody(event); } catch (e) { showException(e); } }

}; //game

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const rendering = {

    boardContext: elements.board.getContext("2d"),
    upcomingContext: elements.upcoming.getContext("2d"),
    invalid: { board: true, upcoming: true, score: true, rows: true, state: true },
    invalidate: function () { this.invalid.board = true; },
    invalidateUpcoming: function () { this.invalid.upcoming = true; },
    invalidateScore: function () { this.invalid.score = true; },
    invalidateRows: function () { this.invalid.rows = true; },
    invalidateState: function (controls) { this.invalid.state = true; },
    showingHelp: false,

    showHelpImage: function(doShow) {
        if (doShow) {
            elements.helpImageHelp.style.display = "inline"; 
            elements.helpImageClose.style.display = "none"; 
        } else {
            elements.helpImageHelp.style.display = "none"; 
            elements.helpImageClose.style.display = "inline"; 
        } //if
    }, //showHelpImage
    initializeHelp: function () {
        const versionElement = element("version");
            versionElement.textContent = this.effectiveSettings.version;
    }, //initializeHelp
    help: function () {
        this.showHelpImage(this.showingHelp);		
        setVisibility(elements.helpWindow, this.showingHelp = !this.showingHelp);
    }, //help

    draw: function () {
        const drawTetromino = function (context, tetromino) {
            tetromino.all(function (x, y) {
                drawBlock(context, x, y, tetromino.shape.color);
            });
        }; //drawTetromino
        const drawTetrominoAt = function (context, tetromino, location) {
            tetromino.all(function (x, y) {
                drawBlock(context, x + location.x - tetromino.x, y + location.y - tetromino.y, tetromino.shape.color);
            });
        }; //drawTetrominoAt
        const drawBlock = function (context, x, y, color) {
            context.fillStyle = color;
            context.fillRect(x * layout.blockSize, y * layout.blockSize, layout.blockSize, layout.blockSize);
            context.strokeRect(x * layout.blockSize, y * layout.blockSize, layout.blockSize, layout.blockSize)
        }; //drawBlock
        const finerLines = function (context) {
            context.lineWidth = 1;
            context.translate(0.5, 0.5);
        }; //finerLines
        const drawUpcoming = function (context) {
            if (!this.invalid.upcoming) return;
            if (game.states.current != game.states.playing) return;
            const padding = (layout.upcomingPreviewSize - game.next.shape.size) / 2; // half-arsed attempt at centering next tetromino display
            context.save();
            finerLines(context);
            context.clearRect(-1, -1, layout.upcomingPreviewSize * layout.blockSize + 1, layout.upcomingPreviewSize * layout.blockSize + 1);
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
            setText(elements.statusVerb, game.states.current === game.states.paused ? layout.statusWordSet.continue : layout.statusWordSet.start);
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

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function element(id) { return document.getElementById(id); }
function indirectChildOf(child, parent) { if (child == parent) return true; while((child = child.parentNode) && child !== parent); return !!child; }
function now() { return new Date().getTime(); }
function hide(object, noDisplay) { object.style.visibility = "hidden"; if (noDisplay) object.style.display = "none"; }
function show(object) { object.style.visibility = null; }
function setVisibility(object, visible) {
    if (visible) {
        show(object);
        object.style.display = "block";
    } else
        hide(object);
} //setVisibility
function setText(object, text) { object.innerHTML = text; }
function maximum() {
    let big = Number.NEGATIVE_INFINITY;
    for (let argument of arguments) {
        let value = arguments;
        if (value > big)
            big = value;
    } //loop
    return big;
} //maximum
function showException(exception) {
    //return;
    alert(exception.name + ":\n" + exception.message +
        "\n" + "\nLine: " + exception.lineNumber + "; column: " + (exception.columnNumber + 1) +
        "\n\n" + exception.stack);
} //showException

try {
    (function () {
        const effectiveSettings = getSettings();
        layout.effectiveSettings = effectiveSettings;
        game.effectiveSettings = effectiveSettings;
        rendering.effectiveSettings = effectiveSettings;
        layout.showKeyboard(effectiveSettings);
        game.specialKeySet = new Set([effectiveSettings.key.help.keyCode, effectiveSettings.key.downloadSource.keyCode, effectiveSettings.key.settings.keyCode]);
        document.body.title = document.title;
        if (!window.requestAnimationFrame) // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
            window.requestAnimationFrame =
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function (callback, element) { window.setTimeout(callback, 1000 / 60); }
        game.initializeClutterLevels();
        rendering.initializeHelp();
        layout.resize();
        game.reset();
        window.onresize = function () { layout.resize(); };
        window.onkeydown = function (event) { game.keydown(event); };
        window.onkeyup = function (event) { game.keyup(event); };
        window.onclick = function (event) { game.click(event); };
        elements.helpWindow.onclick = function () { rendering.help(); };
        elements.helpImageHelp.onclick = function () { rendering.help(); };
        elements.helpImageClose.onclick = function () { rendering.help(); };
        let after, before = now();
        (function frame() {
            after = now();
            game.update(Math.min(1, (after - before) / 1000.0));
            rendering.draw();
            before = after;
            requestAnimationFrame(frame, elements.board);
        })()
        const downloadAnchor = (function() {
            const downloader = document.createElement('a');
            downloader.href = effectiveSettings.fileNames.sourceCode;
            document.body.appendChild(downloader);
            return downloader;    
        })();
        elements.downloadImage.onclick = game.downloadHandler;
        elements.settingsImage.onclick = game.settingsHandler;     
        elements.checkboxClutter.focus();
    })();
} catch (e) { showException(e); }
