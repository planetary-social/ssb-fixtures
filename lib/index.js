"use strict";
// SPDX-FileCopyrightText: 2021 Andre 'Staltz' Medeiros
//
// SPDX-License-Identifier: MIT
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const fs = require("fs");
const path = require("path");
const pify = require("promisify-4loc");
const ora = require("ora");
const ssb_1 = require("./ssb");
const generate_1 = require("./generate");
const sample_1 = require("./sample");
const slimify_1 = require("./slimify");
const report_1 = require("./report");
const defaults = require("./defaults");
const index_feeds_1 = require("./index-feeds");
function* range(start, end) {
    if (start > end)
        return;
    let i = start;
    while (i <= end) {
        yield i;
        i++;
    }
}
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
process.on('uncaughtException', (err, origin) => {
    console.error('Uncaught Exception at ', origin, ':', err);
    process.exit(1);
});
module.exports = function generateFixture(opts) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    var _r;
    return __awaiter(this, void 0, void 0, function* () {
        const outputDir = (_a = opts === null || opts === void 0 ? void 0 : opts.outputDir) !== null && _a !== void 0 ? _a : defaults.outputDir();
        const numMessages = Math.max((_b = opts === null || opts === void 0 ? void 0 : opts.messages) !== null && _b !== void 0 ? _b : defaults.MESSAGES, 1);
        const numAuthors = Math.max((_c = opts === null || opts === void 0 ? void 0 : opts.authors) !== null && _c !== void 0 ? _c : defaults.AUTHORS, 1);
        const seed = (_d = opts === null || opts === void 0 ? void 0 : opts.seed) !== null && _d !== void 0 ? _d : defaults.randomSeed();
        const slim = (_e = opts === null || opts === void 0 ? void 0 : opts.slim) !== null && _e !== void 0 ? _e : defaults.SLIM;
        const allkeys = (_f = opts === null || opts === void 0 ? void 0 : opts.allkeys) !== null && _f !== void 0 ? _f : defaults.ALL_KEYS;
        const followGraph = (_g = opts === null || opts === void 0 ? void 0 : opts.followGraph) !== null && _g !== void 0 ? _g : defaults.FOLLOW_GRAPH;
        const report = (_h = opts === null || opts === void 0 ? void 0 : opts.report) !== null && _h !== void 0 ? _h : defaults.REPORT;
        const latestmsg = ((_j = opts === null || opts === void 0 ? void 0 : opts.latestmsg) !== null && _j !== void 0 ? _j : numMessages) - 1;
        const indexFeedsPercentage = (_k = opts === null || opts === void 0 ? void 0 : opts.indexFeeds) !== null && _k !== void 0 ? _k : defaults.INDEX_FEEDS;
        const indexFeedTypes = (_l = opts === null || opts === void 0 ? void 0 : opts.indexFeedTypes) !== null && _l !== void 0 ? _l : defaults.INDEX_FEED_TYPES;
        const verbose = (_m = opts === null || opts === void 0 ? void 0 : opts.verbose) !== null && _m !== void 0 ? _m : defaults.VERBOSE;
        const progress = (_o = opts === null || opts === void 0 ? void 0 : opts.progress) !== null && _o !== void 0 ? _o : defaults.PROGRESS;
        (0, sample_1.reset)();
        const spinner = progress ? ora('Setting up').start() : null;
        const authorsKeys = (0, generate_1.generateAuthors)(seed, numAuthors);
        const ssb = (0, ssb_1.makeSSB)(authorsKeys, outputDir, followGraph);
        const msgs = [];
        const msgsByType = {};
        const authors = authorsKeys.map((keys) => ssb.createFeed(keys));
        const follows = new Map(authors.map((a) => [a.id, new Set()]));
        const blocks = new Map(authors.map((a) => [a.id, new Set()]));
        function updateFollowsAndBlocks(msg) {
            const authorFollows = follows.get(msg.value.author);
            if (msg.value.content.following === true) {
                authorFollows.add(msg.value.content.contact);
            }
            else if (msg.value.content.following === false) {
                authorFollows.delete(msg.value.content.contact);
            }
            const authorBlocks = blocks.get(msg.value.author);
            if (msg.value.content.blocking === true) {
                authorBlocks.add(msg.value.content.contact);
            }
            else if (msg.value.content.blocking === false) {
                authorBlocks.delete(msg.value.content.contact);
            }
        }
        for (let i of range(0, numMessages - 1)) {
            if (spinner)
                spinner.text = `Generating msg ${i + 1} / ${numMessages}`;
            let author = (0, sample_1.paretoSample)(seed, authors);
            // OLDESTMSG and LATESTMSG are always authored by database owner
            if (i === 0 || i === latestmsg)
                author = authors[0];
            const content = yield (0, generate_1.generateMsgContent)(ssb, seed, i, latestmsg, author, msgsByType, authors, follows, blocks);
            const posted = yield pify(author.add)(content);
            if (posted === null || posted === void 0 ? void 0 : posted.value.content) {
                msgs.push(posted);
                if (typeof posted.value.content === 'string') {
                    (_p = msgsByType['private']) !== null && _p !== void 0 ? _p : (msgsByType['private'] = []);
                    msgsByType['private'].push(posted);
                }
                else {
                    (_q = msgsByType[_r = posted.value.content.type]) !== null && _q !== void 0 ? _q : (msgsByType[_r] = []);
                    msgsByType[posted.value.content.type].push(posted);
                    if (posted.value.content.type === 'contact') {
                        updateFollowsAndBlocks(posted);
                    }
                }
                if (verbose) {
                    console.log(`${JSON.stringify(posted, null, 2)}\n`);
                }
            }
        }
        spinner === null || spinner === void 0 ? void 0 : spinner.succeed(`Generated ${numMessages} messages`);
        if (report)
            (0, report_1.default)(msgs, msgsByType, authors, follows, outputDir);
        let graph;
        if (followGraph) {
            spinner === null || spinner === void 0 ? void 0 : spinner.start('Generating follow graph');
            graph = (yield pify(ssb.friends.graph)());
            // Convert from new style (numbers) to old style (boolean/null)
            for (const source of Object.keys(graph)) {
                for (const dest of Object.keys(graph[source])) {
                    const num = graph[source][dest];
                    if (num === 1)
                        graph[source][dest] = true;
                    else if (num === -1)
                        graph[source][dest] = false;
                    else if (num < -1)
                        graph[source][dest] = null;
                }
            }
            const graphFilepath = path.join(outputDir, 'follow-graph.json');
            const graphJSON = JSON.stringify(graph, null, 2);
            yield fs.promises.writeFile(graphFilepath, graphJSON, { encoding: 'utf-8' });
            spinner === null || spinner === void 0 ? void 0 : spinner.succeed('Generated follow graph');
        }
        yield pify(ssb.close)();
        if (indexFeedsPercentage) {
            yield (0, index_feeds_1.writeIndexFeeds)(seed, indexFeedsPercentage, indexFeedTypes, authors, graph, spinner, outputDir);
        }
        if (slim)
            (0, slimify_1.default)(authors.length, outputDir, allkeys);
    });
};
