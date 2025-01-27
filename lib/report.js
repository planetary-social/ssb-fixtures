"use strict";
// SPDX-FileCopyrightText: 2021 Andre 'Staltz' Medeiros
//
// SPDX-License-Identifier: MIT
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
function calculateMsgsByHops(msgs, authors, follows) {
    const self = authors[0];
    const hops = {
        0: new Set(),
        1: new Set(),
        2: new Set(),
        3: new Set(),
    };
    for (let author of authors) {
        if (author.id === self.id)
            hops[0].add(author.id);
        else if (follows.get(self.id).has(author.id))
            hops[1].add(author.id);
    }
    for (let author of authors) {
        if (hops[0].has(author.id))
            continue;
        if (hops[1].has(author.id))
            continue;
        if (Array.from(hops[1]).some((hop1id) => follows.get(hop1id).has(author.id))) {
            hops[2].add(author.id);
        }
        else {
            hops[3].add(author.id);
        }
    }
    const msgsByHops = {
        0: 0,
        1: 0,
        2: 0,
        3: 0,
    };
    for (let msg of msgs) {
        if (hops[0].has(msg.value.author))
            msgsByHops[0] += 1;
        if (hops[1].has(msg.value.author))
            msgsByHops[1] += 1;
        if (hops[2].has(msg.value.author))
            msgsByHops[2] += 1;
        if (hops[3].has(msg.value.author))
            msgsByHops[3] += 1;
    }
    return msgsByHops;
}
function* produceReport(msgs, msgsByType, authors, follows) {
    const self = authors[0];
    yield '# Stats for this fixture';
    yield '';
    yield `The main feed is ${self.id} (hop 0).`;
    yield '';
    yield `There are ${msgs.length} msgs in total, from ${authors.length} possible authors.`;
    yield '';
    yield '## Messages per type';
    yield '';
    for (let type of Object.keys(msgsByType)) {
        const count = msgsByType[type].length;
        yield `- There are ${count} msgs of type "${type}"`;
    }
    const msgsByHops = calculateMsgsByHops(msgs, authors, follows);
    yield '';
    yield '## Messages per hop distance';
    yield '';
    yield `- There are ${msgsByHops[0]} msgs from hop 0`;
    yield `- There are ${msgsByHops[1]} msgs from hop 1`;
    yield `- There are ${msgsByHops[2]} msgs from hop 2`;
    yield `- There are ${msgsByHops[3]} msgs from hop 3+`;
}
function writeReportFile(msgs, msgsByType, authors, follows, outputDir) {
    const gen = produceReport(msgs, msgsByType, authors, follows);
    const filePath = path.join(outputDir, 'report.md');
    let fileContent = '';
    for (let line of gen) {
        // console.log(line);
        fileContent += line + '\n';
    }
    // console.log(filePath, fileContent);
    fs.writeFileSync(filePath, fileContent, { encoding: 'utf-8' });
}
exports.default = writeReportFile;
