/*
Tetris on Canvas, v.3.0
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
Pause/continue
Help
FSM (states)
Fixed random tetromino generation
Javascript "strict mode"
Code improvements, exception handling, readability, fixes

Published here:
http://www.codeproject.com/Articles/876475/Tetris-On-Canvas
*/

"use strict";

function Tetromino(shape, x, y, orientation) {
	this.shape = shape; //TetrominoShape
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

const layout = {

	upcomingPreviewSize: 5, // size of upcoming preview (in blocks), for "upcoming" canvas
	spacing: { outsize: 18, inside: 24, border: 1 },
	statusWordSet: { start: "start", continue: "continue" },
	blockSize: 0,
	main: element("main"),
	left: element("left"),
	right: element("right"),
	board: element("board"),
	upcoming: element("upcoming"),

	resizeBody: function () {
		this.left.style.paddingLeft = this.spacing.inside;
		this.left.style.paddingRight = this.spacing.inside;
		this.left.style.paddingTop = this.spacing.inside;
		this.left.style.paddingBottom = this.spacing.inside;
		this.right.style.paddingRight = this.spacing.inside;
		this.right.style.paddingTop = this.spacing.inside;
		this.right.style.paddingBottom = this.spacing.inside;
		let verticalSize = window.innerHeight - 2 * this.spacing.outsize - 2 * this.spacing.inside - 2 * this.spacing.border;
		this.blockSize = Math.floor(verticalSize / gameSizeInBlocks.y);
		let adjustedVerticalSize = this.blockSize * gameSizeInBlocks.y;
		this.board.style.height = adjustedVerticalSize;
		let boardWidth = this.blockSize * gameSizeInBlocks.x;
		this.board.style.width = boardWidth;
		let upcomingWidth = this.blockSize * this.upcomingPreviewSize;
		this.upcoming.style.height = upcomingWidth;
		this.upcoming.style.width = upcomingWidth;
		setText(rendering.statusVerb, this.statusWordSet.continue);
		let width1 = rendering.promptText.offsetWidth;
		setText(rendering.statusVerb, this.statusWordSet.start);
		let width2 = rendering.promptText.offsetWidth;
		this.left.style.width = maximum(upcomingWidth, width1, width2, upcomingWidth);
		this.main.style.borderWidth = this.spacing.border;
		this.main.style.marginTop = (window.innerHeight - this.main.offsetHeight) / 2;
		this.main.style.marginLeft = (window.innerWidth - this.main.offsetWidth) / 2;
		this.board.width = this.board.clientWidth;
		this.board.height = this.board.clientHeight;
		this.upcoming.width = this.upcoming.clientWidth;
		this.upcoming.height = this.upcoming.clientHeight;
		rendering.invalidate();
	}, //resizeBody
	resize: function () { try { this.resizeBody(); } catch (e) { showException(e); } }

} //layout

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const game = {

	actions: { rotate: 0, right: 1, down: 2, left: 3, bottom: 4 },
	orientation: { min: 0, max: 3 },
	states: { cancelled: 0, paused: 1, playing: 2, current: 0 },
	blocks: [],
	queue: [],
	duration: 0,	// of current game
	score: 0,
	rows: 0,	// removed rows
	delay: 0,	// before movind down by 1 row
	current: null,
	next: null,

	setState: function (aState) { this.states.current = aState; rendering.invalidateState(); },
	startContinue: function () { if (this.states.current === this.states.cancelled) this.reset(); this.setState(this.states.playing); },
	cancel: function () { this.setState(this.states.cancelled); },
	pause: function () { this.setState(this.states.paused); },

	willHitObstacle: function (tetromino, x0, y0, orientation) { // tentative move is blocked with some obstacle
		return tetromino.first(x0, y0, orientation, function (x, y) {
			if ((x < 0) || (x >= gameSizeInBlocks.x) || (y < 0) || (y >= gameSizeInBlocks.y) || game.getBlock(x, y))
				return true; // performance gain
		}, true);
	}, //willHitObstacle

	randomTetromino: function () {
		const chosen = tetrominoSet[randomInt(0, tetrominoSet.length - 1)];
		return new Tetromino(chosen, randomInt(0, gameSizeInBlocks.x - chosen.size), 0, 0);
	}, //randomTetromino

	setScore: function (n) { this.score = n; rendering.invalidateScore(); },
	addScore: function (n) { this.setScore(this.score + n); },
	setRows: function (n) { this.rows = n; this.delay = Math.max(delays.min, delays.start - (delays.decrement * this.rows)); rendering.invalidateRows(); },
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
	}, //reset

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

	rotate: function () {
		const newOrientation = (this.current.orientation === this.orientation.max ? this.orientation.min : this.current.orientation + 1);
		if (this.willHitObstacle(this.current, this.current.x, this.current.y, newOrientation)) return;
		this.current.orientation = newOrientation;
		rendering.invalidate();
	}, //rotate

	drop: function () {
		if (this.move(this.actions.down)) return;
		this.addScore(scoreRules.addOnDrop(this.rows, this.score));
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
	}, //dropDown

	removeLine: function (n) {
		for (let y = n; y >= 0; --y)
			for (let x = 0; x < gameSizeInBlocks.x; ++x)
				this.setBlock(x, y, (y === 0) ? null : this.getBlock(x, y - 1));
	}, //removeLine

	removeLines: function () {
		let complete, n = 0;
		for (let y = gameSizeInBlocks.y; y > 0; --y) {
			complete = true;
			for (let x = 0; x < gameSizeInBlocks.x; ++x)
				if (!this.getBlock(x, y))
					complete = false;
			if (complete) {
				this.removeLine(y);
				y += 1; // recheck same line
				++n;
			} //if
		} //loop y
		if (n > 0) {
			this.addRows(n);
			this.addScore(scoreRules.addOnRemovedLines(n, this.rows, this.score));
		} //if n
	}, //removeLines

	handle: function (action) {
		switch (action) {
			case this.actions.left: this.move(action); break;
			case this.actions.right: this.move(action); break;
			case this.actions.rotate: this.rotate(); break;
			case this.actions.down: this.drop(); break;
			case this.actions.bottom: this.dropDown(); break;
		} //switch
	}, //handle

	clickBody: function () {
		if (this.states.current === this.states.playing)
			this.pause();
		else
			this.startContinue();
	}, //clickBody
	click: function (event) { try { this.clickBody(event); } catch (e) { showException(e); } },
	keydownBody: function (event) {
		if (event.keyCode === key.help) {
			rendering.help();
			event.preventDefault();
			return;
		} //if help		
		let handled = false;
		if (this.states.current === this.states.playing) {
			switch (event.keyCode) {
				case key.left: this.queue.push(this.actions.left); handled = true; break;
				case key.right: this.queue.push(this.actions.right); handled = true; break;
				case key.rotate: this.queue.push(this.actions.rotate); handled = true; break;
				case key.down: this.queue.push(this.actions.down); handled = true; break;
				case key.dropDown: this.queue.push(this.actions.bottom); handled = true; break;
				case key.cancel: this.cancel(); handled = true; break;
				case key.start: this.pause(); handled = true; break;
			} //switch 
		} else if (event.keyCode === key.start) {
			this.startContinue();
			handled = true;
		} //if
		if (handled)
			event.preventDefault(); // prevent arrow keys from scrolling the page (supported in IE9+ and all other browsers)
	}, //keydownBody
	keydown: function (event) { try { this.keydownBody(event); } catch (e) { showException(e); } }

} //game

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const rendering = {

	promptText: element("prompt"),
	scoreText: element("score"),
	rowsText: element("rows"),
	pausedText: element("paused"),
	helpWindow: element("help"),
	helpImageHelp: element("id.help"),
	helpImageExit: element("id.exit"),	
    badBrowser: element("bad-browser"),
	statusVerb: element("statusVerb"),
	boardContext: layout.board.getContext("2d"),
	upcomingContext: layout.upcoming.getContext("2d"),
	invalid: { board: true, upcoming: true, score: true, rows: true, state: true },
	invalidate: function () { this.invalid.board = true; },
	invalidateUpcoming: function () { this.invalid.upcoming = true; },
	invalidateScore: function () { this.invalid.score = true; },
	invalidateRows: function () { this.invalid.rows = true; },
	invalidateState: function () { this.invalid.state = true; },
	showingHelp: false,

	showHelpImage: function(doShow) {
		if (doShow) {
			this.helpImageHelp.style.display = "inline"; 
			this.helpImageExit.style.display = "none"; 
		} else {
			this.helpImageHelp.style.display = "none"; 
			this.helpImageExit.style.display = "inline"; 
		} //if
	}, //showHelpImage
	initializeHelp: function () {
		const versionElement = element("version");
        versionElement.textContent = version;
		hide(this.helpWindow);
		hide(this.badBrowser, true);
	}, //initializeHelp
	help: function () {
		this.showHelpImage(this.showingHelp);		
		setVisibility(this.helpWindow, this.showingHelp = !this.showingHelp);
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
			for (let y = 0; y < gameSizeInBlocks.y; y++)
				for (let x = 0; x < gameSizeInBlocks.x; x++)
					if (block = game.getBlock(x, y))
						drawBlock(context, x, y, block.color);
			context.strokeRect(0, 0, context.canvas.width - 1, context.canvas.height - 1); // board boundary
			context.restore();
			this.invalid.board = false;
		}; //drawBoard
		const drawScore = function () {
			if (!this.invalid.score) return;
			setText(this.scoreText, game.score);
			this.invalid.score = false;
		}; //drawScore
		const drawRows = function () {
			if (!this.invalid.rows) return;
			setText(this.rowsText, game.rows);
			this.invalid.rows = false;
		}; //drawRows
		const drawState = function () {
			if (!this.invalid.state) return;
			setText(rendering.statusVerb, game.states.current === game.states.paused ? layout.statusWordSet.continue : layout.statusWordSet.start);
			setVisibility(this.pausedText, game.states.current === game.states.paused);
			setVisibility(this.promptText, game.states.current != game.states.playing);
			this.invalid.state = false;
		}; //drawState
		drawBoard.call(this, this.boardContext);
		drawUpcoming.call(this, this.upcomingContext);
		drawScore.call(this);
		drawRows.call(this);
		drawState.call(this);
	} //draw

} //rendering

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function element(id) { return document.getElementById(id); }
function now() { return new Date().getTime(); }
function hide(object, noDisplay) { object.style.visibility = "hidden"; if (noDisplay) object.style.display = "none"; }
function show(object) { object.style.visibility = null; }
function setVisibility(object, visible) { if (visible) show(object); else hide(object); }
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
		if (!window.requestAnimationFrame) // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
			window.requestAnimationFrame =
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame ||
				window.oRequestAnimationFrame ||
				window.msRequestAnimationFrame ||
				function (callback, element) { window.setTimeout(callback, 1000 / 60); }
		rendering.initializeHelp();
		layout.resize();
		game.reset();
		window.onresize = function () { layout.resize(); };
		document.onkeydown = function (event) { game.keydown(event); };
		window.onclick = function () { game.click(); };
		rendering.helpWindow.onclick = function () { rendering.help(); };
		rendering.helpImageHelp.onclick = function () { rendering.help(); };
		rendering.helpImageExit.onclick = function () { rendering.help(); };
		let after, before = now();
		(function frame() {
			after = now();
			game.update(Math.min(1, (after - before) / 1000.0));
			rendering.draw();
			before = after;
			requestAnimationFrame(frame, layout.board);
		})()
	})();
} catch (e) { showException(e); }
