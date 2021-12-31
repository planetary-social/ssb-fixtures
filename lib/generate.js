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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMsgContent = exports.generateAuthors = exports.generateRandomSeed = void 0;
const crypto = require("crypto");
const ssbKeys = require('ssb-keys');
const lorem_ipsum_1 = require("lorem-ipsum");
const freq = require("./frequencies");
const sample_1 = require("./sample");
let __lorem;
function generateRandomSeed() {
    return crypto
        .randomBytes(64)
        .toString('ascii')
        .replace(/\W/g, '')
        .substr(0, 24);
}
exports.generateRandomSeed = generateRandomSeed;
function generateBlobId() {
    const blob = Buffer.alloc(32);
    Buffer.from(__lorem.generateWords(9).replace(/\W/g, ''), 'utf-8').copy(blob);
    return '&' + blob.toString('base64') + '.sha256';
}
function generateMentions(seed, authors) {
    return Array.from({ length: (0, sample_1.randomInt)(seed, 1, 4) }, () => {
        const mentionType = (0, sample_1.sampleCollection)(seed, freq.MENTION_LINK_FREQUENCIES);
        if (mentionType === 'author') {
            const author = (0, sample_1.paretoSample)(seed, authors);
            return {
                link: author.id,
                name: __lorem.generateWords((0, sample_1.randomInt)(seed, 1, 3)),
            };
        }
        else if (mentionType === 'blob') {
            return Object.assign({ link: generateBlobId(), type: (0, sample_1.sampleCollection)(seed, freq.BLOB_TYPE_FREQUENCIES), size: Math.round((0, sample_1.somewhatGaussian)(seed) * 2e6) }, ((0, sample_1.random)(seed) < freq.MENTION_BLOB_NAME_FREQUENCY
                ? {
                    name: __lorem.generateWords((0, sample_1.randomInt)(seed, 1, 3)),
                }
                : {}));
        }
        else if (mentionType === 'channel') {
            return { link: '#' + __lorem.generateWords(1) };
        }
    });
}
function generateRecipients(seed, author, authors) {
    if (authors.length <= 1)
        return [author.id];
    const quantity = (0, sample_1.randomInt)(seed, 1, Math.min(authors.length - 1, 7));
    // Always include author
    const recps = [author.id];
    // Sample other authors, but don't sample ones that are already recipient
    while (recps.length < quantity) {
        let other;
        do {
            other = (0, sample_1.paretoSample)(seed, authors).id;
        } while (recps.some((r) => other === r));
        recps.push(other);
    }
    return recps;
}
function generatePostContent(seed, i, latestmsg, msgsByType, authors, type = 'post') {
    var _a, _b, _c;
    const textSize = (0, sample_1.sampleCollection)(seed, freq.POST_SIZE_FREQUENCIES);
    // Text
    const content = {
        type: 'post',
        text: textSize === 'short'
            ? __lorem.generateWords((0, sample_1.randomInt)(seed, 1, 5))
            : textSize === 'medium'
                ? __lorem.generateSentences((0, sample_1.randomInt)(seed, 1, 5))
                : __lorem.generateParagraphs((0, sample_1.randomInt)(seed, 1, 5)),
    };
    // OLDESTMSG and LATESTMSG markers
    if (i === 0) {
        content.text = 'OLDESTMSG ' + content.text;
    }
    if (i === latestmsg) {
        content.text = 'LATESTMSG ' + content.text;
    }
    // Channel
    if ((0, sample_1.random)(seed) < freq.POST_CHANNEL_FREQUENCY) {
        content.channel = __lorem.generateWords(1);
    }
    // Replies
    if (type !== 'private' && // Private msg should not reply to `other` public msg
        i < latestmsg && // Don't make the last msg a reply, it should be root
        ((_b = (_a = msgsByType.post) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) >= 2 && // Only reply if there are other post
        (0, sample_1.random)(seed) < freq.POST_REPLY_FREQUENCY) {
        const min = 1; // avoid 0, to never reply to the OLDESTMSG
        const other = (0, sample_1.paretoSample)(seed, msgsByType.post, 1.6, min);
        if ((_c = other.value.content) === null || _c === void 0 ? void 0 : _c.root) {
            if ((0, sample_1.random)(seed) < freq.POST_REPLY_FORK_FREQUENCY) {
                content.root = other.key;
                content.branch = other.key;
                content.fork = other.value.content.root;
            }
            else {
                content.root = other.value.content.root;
                content.branch = other.key;
            }
        }
        else {
            content.root = other.key;
            content.branch = other.key;
        }
    }
    // Mentions
    if ((0, sample_1.random)(seed) < freq.POST_MENTIONS_FREQUENCY) {
        content.mentions = generateMentions(seed, authors);
    }
    return content;
}
function generatePrivate(ssb, seed, i, latestmsg, msgsByType, author, authors) {
    const content = generatePostContent(seed, i, latestmsg, msgsByType, authors, 'private');
    const recps = generateRecipients(seed, author, authors);
    content.recps = recps;
    return ssbKeys.box(content, content.recps);
}
function generateVoteContent(seed, msgsByType) {
    const other = (0, sample_1.paretoSample)(seed, msgsByType.post);
    return {
        type: 'vote',
        vote: {
            link: other.key,
            value: (0, sample_1.random)(seed) < freq.VOTE_NEGATIVE_FREQUENCY ? -1 : +1,
            expression: 'y',
        },
    };
}
function generateContactContent(seed, author, authors, follows, blocks) {
    // Sample other authors, but don't sample ourself
    let contact;
    do {
        contact = (0, sample_1.paretoSample)(seed, authors).id;
    } while (contact === author.id && authors.length > 1);
    let subtype = (0, sample_1.sampleCollection)(seed, freq.CONTACT_TYPE_FREQUENCIES);
    const authorFollows = follows.get(author.id);
    const authorBlocks = blocks.get(author.id);
    if (subtype === 'unfollow') {
        if (authorFollows.size > 0) {
            contact = (0, sample_1.uniformSample)(seed, Array.from(authorFollows));
        }
        else {
            subtype = 'follow';
        }
    }
    else if (subtype === 'unblock') {
        if (authorBlocks.size > 0) {
            contact = (0, sample_1.uniformSample)(seed, Array.from(authorBlocks));
        }
        else {
            subtype = 'block';
        }
    }
    const content = { type: 'contact', contact };
    if (subtype === 'follow')
        content.following = true;
    else if (subtype === 'unfollow')
        content.following = false;
    else if (subtype === 'block')
        content.blocking = true;
    else if (subtype === 'unblock')
        content.blocking = false;
    return content;
}
function generateAuthors(seed, numAuthors) {
    return Array.from({ length: numAuthors }, (_, i) => {
        const ed25519seed = Buffer.alloc(32);
        Buffer.from(`${i}${seed}`, 'utf-8').copy(ed25519seed);
        return ssbKeys.generate('ed25519', ed25519seed);
    });
}
exports.generateAuthors = generateAuthors;
function generateAboutImage(seed) {
    const subtype = (0, sample_1.sampleCollection)(seed, freq.ABOUT_IMAGE_TYPE_FREQUENCIES);
    if (subtype === 'big_object') {
        return {
            link: generateBlobId(),
            type: (0, sample_1.sampleCollection)(seed, freq.BLOB_IMAGE_TYPE_FREQUENCIES),
            size: Math.round((0, sample_1.somewhatGaussian)(seed) * 2e6),
            width: Math.round((0, sample_1.somewhatGaussian)(seed) * 1600),
            height: Math.round((0, sample_1.somewhatGaussian)(seed) * 1600),
        };
    }
    if (subtype === 'small_object') {
        return {
            link: generateBlobId(),
        };
    }
    if (subtype === 'string') {
        return generateBlobId();
    }
}
function generateAboutContent(seed, author, authors) {
    const about = (0, sample_1.random)(seed) < freq.ABOUT_OTHER_FREQUENCY
        ? (0, sample_1.uniformSample)(seed, authors).id
        : author.id;
    const subtype = (0, sample_1.sampleCollection)(seed, freq.ABOUT_TYPE_FREQUENCIES);
    const hasName = subtype === 'name' ||
        subtype === 'name_and_description' ||
        subtype === 'name_and_image' ||
        subtype === 'name_and_image_and_description';
    const hasImage = subtype === 'image' ||
        subtype === 'image_and_description' ||
        subtype === 'name_and_image' ||
        subtype === 'name_and_image_and_description';
    const hasDescription = subtype === 'description' ||
        subtype === 'image_and_description' ||
        subtype === 'name_and_description' ||
        subtype === 'name_and_image_and_description';
    const content = { type: 'about', about };
    if (hasName)
        content.name = __lorem.generateWords((0, sample_1.randomInt)(seed, 1, 3));
    if (hasImage)
        content.image = generateAboutImage(seed);
    if (hasDescription) {
        content.description = __lorem.generateSentences((0, sample_1.randomInt)(seed, 1, 5));
    }
    return content;
}
function generateOtherContent(seed) {
    const number = (0, sample_1.randomInt)(seed, 1, 1000);
    return { type: 'other', number, etc: 'Does not matter' };
}
function generateMsgContent(ssb, seed, i, latestmsg, author, msgsByType, authors, follows, blocks) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        __lorem = new lorem_ipsum_1.LoremIpsum({
            random: sample_1.random,
            sentencesPerParagraph: {
                max: 8,
                min: 4,
            },
            wordsPerSentence: {
                max: 16,
                min: 4,
            },
        });
        const type = (0, sample_1.sampleCollection)(seed, freq.MSG_TYPE_FREQUENCIES);
        // Oldest and latest msgs are always a post authored by database owner
        if (i === 0 || i === latestmsg) {
            return generatePostContent(seed, i, latestmsg, msgsByType, authors);
        }
        else if (type === 'vote' && ((_a = msgsByType.post) === null || _a === void 0 ? void 0 : _a.length)) {
            return generateVoteContent(seed, msgsByType);
        }
        else if (type === 'contact') {
            return generateContactContent(seed, author, authors, follows, blocks);
        }
        else if (type === 'about') {
            return generateAboutContent(seed, author, authors);
        }
        else if (type === 'private') {
            const [a, as] = [author, authors]; // sorry Prettier, i want a one-liner
            return generatePrivate(ssb, seed, i, latestmsg, msgsByType, a, as);
        }
        else if (type === 'post') {
            return generatePostContent(seed, i, latestmsg, msgsByType, authors);
        }
        else if (type === 'other') {
            return generateOtherContent(seed);
        }
        else {
            throw new Error('Cannot generate unknown msg type ' + type);
        }
    });
}
exports.generateMsgContent = generateMsgContent;
