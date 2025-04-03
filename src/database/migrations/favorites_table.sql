-- Create favorite_events table
CREATE TABLE IF NOT EXISTS favorite_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, event_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_favorite_events_user_id ON favorite_events(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_events_event_id ON favorite_events(event_id);
