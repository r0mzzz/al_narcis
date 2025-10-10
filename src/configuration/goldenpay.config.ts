import { registerAs } from '@nestjs/config';

export default registerAs('goldenpay', () => ({
  authKey: process.env.GOLDENPAY_AUTH_KEY || 'e7ea68e88b504e60b4c4fc7acb7e2990',
}));

