import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';
import { startCronJobs } from './utils/cronJobs.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

connectDB();
startCronJobs();

app.listen(PORT, () => {
  console.log(`
  ========================================
    Contest Platform Server
    Running on port ${PORT}
    Environment: ${process.env.NODE_ENV || 'development'}
    Cron jobs: Active
  ========================================
  `);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});
