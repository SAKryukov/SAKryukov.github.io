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

const setupTouch = (
    touchSettings,
    container,
    game,
    touchIndicator
) => {

    const startAction = game.startContinue;
    const pauseAction = game.pause;
    const moveAction = game.moveTo;
    const stepDownAction = game.stepDown;
    const dropAction = game.dropDown;
    const rotateAction = game.rotate;
    const cancelAction = game.cancel;

    const isTouchSupported = (() => {
        return ('ontouchstart' in window) || navigator.maxTouchPoints > 0
    })();
    if (isTouchSupported)
        game.showTouchHelp();
    else
        return;

    const assignEvent = (element, name, handler) => {
        element.addEventListener(name, handler, { passive: false, capture: true });
    };
    const assignTouchStart = (element, handler) => {
        assignEvent(element, "touchstart", handler);
    };
    const assignTouchMove = (element, handler) => {
        assignEvent(element, "touchmove", handler);
    };
    const assignTouchEnd = (element, handler) => {
        assignEvent(element, "touchend", handler);
    };

    let currentTouchCount = 0;
    // const maxFingers = 3; //SA???
    // const findTouch = (touches, identifier) => {
    //     const count = touches.length;
    //     if (maxFingers < count) count = maxFingers;
    //     for (let index = 0; index < count; ++index)
    //         if (touches[index].identifier == identifier) return touches[index];
    //     return null;
    // } //findTouch

    // const indicatorState = {
    //     touchId: null,
    //     size: 600,
    //     customSize: false,
    //     moveIndicator: function(touch) {
    //         touchIndicator.style.top = touch.clientY - this.size/2 + "px";
    //         touchIndicator.style.left = touch.clientX - this.size/2 + "px";        
    //     }, //moveIndicator
    //     showIndicator: function(touch) {
    //         if (touch) {
    //             this.moveIndicator(touch);
    //             touchIndicator.style.display = "block";
    //             touchIndicator.style.width = this.size + "px";
    //         } else
    //             touchIndicator.style.display = "none";
    //     }, //showIndicator
    //     onDown: function(previousTouchCount, currentTouchCount, ev) {
    //         if (currentTouchCount > 1) {
    //             if (this.customSize) return;
    //             const dx = ev.touches[1].clientX - ev.touches[0].clientX;
    //             const dy = ev.touches[1].clientY - ev.touches[0].clientY;
    //             this.size = Math.floor(Math.sqrt(dx*dx + dy*dy));
    //             this.customSize = true;
    //             if (this.touchId != null) { this.showIndicator(ev.touches[this.touchId]); return; }
    //         } //if
    //         if (this.touchId != null) return;
    //         this.touchId = ev.touches[0].identifier;
    //         this.showIndicator(ev.touches[0]);
    //     }, //OnDown
    //     onMove: function(previousTouchCount, currentTouchCount, ev) {
    //         if (this.touchId == null) return;
    //         const touch = findTouch(ev.changedTouches, this.touchId);
    //         if (touch) this.moveIndicator(touch);
    //     }, //OnMove
    //     onUp: function(previousTouchCount, currentTouchCount, ev) {
    //         if (this.touchId == null) return;
    //         if (findTouch(ev.touches, this.touchId)) return; 
    //         this.showIndicator(null);
    //         this.touchId = null;
    //     } //onUp
    // } //indicatorState
    
    const clickState = {
        time: null,
        touchCount: 0,
        reset: function() {
            this.time = null;
            this.touchCount = 0;
        }, //reset
        onDown: function(count) {
            this.time = Date.now();
            if (this.touchCount < count)
                this.touchCount = count;
        }, //onDown
        onUp: function(count) {
            if (count != 0) return null;
            if (this.time == null) return null;
            const deltaMs = Date.now() - this.time;
            if (deltaMs > touchSettings.clickThresholdMs) { this.reset(); return null; }
            const result = this.touchCount; 
            this.reset();
            return result;
        } //onUp
    }; //clickState

    const motionState = {
        touched: false,
        y: null,
        lastMovePoint: null,
        reset: function() { this.lastMovePoint = null; },
        onDown: function(previousTouchCount, currentTouchCount, ev) {
            this.touched = false;
            if (startAction && previousTouchCount == 0 && currentTouchCount == 1) {
                startAction.call(game);
                if (touchSettings.moveTetrominoToTouch)
                    moveAction.call(game, ev.touches[0].clientX);
            } else if (previousTouchCount == 1 && currentTouchCount == 2) {
                this.touched = true;
                this.y = ev.touches[1].clientY;
            } //if
        }, //onDown
        onMove: function(currentTouchCount, ev) {
            if (ev.touches.length == 1 && ev.changedTouches.length == 1 && this.lastMovePoint != null) {
                const currentTime = Date.now();
                const dx = ev.touches[0].clientX - this.lastMovePoint.x;
                const dy = ev.touches[0].clientY - this.lastMovePoint.y;
                if (dy > touchSettings.swipeThresholdPx && dy*dy > dx*dx)
                    game.moveDownToTouchStop(ev.touches[0].clientY);
            } //if
            this.lastMovePoint = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
            if (rotateAction && this.touched && currentTouchCount == 2) {
                const left = ((ev.touches[1].clientX - ev.touches[0].clientX) * (ev.touches[1].clientY - this.y)) < 0;
                rotateAction.call(game, left);
                this.touched = false;
            } else if (moveAction) {
                let y = undefined;
                if (ev.touches.length == 1)
                    y = ev.touches[0].clientY;
                moveAction.call(game, ev.touches[0].clientX, y);
            } //if
        } //onMove
    }; //motionState

    const clickHandler = count => {
        if (dropAction && count == 1)
            dropAction.call(game);
        else if (pauseAction && count == 2)
            pauseAction.call(game);
        else if (cancelAction && count == 3)
            cancelAction.call(game);
    }; //clickHandler
        
    assignTouchStart(container, (ev) => {
        ev.preventDefault();
        const previousTouchCount = currentTouchCount;
        currentTouchCount = ev.touches.length;
        clickState.onDown(currentTouchCount);
        motionState.onDown(previousTouchCount, currentTouchCount, ev);
        //indicatorState.onDown(previousTouchCount, currentTouchCount, ev);
    }); //assignTouchStart
    
    assignTouchMove(container, (ev) => {
        ev.preventDefault();
        motionState.onMove(currentTouchCount, ev);
        //indicatorState.onMove(0, 0, ev);
    }); //assignTouchMove

    assignTouchEnd(container, (ev) => {
        ev.preventDefault();
        const previousTouchCount = currentTouchCount;
        currentTouchCount = ev.touches.length;
        const clicks = clickState.onUp(currentTouchCount);
        if (clicks) clickHandler(clicks);
        //indicatorState.onUp(previousTouchCount, currentTouchCount, ev);
    }); //assignTouchEnd

}; //setupTouch