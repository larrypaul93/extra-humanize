import { AutomationExtraPlugin, NestedPartial } from 'automation-extra-plugin';
import type { Page } from 'automation-extra-plugin';
export interface MouseOpts {
    /** Enable human mouse movements when clicking */
    enabled: boolean;
    /** Show a visible cursor (for testing, not for production) */
    showCursor: boolean;
}
export interface HumanizePluginOpts {
    mouse: MouseOpts;
}
export declare class HumanizePlugin extends AutomationExtraPlugin<HumanizePluginOpts> {
    constructor(opts?: NestedPartial<HumanizePluginOpts>);
    static get id(): string;
    get defaults(): {
        mouse: {
            enabled: boolean;
            showCursor: boolean;
        };
    };
    /** Enable the humanize plugin */
    enable(): void;
    /** Disable the humanize plugin */
    disable(): void;
    onPageCreated(page: Page): Promise<void>;
}
/** Default export  */
declare const defaultExport: (opts?: NestedPartial<HumanizePluginOpts> | undefined) => HumanizePlugin;
export default defaultExport;
