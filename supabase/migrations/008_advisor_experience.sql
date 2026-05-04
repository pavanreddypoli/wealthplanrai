-- WealthPlanrAI — Migration 008
-- Adds years_experience column to profiles

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_experience text;
