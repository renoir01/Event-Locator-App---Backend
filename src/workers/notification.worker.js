require('dotenv').config();
const NotificationService = require('../services/notification.service');

async function runNotificationWorker() {
  try {
    console.log('Checking for upcoming events...');
    const notificationCount = await NotificationService.checkUpcomingEvents();
    console.log(`Sent ${notificationCount} notifications`);
  } catch (error) {
    console.error('Error in notification worker:', error);
  }
}

// Run every 15 minutes
const INTERVAL = 15 * 60 * 1000;

if (require.main === module) {
  console.log('Starting notification worker...');
  // Initial run
  runNotificationWorker();
  // Schedule subsequent runs
  setInterval(runNotificationWorker, INTERVAL);
}
