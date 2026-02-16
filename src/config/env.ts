import dotenv from 'dotenv';
dotenv.config();

export const config = {
  databaseUrl: process.env.DATABASE_URL,
  directUrl: process.env.DIRECT_URL,
  port: Number(process.env.PORT),
  jwtAccessTokenSecret: process.env.JWT_ACCESS_TOKEN_SECRET,
  jwtRefreshTokenSecret: process.env.JWT_REFRESH_TOKEN_SECRET,
  jwtAccessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN,
  jwtRefreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN,
  encryptionKey: process.env.ENCRYPTION_KEY,
  hermesBaseUrl: process.env.HERMES_BASE_URL || 'https://courier-availability.api.evri.com',
  cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID,
  cognitoClientId: process.env.COGNITO_CLIENT_ID,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  cronAuthSchedule: process.env.CRON_AUTH_SCHEDULE || '*/14 * * * *',
  cronRoundSchedule: process.env.CRON_ROUND_SCHEDULE || '0 0 * * 1',
};
