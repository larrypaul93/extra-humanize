"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumanizePlugin = void 0;
const automation_extra_plugin_1 = require("automation-extra-plugin");
const mouse = require("./mouse/spoof");
const mouseHelper = require("./mouse/helper");
class HumanizePlugin extends automation_extra_plugin_1.AutomationExtraPlugin {
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
            mouseHelper.installHelper(page, this.env);
        }
        const cursor = mouse.createCursor(page);
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
exports.HumanizePlugin = HumanizePlugin;
/** Default export  */
const defaultExport = (opts) => {
    return new HumanizePlugin(opts);
};
exports.default = defaultExport;
//# sourceMappingURL=index.js.map