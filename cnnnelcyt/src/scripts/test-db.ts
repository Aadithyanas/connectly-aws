import { query } from '../db';
async function checkAndTest() {
    try {
        const cols = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'posts'");
        console.log('Columns:', cols.rows);

        const profiles = await query("SELECT id FROM profiles LIMIT 1");
        if (profiles.rows.length > 0) {
            const userId = profiles.rows[0].id;
            const insert = await query(
                "INSERT INTO posts (user_id, content, media_urls, media_types) VALUES ($1, $2, $3, $4) RETURNING *",
                [userId, 'Automated Test Post', ['https://res.cloudinary.com/demo/image/upload/sample.jpg'], ['image']]
            );
            console.log('Inserted:', insert.rows[0]);
        }
    } catch (e) {
        console.error(e);
    }
}
checkAndTest().finally(() => process.exit());
