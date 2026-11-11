// Queues need Redis, so they load only when email is switched on.
export const QUEUES_ENABLED = process.env.EMAIL_ENABLED === 'true';
