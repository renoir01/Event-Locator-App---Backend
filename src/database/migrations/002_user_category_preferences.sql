-- Create user_category_preferences table
CREATE TABLE IF NOT EXISTS user_category_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, category_id)
);

-- Create favorite_events table
CREATE TABLE IF NOT EXISTS favorite_events (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, event_id)
);

-- Create event_notifications table
CREATE TABLE IF NOT EXISTS event_notifications (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_category_preferences_user_id ON user_category_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_category_preferences_category_id ON user_category_preferences(category_id);
CREATE INDEX IF NOT EXISTS idx_favorite_events_user_id ON favorite_events(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_events_event_id ON favorite_events(event_id);
CREATE INDEX IF NOT EXISTS idx_event_notifications_user_id ON event_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_event_notifications_event_id ON event_notifications(event_id);
