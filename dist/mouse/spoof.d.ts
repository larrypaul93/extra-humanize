import { Vector } from './math';
import type { Puppeteer, Playwright } from 'automation-extra-plugin';
declare type Page = Puppeteer.Page | Playwright.Page;
declare type ElementHandle = Puppeteer.ElementHandle | Playwright.ElementHandle;
interface BoxOptions {
    readonly paddingPercentage: number;
}
interface MoveOptions extends BoxOptions {
    readonly waitForSelector: number;
}
interface ClickOptions extends MoveOptions {
    readonly waitForClick: number;
}
export declare const createCursor: (page: Page, start?: Vector, performRandomMoves?: boolean) => {
    toggleRandomMove(random: boolean): void;
    click(selector?: string | ElementHandle | undefined, options?: ClickOptions | undefined): Promise<void>;
    move(selector: string | ElementHandle, options?: MoveOptions | undefined): Promise<void>;
    moveTo(destination: Vector): Promise<void>;
};
export {};
