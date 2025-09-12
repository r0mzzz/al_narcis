export default () => ({
  port: process.env.PORT,
  access_secret: process.env.SECRET,
  access_expire: process.env.EXPIRE_JWT,
  refresh_expire: process.env.EXPIRE_REFRESH_JWT,
  refresh_secret: process.env.REFRESH_SECRET,
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT, 10) || 9000,
    useSSL: false,
    accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
    secretKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
    bucket: process.env.MINIO_BUCKET || 'product-images',
  },
});
