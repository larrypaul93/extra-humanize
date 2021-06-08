"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.path = void 0;
const math_1 = require("./math");
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
    const curve = math_1.bezierCurve(start, end, spreadOverride);
    const length = curve.length() * 0.8;
    const baseTime = Math.random() * minSteps;
    const steps = Math.ceil((Math.log2(fitts(length, width) + 1) + baseTime) * 3);
    const re = curve.getLUT(steps);
    return clampPositive(re);
}
exports.path = path;
const clampPositive = (vectors) => {
    const clamp0 = (elem) => Math.max(0, elem);
    return vectors.map(vector => {
        return {
            x: clamp0(vector.x),
            y: clamp0(vector.y)
        };
    });
};
//# sourceMappingURL=calc.js.map