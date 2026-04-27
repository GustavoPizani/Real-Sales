-- Allow multiple push subscriptions per user (one per device)
-- Remove unique constraint on userId, keep unique on endpoint

DROP INDEX IF EXISTS "push_subscriptions_userId_key";
