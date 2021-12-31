"use strict";
// SPDX-FileCopyrightText: 2021 Andre 'Staltz' Medeiros
//
// SPDX-License-Identifier: MIT
Object.defineProperty(exports, "__esModule", { value: true });
exports.somewhatGaussian = exports.uniformSample = exports.paretoSample = exports.randomInt = exports.sampleCollection = exports.random = exports.reset = void 0;
const { sample, prng } = require('implausible');
let __x = 0;
let __seed = '';
function instanceSeed(seed) {
    const iseed = `${__x}${seed}`;
    __x += 1;
    return iseed;
}
function reset() {
    __x = 0;
    __seed = '';
}
exports.reset = reset;
function random(seed) {
    if (!__seed && seed)
        __seed = seed;
    if (!__seed && !seed)
        throw new Error('missing seed!');
    return prng({ seed: instanceSeed(__seed) });
}
exports.random = random;
function sampleCollection(seed, obj) {
    return sample({ collection: obj, seed: instanceSeed(seed) });
}
exports.sampleCollection = sampleCollection;
function randomInt(seed, min, max) {
    const intmin = Math.ceil(min);
    const intmax = Math.floor(max);
    return Math.round(intmin + random(seed) * (intmax - intmin));
}
exports.randomInt = randomInt;
function paretoSample(seed, arr, shapeParam = 2, min = 0) {
    const i = Math.max(min, Math.floor(Math.pow(random(seed), shapeParam) * arr.length));
    return arr[i];
}
exports.paretoSample = paretoSample;
function uniformSample(seed, arr) {
    const i = Math.floor(random(seed) * arr.length);
    return arr[i];
}
exports.uniformSample = uniformSample;
function somewhatGaussian(seed) {
    return (random(seed) + random(seed)) * 0.5;
}
exports.somewhatGaussian = somewhatGaussian;
