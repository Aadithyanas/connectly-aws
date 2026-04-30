"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function getUserRank() {
    const userId = 'fd4873d5-786f-4782-8401-aadbc6ac8214'; // Aadithyan
    try {
        const result = await (0, db_1.query)(`SELECT 
        COUNT(challenge_id) as solved_count,
        COALESCE(SUM(points), 0) as total_xp
       FROM challenge_solutions 
       WHERE user_id = $1`, [userId]);
        const xp = parseInt(result.rows[0].total_xp, 10);
        const solved = parseInt(result.rows[0].solved_count, 10);
        let tier = 'Bronze';
        if (xp >= 5000)
            tier = 'Master';
        else if (xp >= 1000)
            tier = 'Diamond';
        else if (xp >= 200)
            tier = 'Gold';
        else if (xp >= 50)
            tier = 'Silver';
        console.log(`User ID: ${userId}`);
        console.log(`Solved: ${solved}`);
        console.log(`Total XP: ${xp}`);
        console.log(`Calculated Tier: ${tier}`);
        process.exit(0);
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
}
getUserRank();
