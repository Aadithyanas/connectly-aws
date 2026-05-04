import { query } from '../src/db';

async function createJobsTable() {
  console.log('Creating jobs table...');
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        company_logo TEXT,
        location VARCHAR(255) NOT NULL,
        job_type VARCHAR(100),
        description TEXT NOT NULL,
        apply_link TEXT NOT NULL,
        salary_range VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await query(`CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs(title);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_name);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);`);
    
    console.log('Jobs table created successfully!');
  } catch (error) {
    console.error('Error creating jobs table:', error);
  }
}

createJobsTable();
