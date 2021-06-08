import { Vector } from './math';
import type { Box } from './types';
export declare function path(point: Vector, target: Vector, spreadOverride?: number): Vector[];
export declare function path(point: Vector, target: Box, spreadOverride?: number): Vector[];
