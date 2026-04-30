import { query } from '../db';
async function clean() {
    try {
        await query("UPDATE posts SET media_urls = ARRAY[]::TEXT[] WHERE media_urls = '{NULL}'::TEXT[] OR media_urls IS NULL");
        await query("UPDATE posts SET media_types = ARRAY[]::TEXT[] WHERE media_types = '{NULL}'::TEXT[] OR media_types IS NULL");
        console.log('Database media columns cleaned successfully.');
    } catch (e) {
        console.error(e);
    }
}
clean().finally(() => process.exit());
