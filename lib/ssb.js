"use strict";
// SPDX-FileCopyrightText: 2021 Andre 'Staltz' Medeiros
//
// SPDX-License-Identifier: MIT
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeSSB = void 0;
const SecretStack = require('secret-stack');
const makeConfig = require('ssb-config/inject');
const caps = require('ssb-caps');
const fs = require("fs");
const path = require("path");
const noop = () => { };
function makeSSB(authorsKeys, outputDir, followGraph) {
    const hops0Keys = authorsKeys[0];
    const peer = SecretStack({ caps })
        .use(require('ssb-master'))
        .use(require('ssb-logging'))
        .use(require('ssb-db'))
        .use(followGraph ? require('ssb-friends') : noop)
        .call(null, makeConfig('ssb', {
        path: outputDir,
        keys: hops0Keys,
        logging: {
            level: 'info',
        },
        friends: {
            hookReplicate: false,
        },
        connections: {
            incoming: {},
            outgoing: {},
        },
    }));
    saveSecret(hops0Keys, outputDir);
    for (let i = 1; i < authorsKeys.length; i++) {
        saveSecret(authorsKeys[i], outputDir, `secret-${i}`);
    }
    return peer;
}
exports.makeSSB = makeSSB;
function saveSecret(keys, outputDir, filename = 'secret') {
    const filePath = path.join(outputDir, filename);
    const fileContent = JSON.stringify(keys, null, 2);
    fs.writeFileSync(filePath, fileContent, { encoding: 'utf-8' });
}
