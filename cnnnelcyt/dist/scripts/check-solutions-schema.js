"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
async function checkSolutionsSchema() {
    try {
        const result = await (0, db_1.query)("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'challenge_solutions'");
        console.table(result.rows);
        process.exit(0);
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
}
checkSolutionsSchema();
