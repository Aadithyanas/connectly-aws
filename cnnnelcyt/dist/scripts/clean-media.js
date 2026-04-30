"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function clean() {
    try {
        await (0, db_1.query)("UPDATE posts SET media_urls = ARRAY[]::TEXT[] WHERE media_urls = '{NULL}'::TEXT[] OR media_urls IS NULL");
        await (0, db_1.query)("UPDATE posts SET media_types = ARRAY[]::TEXT[] WHERE media_types = '{NULL}'::TEXT[] OR media_types IS NULL");
        console.log('Database media columns cleaned successfully.');
    }
    catch (e) {
        console.error(e);
    }
}
clean().finally(() => process.exit());
