import dotenv from "dotenv";

dotenv.config();

export const APP_CONFIG = {
  port: process.env.PORT,
  dbUrl: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  db_32_string: process.env.SOME_32BYTE_BASE64_STRING,
  db_64_string: process.env.SOME_64BYTE_BASE64_STRING,
};
