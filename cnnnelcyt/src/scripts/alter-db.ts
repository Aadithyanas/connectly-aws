import pool from '../db/index';

async function alterDb() {
  try {
    console.log('Altering database schema...');

    const alterations = [
      // Messages table — add missing columns
      `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL`,
      `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS forwarded BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS client_id TEXT`,
      `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_for UUID[]`,
      `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_deleted_everyone BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE`,

      // Profiles table — add missing columns
      `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_role TEXT`,
      `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS college_name TEXT`,
      `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0`,
      `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url TEXT`,
      `ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL`,
      `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience JSONB`,
      `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS education JSONB`,
      `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills JSONB`,
      `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS resume_url TEXT`,
      `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS certificates JSONB`,
      `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portfolio TEXT`,
      `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram TEXT`,
      `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github TEXT`,
      `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin TEXT`,
      `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS availability_status BOOLEAN DEFAULT TRUE`,
      `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS course TEXT`,
      `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience_years INTEGER`,

      // Chats table — add is_public column
      `ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS cover_url TEXT`,

      // Push subscriptions table — create if missing + unique constraint
      `CREATE TABLE IF NOT EXISTS public.push_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      `ALTER TABLE public.push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_endpoint_key`,
      `ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint)`,

      // Reports table — create if missing
      `CREATE TABLE IF NOT EXISTS public.reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        reported_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,

      // Challenge solutions table — create if missing
      `CREATE TABLE IF NOT EXISTS public.challenge_solutions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        challenge_id TEXT NOT NULL,
        language TEXT,
        code TEXT,
        media_urls TEXT[],
        media_types TEXT[],
        points INTEGER DEFAULT 10,
        solved_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, challenge_id)
      )`,
      `ALTER TABLE public.challenge_solutions ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 10`,
      `ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.post_comments(id) ON DELETE SET NULL`,
      `ALTER TABLE public.posts ALTER COLUMN media_url TYPE TEXT[] USING ARRAY[media_url]`,
      `ALTER TABLE public.posts ALTER COLUMN media_type TYPE TEXT[] USING ARRAY[media_type]`,
      `ALTER TABLE public.posts RENAME COLUMN media_url TO media_urls`,
      `ALTER TABLE public.posts RENAME COLUMN media_type TO media_types`,
    ];

    for (const sql of alterations) {
      try {
        await pool.query(sql);
        console.log(`✅ OK: ${sql.trim().split('\n')[0].slice(0, 80)}...`);
      } catch (err: any) {
        // Column/constraint may already exist — log and continue
        console.warn(`⚠️  Skipped (${err.message.split('\n')[0]})`);
      }
    }

    console.log('\n✅ All alterations complete.');
  } catch (err) {
    console.error('❌ Fatal error:', err);
  } finally {
    await pool.end();
  }
}

alterDb();
