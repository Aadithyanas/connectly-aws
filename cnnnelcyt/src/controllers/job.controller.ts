import { Request, Response } from 'express';
import { query } from '../db';
import { getIO } from '../socket';

// GET /api/jobs
export const getJobs = async (req: Request, res: Response): Promise<void> => {
  const { title, location, company, limit = 20, offset = 0 } = req.query;
  
  try {
    let queryText = `
      SELECT j.*, p.name as poster_name, p.avatar_url as poster_avatar, p.role as poster_role
      FROM jobs j
      JOIN profiles p ON j.user_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (title) {
      params.push(`%${title}%`);
      queryText += ` AND j.title ILIKE $${params.length}`;
    }
    
    if (location) {
      params.push(`%${location}%`);
      queryText += ` AND j.location ILIKE $${params.length}`;
    }
    
    if (company) {
      params.push(`%${company}%`);
      queryText += ` AND j.company_name ILIKE $${params.length}`;
    }
    
    queryText += ` ORDER BY j.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await query(queryText, params);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('[getJobs]', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/jobs
export const createJob = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { 
    title, 
    company_name, 
    company_logo, 
    location, 
    job_type, 
    description, 
    apply_link, 
    salary_range 
  } = req.body;
  
  try {
    // Check if user is a professional
    const userResult = await query('SELECT role FROM profiles WHERE id = $1', [userId]);
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'professional') {
      res.status(403).json({ error: 'Only professionals can post jobs' });
      return;
    }
    
    const result = await query(
      `INSERT INTO jobs (user_id, title, company_name, company_logo, location, job_type, description, apply_link, salary_range)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [userId, title, company_name, company_logo, location, job_type, description, apply_link, salary_range]
    );
    
    // Broadcast real-time update
    const io = getIO();
    if (io) {
      io.emit('new_job', result.rows[0]);
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[createJob]', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// PATCH /api/jobs/:id
export const updateJob = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { id } = req.params;
  const { 
    title, 
    company_name, 
    company_logo, 
    location, 
    job_type, 
    description, 
    apply_link, 
    salary_range 
  } = req.body;
  
  try {
    const result = await query(
      `UPDATE jobs 
       SET title = COALESCE($1, title),
           company_name = COALESCE($2, company_name),
           company_logo = COALESCE($3, company_logo),
           location = COALESCE($4, location),
           job_type = COALESCE($5, job_type),
           description = COALESCE($6, description),
           apply_link = COALESCE($7, apply_link),
           salary_range = COALESCE($8, salary_range),
           updated_at = NOW()
       WHERE id = $9 AND user_id = $10 RETURNING *`,
      [title, company_name, company_logo, location, job_type, description, apply_link, salary_range, id, userId]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Job not found or unauthorized' });
      return;
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('[updateJob]', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /api/jobs/:id
export const deleteJob = async (req: any, res: Response): Promise<void> => {
  const userId = req.user.id;
  const { id } = req.params;
  
  try {
    const result = await query(
      'DELETE FROM jobs WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Job not found or unauthorized' });
      return;
    }
    
    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('[deleteJob]', error);
    res.status(500).json({ error: 'Server error' });
  }
};
