"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCursor = void 0;
// Heavily based on: https://github.com/Xetera/ghost-cursor/blob/master/src/spoof.ts
const math_1 = require("./math");
const calc = require("./calc");
/**
 * Type guard, will make TypeScript understand which type we're working with.
 */
function isPlaywrightPage(obj) {
    return 'unroute' in obj;
}
/**
 * Type guard, will make TypeScript understand which type we're working with.
 */
function isPlaywrightElementHandle(obj) {
    return !('$x' in obj);
}
// Helper function to wait a specified number of milliseconds
const delay = async (ms) => await new Promise(resolve => setTimeout(resolve, ms));
// Get a random point on a box
const getRandomBoxPoint = ({ x, y, width, height }, options) => {
    let paddingWidth = 0;
    let paddingHeight = 0;
    if ((options === null || options === void 0 ? void 0 : options.paddingPercentage) !== undefined &&
        (options === null || options === void 0 ? void 0 : options.paddingPercentage) > 0 &&
        (options === null || options === void 0 ? void 0 : options.paddingPercentage) < 100) {
        paddingWidth = (width * options.paddingPercentage) / 100;
        paddingHeight = (height * options.paddingPercentage) / 100;
    }
    return {
        x: x + paddingWidth / 2 + Math.random() * (width - paddingWidth),
        y: y + paddingHeight / 2 + Math.random() * (height - paddingHeight)
    };
};
// Get a random point on a browser window
// export const getRandomPagePoint = async (page: Page): Promise<Vector> => {
//   const targetId: string = (page.target() as any)._targetId
//   const window = await (page as any)._client.send(
//     'Browser.getWindowForTarget',
//     { targetId }
//   )
//   return getRandomBoxPoint({
//     x: origin.x,
//     y: origin.y,
//     width: window.bounds.width,
//     height: window.bounds.height
//   })
// }
// Using this method to get correct position of Inline elements (elements like <a>)
const getElementBox = async (page, element, relativeToMainFrame = true) => {
    if (isPlaywrightPage(page)) {
        // TODO: Check if in main frame
        return await element.boundingBox();
    }
    if (element._remoteObject === undefined ||
        element._remoteObject.objectId === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        return null;
    }
    const quads = await page._client.send('DOM.getContentQuads', {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        objectId: element._remoteObject.objectId
    });
    const elementBox = {
        x: quads.quads[0][0],
        y: quads.quads[0][1],
        width: quads.quads[0][4] - quads.quads[0][0],
        height: quads.quads[0][5] - quads.quads[0][1]
    };
    if (elementBox === null) {
        return null;
    }
    if (!relativeToMainFrame) {
        const elementFrame = element.executionContext().frame();
        const iframes = await elementFrame.parentFrame().$x('//iframe');
        let frame = null;
        for (const iframe of iframes) {
            if ((await iframe.contentFrame()) === elementFrame)
                frame = iframe;
        }
        if (frame !== null) {
            const boundingBox = await frame.boundingBox();
            elementBox.x =
                boundingBox !== null ? elementBox.x - boundingBox.x : elementBox.x;
            elementBox.y =
                boundingBox !== null ? elementBox.y - boundingBox.y : elementBox.y;
        }
    }
    return elementBox;
};
const overshootThreshold = 500;
const shouldOvershoot = (a, b) => math_1.magnitude(math_1.direction(a, b)) > overshootThreshold;
const createCursor = (page, start = math_1.origin, performRandomMoves = false) => {
    // this is kind of arbitrary, not a big fan but it seems to work
    const overshootSpread = 10;
    const overshootRadius = 120;
    let previous = start;
    // Initial state: mouse is not moving
    let moving = false;
    // Move the mouse over a number of vectors
    const tracePath = async (vectors, abortOnMove = false) => {
        var _a;
        for (const v of vectors) {
            try {
                // In case this is called from random mouse movements and the users wants to move the mouse, abort
                if (abortOnMove && moving) {
                    return;
                }
                await page.mouse.move(v.x, v.y);
                previous = v;
            }
            catch (error) {
                // Exit function if the browser is no longer connected
                const isConnected = isPlaywrightPage(page)
                    ? (_a = page.context().browser()) === null || _a === void 0 ? void 0 : _a.isConnected
                    : page.browser().isConnected();
                // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
                if (!isConnected)
                    return;
                console.log('Warning: could not move mouse, error message:', error);
            }
        }
    };
    // Start random mouse movements. Function recursively calls itself
    // const randomMove = async (): Promise<void> => {
    //   try {
    //     if (!moving) {
    //       const rand = await getRandomPagePoint(page)
    //       await tracePath(path(previous, rand), true)
    //       previous = rand
    //     }
    //     await delay(Math.random() * 2000) // wait max 2 seconds
    //     randomMove().then(
    //       _ => {},
    //       _ => {}
    //     ) // fire and forget, recursive function
    //   } catch (_) {
    //     console.log('Warning: stopping random mouse movements')
    //   }
    // }
    const actions = {
        toggleRandomMove(random) {
            moving = !random;
        },
        async click(selector, options) {
            actions.toggleRandomMove(false);
            if (selector !== undefined) {
                await actions.move(selector, options);
                actions.toggleRandomMove(false);
            }
            try {
                await page.mouse.down();
                if ((options === null || options === void 0 ? void 0 : options.waitForClick) !== undefined) {
                    await delay(options.waitForClick);
                }
                await page.mouse.up();
            }
            catch (error) {
                console.log('Warning: could not click mouse, error message:', error);
            }
            await delay(Math.random() * 2000);
            actions.toggleRandomMove(true);
        },
        async move(selector, options) {
            actions.toggleRandomMove(false);
            let elem = null;
            if (typeof selector === 'string') {
                if (selector.includes('//')) {
                    if ((options === null || options === void 0 ? void 0 : options.waitForSelector) !== undefined) {
                        // TODO: Refactor and make Playwright compatible
                        // @see xpath: https://stackoverflow.com/a/59924073
                        // await page.waitForXPath(selector, {
                        //   timeout: options.waitForSelector
                        // })
                    }
                    // elem = await page.$x(selector)
                }
                else {
                    if ((options === null || options === void 0 ? void 0 : options.waitForSelector) !== undefined) {
                        // await page.waitForSelector(selector, {
                        //   timeout: options.waitForSelector
                        // })
                    }
                    elem = await page.$(selector);
                }
                if (elem === null) {
                    throw new Error(`Could not find element with selector "${selector}", make sure you're waiting for the elements with "puppeteer.waitForSelector"`);
                }
            }
            else {
                elem = selector;
            }
            // Make sure the object is in view
            if (isPlaywrightElementHandle(elem)) {
                await elem.scrollIntoViewIfNeeded();
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                if (elem._remoteObject !== undefined &&
                    elem._remoteObject.objectId !== undefined) {
                    await page._client.send('DOM.scrollIntoViewIfNeeded', {
                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                        objectId: elem._remoteObject.objectId
                    });
                }
            }
            const box = await getElementBox(page, elem);
            if (box === null) {
                throw new Error("Could not find the dimensions of the element you're clicking on, this might be a bug?");
            }
            const { height, width } = box;
            const destination = getRandomBoxPoint(box, options);
            const dimensions = { height, width };
            const overshooting = shouldOvershoot(previous, destination);
            const to = overshooting
                ? math_1.overshoot(destination, overshootRadius)
                : destination;
            await tracePath(calc.path(previous, to));
            if (overshooting) {
                const correction = calc.path(to, Object.assign(Object.assign({}, dimensions), destination), overshootSpread);
                await tracePath(correction);
            }
            previous = destination;
            actions.toggleRandomMove(true);
        },
        async moveTo(destination) {
            actions.toggleRandomMove(false);
            await tracePath(calc.path(previous, destination));
            actions.toggleRandomMove(true);
        }
    };
    // Start random mouse movements. Do not await the promise but return immediately
    // if (performRandomMoves)
    // TODO: Fix random move thing
    // randomMove().then(
    //   _ => {},
    //   _ => {}
    // )
    return actions;
};
exports.createCursor = createCursor;
//# sourceMappingURL=spoof.js.map