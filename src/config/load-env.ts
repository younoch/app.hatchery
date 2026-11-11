import { config } from 'dotenv';

// Read .env before any module is imported: some module lists depend on
// EMAIL_ENABLED when they are defined. Real environment variables win.
config({ quiet: true });
