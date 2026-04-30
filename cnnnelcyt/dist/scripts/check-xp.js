"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function checkXP() {
    try {
        console.log('--- Database Check ---');
        // Check challenge_solutions table
        const solutionsResult = await (0, db_1.query)('SELECT * FROM challenge_solutions LIMIT 10');
        console.log('\nChallenge Solutions (First 10):');
        console.table(solutionsResult.rows);
        // Check specific user solutions
        const userSolutions = await (0, db_1.query)('SELECT * FROM challenge_solutions WHERE user_id = $1', ['fd4873d5-786f-4782-8401-aadbc6ac8214']);
        console.log('\nSolutions for Aadithyan:');
        console.table(userSolutions.rows);
        process.exit(0);
    }
    catch (error) {
        console.error('Error checking XP:', error);
        process.exit(1);
    }
}
checkXP();
