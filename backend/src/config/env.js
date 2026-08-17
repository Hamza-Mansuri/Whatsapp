import dotenv from 'dotenv';
import path from 'path';

// Resolve directory to load config correctly in both development and production
dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGODB_URI,
  clientUrl: process.env.CLIENT_URL,
  jwtSecret: process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'fallback_secret_1234567890',
  jwtExpiry: '24h',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  }
};

// Setup allowed origins for CORS validation
const allowedOrigins = process.env.NODE_ENV === 'production' ? [] : [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];

if (process.env.CLIENT_URL) {
  // Remove trailing slash if present to match origin headers reliably
  allowedOrigins.push(process.env.CLIENT_URL.replace(/\/$/, ''));
}
if (process.env.ADMIN_URL) {
  allowedOrigins.push(process.env.ADMIN_URL.replace(/\/$/, ''));
}

export const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server or postman requests
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
};

