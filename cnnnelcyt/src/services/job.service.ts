import dotenv from 'dotenv';

dotenv.config();

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || '';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || '';
const ADZUNA_COUNTRY = 'in'; // Defaulting to India, can be made dynamic

export interface ExternalJob {
  id: string;
  title: string;
  company_name: string;
  location: string;
  description: string;
  apply_link: string;
  job_type: string;
  source_platform: string;
  created_at: string;
}

export const fetchExternalJobs = async (query: string = '', location: string = '', limit: number = 50): Promise<ExternalJob[]> => {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    console.warn('[JobService] Adzuna API keys not set. Skipping external jobs.');
    return [];
  }

  try {
    // If both are empty, search for 'jobs' as a generic fallback
    const what = query || (location ? '' : 'jobs');
    const where = location || '';
    
    const url = `https://api.adzuna.com/v1/api/jobs/${ADZUNA_COUNTRY}/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=${limit}&what=${encodeURIComponent(what)}&where=${encodeURIComponent(where)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Adzuna API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.results.map((job: any) => ({
      id: `ext-${job.id}`,
      title: job.title,
      company_name: job.company.display_name,
      location: job.location.display_name,
      description: job.description.replace(/<[^>]*>?/gm, ''),
      apply_link: job.redirect_url,
      job_type: job.contract_type || 'Full Time',
      source_platform: 'Adzuna', // We can parse the site from job.redirect_url if needed
      created_at: job.created
    }));
  } catch (error) {
    console.error('[JobService] Error fetching external jobs:', error);
    return [];
  }
};
