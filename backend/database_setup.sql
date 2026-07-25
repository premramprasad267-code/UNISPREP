-- ==============================================================================
-- UNISPREP PRODUCTION DATABASE SETUP
-- 1. Creates missing tables (saved_resources)
-- 2. Enables Row Level Security (RLS) on all tables
-- 3. Sets up strict access policies
-- ==============================================================================

-- 1. Create missing tables
CREATE TABLE IF NOT EXISTS public.saved_resources (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL, -- or integer, depending on your users table
    resource_id INTEGER NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, resource_id)
);

-- Note: If your users table uses integer IDs instead of UUIDs, 
-- please change `user_id UUID` to `user_id INTEGER REFERENCES public.users(id)` above.

-- 2. Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_resources ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Note: Because your backend uses a Service Role Key, all backend API calls will 
-- bypass these policies automatically. These policies are applied to protect 
-- data if you ever connect a frontend directly to Supabase via anon keys in the future.

-- Users: Can only read/update their own data
CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (auth.uid() = id::uuid);
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id::uuid);

-- Publicly readable tables (Universities, Courses, Subjects, Resources, Questions)
CREATE POLICY "Public read access for universities" ON public.universities FOR SELECT USING (true);
CREATE POLICY "Public read access for courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Public read access for subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Public read access for resources" ON public.resources FOR SELECT USING (true);
CREATE POLICY "Public read access for questions" ON public.questions FOR SELECT USING (true);

-- Activity Scores: Users can only see and insert their own scores
CREATE POLICY "Users can view own scores" ON public.activity_scores FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own scores" ON public.activity_scores FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Saved Resources: Users can only see and manage their own bookmarks
CREATE POLICY "Users can view own saved resources" ON public.saved_resources FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can manage own saved resources" ON public.saved_resources FOR ALL USING (auth.uid()::text = user_id::text);

-- Admin restrictions (Optional: If you use anon keys, explicitly block anon from editing)
CREATE POLICY "Block anonymous inserts/updates on core tables" ON public.subjects FOR ALL USING (false);
-- (Repeat for courses, universities, resources, questions if using anon keys)

-- ==============================================================================
-- DONE
-- ==============================================================================
