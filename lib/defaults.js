"use strict";
// SPDX-FileCopyrightText: 2021 Andre 'Staltz' Medeiros
//
// SPDX-License-Identifier: MIT
Object.defineProperty(exports, "__esModule", { value: true });
exports.outputDir = exports.randomSeed = exports.INDEX_FEED_TYPES = exports.INDEX_FEEDS = exports.PROGRESS = exports.VERBOSE = exports.REPORT = exports.FOLLOW_GRAPH = exports.ALL_KEYS = exports.SLIM = exports.AUTHORS = exports.MESSAGES = void 0;
const generate_1 = require("./generate");
const path = require("path");
exports.MESSAGES = 1e4;
exports.AUTHORS = 150;
exports.SLIM = true;
exports.ALL_KEYS = false;
exports.FOLLOW_GRAPH = false;
exports.REPORT = true;
exports.VERBOSE = false;
exports.PROGRESS = false;
exports.INDEX_FEEDS = 0;
exports.INDEX_FEED_TYPES = 'about,contact';
exports.randomSeed = generate_1.generateRandomSeed;
const outputDir = () => path.join(process.cwd(), 'data');
exports.outputDir = outputDir;
