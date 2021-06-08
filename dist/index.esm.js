/*!
 * @extra/humanize v4.2.1 by berstend
 * https://github.com/berstend/puppeteer-extra/tree/master/packages/plugin-humanize
 * @license MIT
 */
import { AutomationExtraPlugin } from 'automation-extra-plugin';

// Taken from: https://github.com/Xetera/ghost-cursor/blob/master/src/math.ts
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Bezier = require('bezier-js');
const origin = { x: 0, y: 0 };
// maybe i should've just imported a vector library lol
const sub = (a, b) => ({
    x: a.x - b.x,
    y: a.y - b.y
});
const div = (a, b) => ({
    x: a.x / b,
    y: a.y / b
});
const mult = (a, b) => ({
    x: a.x * b,
    y: a.y * b
});
const add = (a, b) => ({
    x: a.x + b.x,
    y: a.y + b.y
});
const direction = (a, b) => sub(b, a);
const perpendicular = (a) => ({ x: a.y, y: -1 * a.x });
const magnitude = (a) => Math.sqrt(Math.pow(a.x, 2) + Math.pow(a.y, 2));
const unit = (a) => div(a, magnitude(a));
const setMagnitude = (a, amount) => mult(unit(a), amount);
const randomVectorOnLine = (a, b) => {
    const vec = direction(a, b);
    const multiplier = Math.random();
    return add(a, mult(vec, multiplier));
};
const randomNormalLine = (a, b, range) => {
    const randMid = randomVectorOnLine(a, b);
    const normalV = setMagnitude(perpendicular(direction(a, randMid)), range);
    return [randMid, normalV];
};
const generateBezierAnchors = (a, b, spread) => {
    const side = Math.round(Math.random()) === 1 ? 1 : -1;
    const calc = () => {
        const [randMid, normalV] = randomNormalLine(a, b, spread);
        const choice = mult(normalV, side);
        return randomVectorOnLine(randMid, add(randMid, choice));
    };
    return [calc(), calc()].sort((a, b) => a.x - b.x);
};
const clamp = (target, min, max) => Math.min(max, Math.max(min, target));
const overshoot = (coordinate, radius) => {
    const a = Math.random() * 2 * Math.PI;
    const rad = radius * Math.sqrt(Math.random());
    const vector = { x: rad * Math.cos(a), y: rad * Math.sin(a) };
    return add(coordinate, vector);
};
const bezierCurve = (start, finish, overrideSpread) => {
    // could be played around with
    const min = 2;
    const max = 200;
    const vec = direction(start, finish);
    const length = magnitude(vec);
    const spread = clamp(length, min, max);
    const anchors = generateBezierAnchors(start, finish, overrideSpread !== null && overrideSpread !== void 0 ? overrideSpread : spread);
    return new Bezier(start, ...anchors, finish);
};

/**
 * Calculate the amount of time needed to move from (x1, y1) to (x2, y2)
 * given the width of the element being clicked on
 * https://en.wikipedia.org/wiki/Fitts%27s_law
 */
const fitts = (distance, width) => {
    const a = 0;
    const b = 2;
    const id = Math.log2(distance / width + 1);
    return a + b * id;
};
const isBox = (a) => 'width' in a;
function path(start, end, spreadOverride) {
    const defaultWidth = 100;
    const minSteps = 25;
    const width = isBox(end) ? end.width : defaultWidth;
    const curve = bezierCurve(start, end, spreadOverride);
    const length = curve.length() * 0.8;
    const baseTime = Math.random() * minSteps;
    const steps = Math.ceil((Math.log2(fitts(length, width) + 1) + baseTime) * 3);
    const re = curve.getLUT(steps);
    return clampPositive(re);
}
const clampPositive = (vectors) => {
    const clamp0 = (elem) => Math.max(0, elem);
    return vectors.map(vector => {
        return {
            x: clamp0(vector.x),
            y: clamp0(vector.y)
        };
    });
};

// Heavily based on: https://github.com/Xetera/ghost-cursor/blob/master/src/spoof.ts
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
const shouldOvershoot = (a, b) => magnitude(direction(a, b)) > overshootThreshold;
const createCursor = (page, start = origin, performRandomMoves = false) => {
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
                    if ((options === null || options === void 0 ? void 0 : options.waitForSelector) !== undefined) ;
                    // elem = await page.$x(selector)
                }
                else {
                    if ((options === null || options === void 0 ? void 0 : options.waitForSelector) !== undefined) ;
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
                ? overshoot(destination, overshootRadius)
                : destination;
            await tracePath(path(previous, to));
            if (overshooting) {
                const correction = path(to, Object.assign(Object.assign({}, dimensions), destination), overshootSpread);
                await tracePath(correction);
            }
            previous = destination;
            actions.toggleRandomMove(true);
        },
        async moveTo(destination) {
            actions.toggleRandomMove(false);
            await tracePath(path(previous, destination));
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

const contentScript = () => {
    window.addEventListener('DOMContentLoaded', () => {
        const box = document.createElement('p-mouse-pointer');
        const styleElement = document.createElement('style');
        styleElement.innerHTML = `
        p-mouse-pointer {
          pointer-events: none;
          position: absolute;
          top: 0;
          z-index: 10000;
          left: 0;
          width: 20px;
          height: 20px;
          background: rgba(0,0,0,.4);
          border: 1px solid white;
          border-radius: 10px;
          margin: -10px 0 0 -10px;
          padding: 0;
          transition: background .2s, border-radius .2s, border-color .2s;
        }
        p-mouse-pointer.button-1 {
          transition: none;
          background: rgba(0,0,0,0.9);
        }
        p-mouse-pointer.button-2 {
          transition: none;
          border-color: rgba(0,0,255,0.9);
        }
        p-mouse-pointer.button-3 {
          transition: none;
          border-radius: 4px;
        }
        p-mouse-pointer.button-4 {
          transition: none;
          border-color: rgba(255,0,0,0.9);
        }
        p-mouse-pointer.button-5 {
          transition: none;
          border-color: rgba(0,255,0,0.9);
        }
        p-mouse-pointer-hide {
          display: none
        }
      `;
        document.head.appendChild(styleElement);
        document.body.appendChild(box);
        document.addEventListener('mousemove', event => {
            box.style.left = String(event.pageX) + 'px';
            box.style.top = String(event.pageY) + 'px';
            box.classList.remove('p-mouse-pointer-hide');
            updateButtons(event.buttons);
        }, true);
        document.addEventListener('mousedown', event => {
            updateButtons(event.buttons);
            box.classList.add('button-' + String(event.which));
            box.classList.remove('p-mouse-pointer-hide');
        }, true);
        document.addEventListener('mouseup', event => {
            updateButtons(event.buttons);
            box.classList.remove('button-' + String(event.which));
            box.classList.remove('p-mouse-pointer-hide');
        }, true);
        document.addEventListener('mouseleave', event => {
            updateButtons(event.buttons);
            box.classList.add('p-mouse-pointer-hide');
        }, true);
        document.addEventListener('mouseenter', event => {
            updateButtons(event.buttons);
            box.classList.remove('p-mouse-pointer-hide');
        }, true);
        /* eslint-disable */
        function updateButtons(buttons) {
            for (let i = 0; i < 5; i++) {
                // @ts-ignore
                box.classList.toggle('button-' + String(i), buttons & (1 << i));
            }
        }
    }, false);
};
const installHelper = async (page, env) => {
    if (env.isPuppeteerPage(page)) {
        return await page.evaluateOnNewDocument(contentScript);
    }
    if (env.isPlaywrightPage(page)) {
        return await page.addInitScript(contentScript);
    }
    throw new Error('Unsupported driver');
};

class HumanizePlugin extends AutomationExtraPlugin {
    constructor(opts = {}) {
        super(opts);
    }
    static get id() {
        return 'humanize';
    }
    get defaults() {
        return {
            mouse: {
                enabled: true,
                showCursor: false
            }
        };
    }
    /** Enable the humanize plugin */
    enable() {
        this.opts.mouse.enabled = true;
    }
    /** Disable the humanize plugin */
    disable() {
        this.opts.mouse.enabled = false;
    }
    async onPageCreated(page) {
        this.debug('onPageCreated', this.opts);
        if (!this.opts.mouse.enabled) {
            return;
        }
        if (this.opts.mouse.showCursor) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            installHelper(page, this.env);
        }
        const cursor = createCursor(page);
        // TODO: Support elementHandle.click
        page.click = ((originalMethod, ctx) => {
            return async (selector, options) => {
                if (!this.opts.mouse.enabled) {
                    return await originalMethod.apply(ctx, [selector, options]);
                }
                try {
                    // TODO: Imitate regular page.click options (delay, etc)
                    return await cursor.click(selector);
                }
                catch (err) {
                    console.warn(`An error occured clicking on "${selector}":`, err.toString());
                    console.log('Skipping humanize and use vanilla click.');
                    return await originalMethod.apply(ctx, [selector, options]);
                }
            };
        })(page.click, page);
    }
}
/** Default export  */
const defaultExport = (opts) => {
    return new HumanizePlugin(opts);
};

export default defaultExport;
export { HumanizePlugin };
//# sourceMappingURL=index.esm.js.map
