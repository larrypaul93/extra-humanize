"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bezierCurve = exports.overshoot = exports.generateBezierAnchors = exports.randomVectorOnLine = exports.randomNumberRange = exports.setMagnitude = exports.unit = exports.magnitude = exports.perpendicular = exports.direction = exports.add = exports.mult = exports.div = exports.sub = exports.origin = void 0;
// Taken from: https://github.com/Xetera/ghost-cursor/blob/master/src/math.ts
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Bezier = require('bezier-js');
exports.origin = { x: 0, y: 0 };
// maybe i should've just imported a vector library lol
const sub = (a, b) => ({
    x: a.x - b.x,
    y: a.y - b.y
});
exports.sub = sub;
const div = (a, b) => ({
    x: a.x / b,
    y: a.y / b
});
exports.div = div;
const mult = (a, b) => ({
    x: a.x * b,
    y: a.y * b
});
exports.mult = mult;
const add = (a, b) => ({
    x: a.x + b.x,
    y: a.y + b.y
});
exports.add = add;
const direction = (a, b) => exports.sub(b, a);
exports.direction = direction;
const perpendicular = (a) => ({ x: a.y, y: -1 * a.x });
exports.perpendicular = perpendicular;
const magnitude = (a) => Math.sqrt(Math.pow(a.x, 2) + Math.pow(a.y, 2));
exports.magnitude = magnitude;
const unit = (a) => exports.div(a, exports.magnitude(a));
exports.unit = unit;
const setMagnitude = (a, amount) => exports.mult(exports.unit(a), amount);
exports.setMagnitude = setMagnitude;
const randomNumberRange = (min, max) => Math.random() * (max - min) + min;
exports.randomNumberRange = randomNumberRange;
const randomVectorOnLine = (a, b) => {
    const vec = exports.direction(a, b);
    const multiplier = Math.random();
    return exports.add(a, exports.mult(vec, multiplier));
};
exports.randomVectorOnLine = randomVectorOnLine;
const randomNormalLine = (a, b, range) => {
    const randMid = exports.randomVectorOnLine(a, b);
    const normalV = exports.setMagnitude(exports.perpendicular(exports.direction(a, randMid)), range);
    return [randMid, normalV];
};
const generateBezierAnchors = (a, b, spread) => {
    const side = Math.round(Math.random()) === 1 ? 1 : -1;
    const calc = () => {
        const [randMid, normalV] = randomNormalLine(a, b, spread);
        const choice = exports.mult(normalV, side);
        return exports.randomVectorOnLine(randMid, exports.add(randMid, choice));
    };
    return [calc(), calc()].sort((a, b) => a.x - b.x);
};
exports.generateBezierAnchors = generateBezierAnchors;
const clamp = (target, min, max) => Math.min(max, Math.max(min, target));
const overshoot = (coordinate, radius) => {
    const a = Math.random() * 2 * Math.PI;
    const rad = radius * Math.sqrt(Math.random());
    const vector = { x: rad * Math.cos(a), y: rad * Math.sin(a) };
    return exports.add(coordinate, vector);
};
exports.overshoot = overshoot;
const bezierCurve = (start, finish, overrideSpread) => {
    // could be played around with
    const min = 2;
    const max = 200;
    const vec = exports.direction(start, finish);
    const length = exports.magnitude(vec);
    const spread = clamp(length, min, max);
    const anchors = exports.generateBezierAnchors(start, finish, overrideSpread !== null && overrideSpread !== void 0 ? overrideSpread : spread);
    return new Bezier(start, ...anchors, finish);
};
exports.bezierCurve = bezierCurve;
//# sourceMappingURL=math.js.map