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
  refreshCookiePath: process.env.REFRESH_COOKIE_PATH || '/auth/refresh',
  trustProxy: parseInt(process.env.TRUST_PROXY || '0', 10),
  swaggerEnabled:
    process.env.SWAGGER_ENABLED === undefined
      ? process.env.NODE_ENV !== 'production'
      : process.env.SWAGGER_ENABLED === 'true',
  refreshTokenTtlMs: parseInt(
    process.env.REFRESH_TOKEN_TTL_MS || '1209600000',
    10,
  ),
  refreshGraceMs: parseInt(process.env.REFRESH_GRACE_MS || '30000', 10),
  databaseUrl: process.env.DATABASE_URL,
});
