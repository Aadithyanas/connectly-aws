"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function checkAndTest() {
    try {
        const cols = await (0, db_1.query)("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'posts'");
        console.log('Columns:', cols.rows);
        const profiles = await (0, db_1.query)("SELECT id FROM profiles LIMIT 1");
        if (profiles.rows.length > 0) {
            const userId = profiles.rows[0].id;
            const insert = await (0, db_1.query)("INSERT INTO posts (user_id, content, media_urls, media_types) VALUES ($1, $2, $3, $4) RETURNING *", [userId, 'Automated Test Post', ['https://res.cloudinary.com/demo/image/upload/sample.jpg'], ['image']]);
            console.log('Inserted:', insert.rows[0]);
        }
    }
    catch (e) {
        console.error(e);
    }
}
checkAndTest().finally(() => process.exit());
