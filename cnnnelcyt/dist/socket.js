"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setIO = setIO;
exports.getIO = getIO;
// Singleton io instance — set once in index.ts, read anywhere in controllers
let _io = null;
function setIO(io) {
    _io = io;
}
function getIO() {
    return _io;
}
