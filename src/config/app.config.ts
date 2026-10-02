export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  appUrl:
    process.env.APP_URL || `http://localhost:${process.env.PORT || '3000'}`,
  jwtSecret: process.env.JWT_SECRET,
  frontendUrl: process.env.FRONTEND_URL,
  corsOrigins: (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  cookieSecure:
    process.env.COOKIE_SECURE === undefined
      ? process.env.NODE_ENV === 'production'
      : process.env.COOKIE_SECURE === 'true',
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
  refreshTokenTtlMs: parseInt(
    process.env.REFRESH_TOKEN_TTL_MS || '1209600000',
    10,
  ),
  databaseUrl: process.env.DATABASE_URL,
});
