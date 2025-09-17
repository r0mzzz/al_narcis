import * as fs from 'fs';

/**
 * Retrieves a secret from Docker secrets or falls back to environment variable.
 * Throws if neither is found.
 * @param name Secret name (and env var name)
 * @returns Secret value as string
 */
function getSecret(name: string): string {
  const secretPath = `/run/secrets/${name}`;
  if (fs.existsSync(secretPath)) {
    return fs.readFileSync(secretPath, 'utf8').trim();
  }
  if (process.env[name]) {
    return process.env[name] as string;
  }
  throw new Error(
    `Secret '${name}' not found as Docker secret or environment variable.`
  );
}

export default () => ({
  port: process.env.PORT,
  access_secret: getSecret('SECRET'),
  access_expire: process.env.EXPIRE_JWT,
  refresh_expire: process.env.EXPIRE_REFRESH_JWT,
  refresh_secret: getSecret('REFRESH_SECRET'),
  gmail_pass: getSecret('GMAIL_PASS'),
  mongodb_uri: getSecret('MONGODB_URI'),
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: false,
    accessKey: getSecret('MINIO_ROOT_USER'),
    secretKey: getSecret('MINIO_ROOT_PASSWORD'),
    bucket: process.env.MINIO_BUCKET || 'product-images',
  },
});
