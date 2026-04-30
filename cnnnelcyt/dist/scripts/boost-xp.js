"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
const uuid_1 = require("uuid");
async function addDummySolutions() {
    const userId = 'fd4873d5-786f-4782-8401-aadbc6ac8214'; // Aadithyan
    const challenges = [
        { id: 'dummy-1', points: 30 },
        { id: 'dummy-2', points: 30 },
        { id: 'dummy-3', points: 30 },
        { id: 'dummy-4', points: 30 },
        { id: 'dummy-5', points: 30 },
        { id: 'dummy-6', points: 30 },
        { id: 'dummy-7', points: 30 },
    ];
    try {
        for (const ch of challenges) {
            await (0, db_1.query)(`INSERT INTO challenge_solutions (id, user_id, challenge_id, points, solved_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id, challenge_id) DO NOTHING`, [(0, uuid_1.v4)(), userId, ch.id, ch.points]);
        }
        console.log('Added dummy solutions to boost XP.');
        process.exit(0);
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
}
addDummySolutions();
