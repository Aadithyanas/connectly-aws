"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function checkPosts() {
    try {
        const result = await (0, db_1.query)("SELECT id, user_id, title, media_urls, media_types FROM posts ORDER BY created_at DESC LIMIT 5");
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
}
checkPosts();
