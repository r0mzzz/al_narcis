export default () => ({
  port: process.env.PORT,
  secret_jwt: process.env.SECRET,
  expire_jwt: process.env.EXPIRE_JWT,
  expire_refresh_jwt: process.env.EXPIRE_REFRESH_JWT,
  secret_refresh_jwt: process.env.REFRESH_SECRET,
});
