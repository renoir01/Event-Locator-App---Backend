-- Event notifications table
CREATE TABLE event_notifications (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (event_id, user_id)
);

-- Create index for faster queries
CREATE INDEX idx_notifications_user ON event_notifications(user_id);
CREATE INDEX idx_notifications_event ON event_notifications(event_id);
CREATE INDEX idx_notifications_sent_at ON event_notifications(sent_at);
