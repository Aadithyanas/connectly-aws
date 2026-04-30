"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function migrate() {
    console.log('Starting final migration...');
    try {
        // 1. Add title column to posts
        await (0, db_1.query)("ALTER TABLE posts ADD COLUMN IF NOT EXISTS title TEXT");
        console.log('Added title column to posts');
        // 2. Ensure media_urls and media_types are correctly typed and have defaults
        await (0, db_1.query)("ALTER TABLE posts ALTER COLUMN media_urls SET DEFAULT ARRAY[]::TEXT[]");
        await (0, db_1.query)("ALTER TABLE posts ALTER COLUMN media_types SET DEFAULT ARRAY[]::TEXT[]");
        // 3. Clean up any NULLs again just in case
        await (0, db_1.query)("UPDATE posts SET media_urls = ARRAY[]::TEXT[] WHERE media_urls IS NULL");
        await (0, db_1.query)("UPDATE posts SET media_types = ARRAY[]::TEXT[] WHERE media_types IS NULL");
        console.log('Migration completed successfully');
    }
    catch (err) {
        console.error('Migration failed:', err);
    }
    finally {
        process.exit();
    }
}
migrate();
