import * as fs from 'fs';

function getSecretOrThrow(name: string): string {
  const secretPath = `/run/secrets/${name}`;
  if (fs.existsSync(secretPath)) {
    return fs.readFileSync(secretPath, 'utf8').trim();
  }
  throw new Error(`Docker secret '${name}' not found at ${secretPath}`);
}

export default () => ({
  port: process.env.PORT,
  access_secret: getSecretOrThrow('SECRET'),
  access_expire: process.env.EXPIRE_JWT,
  refresh_expire: process.env.EXPIRE_REFRESH_JWT,
  refresh_secret: getSecretOrThrow('REFRESH_SECRET'),
  gmail_pass: getSecretOrThrow('GMAIL_PASS'),
  mongodb_uri: getSecretOrThrow('MONGODB_URI'),
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT, 10) || 9000,
    useSSL: false,
    accessKey: getSecretOrThrow('MINIO_ROOT_USER'),
    secretKey: getSecretOrThrow('MINIO_ROOT_PASSWORD'),
    bucket: process.env.MINIO_BUCKET || 'product-images',
  },
});
