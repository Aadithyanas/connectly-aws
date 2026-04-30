import pool from '../db/index';

/**
 * Migration: Add extended profile columns and missing helper tables.
 * Safe to run multiple times — uses IF NOT EXISTS / IF COLUMN NOT EXISTS patterns.
 */
async function migrate() {
  try {
    console.log('Running migration: add extended profile columns...');

    await pool.query(`
      -- Extended profile columns (all optional, safe to add to existing rows)
      ALTER TABLE public.profiles
        ADD COLUMN IF NOT EXISTS role               TEXT DEFAULT 'user',
        ADD COLUMN IF NOT EXISTS linkedin           TEXT,
        ADD COLUMN IF NOT EXISTS github             TEXT,
        ADD COLUMN IF NOT EXISTS portfolio          TEXT,
        ADD COLUMN IF NOT EXISTS instagram          TEXT,
        ADD COLUMN IF NOT EXISTS college_name       TEXT,
        ADD COLUMN IF NOT EXISTS course             TEXT,
        ADD COLUMN IF NOT EXISTS job_role           TEXT,
        ADD COLUMN IF NOT EXISTS experience_years   INTEGER,
        ADD COLUMN IF NOT EXISTS experience         JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS education          JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS skills             JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS resume_url         TEXT,
        ADD COLUMN IF NOT EXISTS certificates       JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS availability_status BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ Extended profile columns added.');

    await pool.query(`
      -- Chat members: add status column for join/leave tracking
      ALTER TABLE public.chat_members
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'joined';
    `);
    console.log('✅ chat_members.status column added.');

    await pool.query(`
      -- Push subscriptions table (for web-push notifications)
      CREATE TABLE IF NOT EXISTS public.push_subscriptions (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        endpoint    TEXT NOT NULL UNIQUE,
        p256dh      TEXT,
        auth        TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ push_subscriptions table created.');

    await pool.query(`
      -- Challenge tables for XP/rank system
      CREATE TABLE IF NOT EXISTS public.challenges (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title       TEXT NOT NULL,
        description TEXT,
        difficulty  TEXT DEFAULT 'medium',
        points      INTEGER DEFAULT 10,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.challenge_solutions (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
        user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        code         TEXT,
        language     TEXT,
        passed       BOOLEAN DEFAULT FALSE,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (challenge_id, user_id)
      );
    `);
    console.log('✅ challenges + challenge_solutions tables created.');

    await pool.query(`
      -- Notifications table for storing unread notifications
      CREATE TABLE IF NOT EXISTS public.notifications (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        type        TEXT NOT NULL,
        payload     JSONB DEFAULT '{}',
        is_read     BOOLEAN DEFAULT FALSE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ notifications table created.');

    console.log('\n✅ All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:');
    console.error(err);
  } finally {
    await pool.end();
  }
}

migrate();
