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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeIndexFeeds = void 0;
const fs = require("fs");
const path = require("path");
const os = require("os");
const util = require("util");
const pify = util.promisify;
const rimraf = require('rimraf');
const pull = require('pull-stream');
const codec = require('flumecodec');
const Flume = require('flumedb');
const OffsetLog = require('flumelog-offset');
const { where, gt, toAsyncIter } = require('ssb-db2/operators');
const caps = require('ssb-caps');
const fromEvent = require('pull-stream-util/from-event');
const SecretStack = require('secret-stack');
const ssbKeys = require('ssb-keys');
const sleep = require('util').promisify(setTimeout);
const sample_1 = require("./sample");
function sampleAuthors(seed, authors, total) {
    const sampled = [];
    // Sample other authors, but don't sample ones that are already recipient
    while (sampled.length < total) {
        let other;
        // Keep generating new `other` until `sampled` is filled-up with unique ids
        do {
            other = (0, sample_1.paretoSample)(seed, authors).id;
        } while (sampled.some((r) => other === r));
        sampled.push(other);
    }
    return sampled
        .map((feedId) => authors.findIndex((author) => author.id === feedId))
        .filter((idx) => {
        if (idx < 0)
            throw new Error('sampleAuthors failed');
        else
            return true;
    });
}
function copyFlumelogOffset(origDir, destDir) {
    const flumeLogPath = path.join(origDir, 'flume', 'log.offset');
    fs.mkdirSync(path.join(destDir, 'flume'));
    fs.copyFileSync(flumeLogPath, path.join(destDir, 'flume', 'log.offset'));
}
function copySecret(origDir, destDir, i) {
    fs.copyFileSync(path.join(origDir, 'secret' + (i > 0 ? `-${i}` : '')), path.join(destDir, 'secret'));
}
function startSbot(dir) {
    return SecretStack({ caps })
        .use(require('ssb-db2'))
        .use(require('ssb-meta-feeds'))
        .use(require('ssb-index-feed-writer'))
        .call(null, {
        path: dir,
        keys: ssbKeys.loadOrCreateSync(path.join(dir, 'secret')),
        db2: {
            automigrate: true,
            dangerouslyKillFlumeWhenMigrated: true,
            _ssbFixtures: true,
        },
    });
}
function migrateDone(sbot) {
    return new Promise((resolve, reject) => {
        pull(fromEvent('ssb:db2:migrate:progress', sbot), pull.filter((x) => x === 1), pull.take(1), pull.collect((err) => {
            if (err)
                reject(err);
            else
                resolve(void 0);
        }));
    });
}
function openFlumedb(dir) {
    const flumeLogPath = path.join(dir, 'flume', 'log.offset');
    return Flume(OffsetLog(flumeLogPath, { codec: codec.json }));
}
function recentlyWrittenMsgs(timestamp, sbot) {
    return sbot.db.query(where(gt(timestamp, 'timestamp')), toAsyncIter());
}
function sanitizeMsg(msg) {
    if (msg.meta && msg.meta.originalContent) {
        msg.value.content = msg.meta.originalContent;
        delete msg.meta;
    }
    return msg;
}
function writeIndexFeeds(seed, indexFeedsPercentage, indexFeedTypes, authors, followGraph, spinner, outputDir) {
    var e_1, _a;
    return __awaiter(this, void 0, void 0, function* () {
        spinner === null || spinner === void 0 ? void 0 : spinner.start('Generating index feeds');
        // Pick which authors will write indexFeeds
        const totalIndexAuthors = Math.round((authors.length * indexFeedsPercentage) / 100);
        const sampledAuthorIdxs = sampleAuthors(seed, authors, totalIndexAuthors);
        // For each picked author:
        for (let i = 1; i <= totalIndexAuthors; i++) {
            const idx = sampledAuthorIdxs[i - 1];
            if (spinner) {
                spinner.text = `Generating index feeds [setup] for author ${i} / ${totalIndexAuthors}`;
            }
            const lowestTimestamp = Date.now();
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'index-feed-writer'));
            copyFlumelogOffset(outputDir, tempDir);
            copySecret(outputDir, tempDir, idx);
            const sbot = startSbot(tempDir);
            yield migrateDone(sbot);
            const author = authors[idx].id;
            for (let type of indexFeedTypes.split(',')) {
                if (spinner) {
                    spinner.text = `Generating index feeds (${type}) for author ${i} / ${totalIndexAuthors}`;
                }
                if (type === 'private') {
                    type = null;
                    yield pify(sbot.indexFeedWriter.start)({ author, type, private: true });
                }
                else {
                    yield pify(sbot.indexFeedWriter.start)({ author, type, private: false });
                }
            }
            yield Promise.all(indexFeedTypes
                .split(',')
                .map((type) => type === 'private'
                ? pify(sbot.indexFeedWriter.doneOld)({
                    author,
                    type: null,
                    private: true,
                })
                : pify(sbot.indexFeedWriter.doneOld)({
                    author,
                    type,
                    private: false,
                })));
            const flumedb = openFlumedb(outputDir);
            try {
                for (var _b = (e_1 = void 0, __asyncValues(recentlyWrittenMsgs(lowestTimestamp, sbot))), _c; _c = yield _b.next(), !_c.done;) {
                    const msg = _c.value;
                    const flumeMsg = sanitizeMsg(msg);
                    yield pify(flumedb.append)(flumeMsg);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            yield pify(flumedb.close)();
            yield sleep(500); // wait for indexes to be written properly
            yield pify(sbot.close)();
            yield sleep(500); // wait for indexes to be written properly
            rimraf.sync(tempDir);
        }
        spinner === null || spinner === void 0 ? void 0 : spinner.succeed(`Generated index feeds for ${totalIndexAuthors} authors`);
    });
}
exports.writeIndexFeeds = writeIndexFeeds;
