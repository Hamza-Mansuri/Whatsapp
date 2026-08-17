import mongoose from 'mongoose';
import { config } from './env.js';

export const connectDB = async () => {
  try {
    if (!config.mongoUri) {
      throw new Error('MONGODB_URI is not defined in the env configuration.');
    }
    const conn = await mongoose.connect(config.mongoUri);
    console.log(`MongoDB Connected: ${conn.connection.host} / DB: ${conn.connection.name}`);
    
    // Programmatically drop old unique index that restricts users to one chat room total
    try {
      await mongoose.connection.db.collection('conversations').dropIndex('participants_1');
      console.log('Unique index participants_1 dropped successfully.');
    } catch (e) {
      // Ignored if the index does not exist or is already dropped
    }
  } catch (error) {
    console.error(`Database Connection Failed: ${error.message}`);
    process.exit(1);
  }
};
