"use strict";
// SPDX-FileCopyrightText: 2021 Andre 'Staltz' Medeiros
//
// SPDX-License-Identifier: MIT
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const fs = require("fs");
const path = require("path");
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
function slimify(authorCount, outputDir, allkeys) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ssb-fixture-gen-'));
    const preserved = [
        'secret',
        ...(allkeys
            ? Array(authorCount - 1)
                .fill(0)
                .map((_, i) => `secret-${i + 1}`)
            : []),
        'flume/log.offset',
        'follow-graph.json',
        'report.md',
    ];
    for (let p of preserved) {
        if (fs.existsSync(path.join(outputDir, p))) {
            mkdirp.sync(path.dirname(path.join(tmpDir, p)));
            fs.copyFileSync(path.join(outputDir, p), path.join(tmpDir, p));
        }
    }
    rimraf.sync(outputDir, { maxBusyTries: 3 }); // Windows needs the opts
    fs.mkdirSync(outputDir);
    for (let p of preserved) {
        if (fs.existsSync(path.join(tmpDir, p))) {
            mkdirp.sync(path.dirname(path.join(outputDir, p)));
            fs.copyFileSync(path.join(tmpDir, p), path.join(outputDir, p));
        }
    }
}
exports.default = slimify;
