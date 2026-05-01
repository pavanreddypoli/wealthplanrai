-- RedCube WealthOS — Migration 007
-- Adds phone, bio, and ensures is_accepting_clients exists on profiles

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone               text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio                 text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_accepting_clients boolean DEFAULT true;
