-- Migration to add priority and request_type to requests table

-- 1. Add priority column
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS priority text CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium';

-- 2. Add request_type column
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS request_type text DEFAULT 'other';

-- 3. Update existing records (optional, set default)
UPDATE public.requests SET priority = 'medium' WHERE priority IS NULL;
UPDATE public.requests SET request_type = 'other' WHERE request_type IS NULL;
