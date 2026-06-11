// db/connect.js
import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in environment variables');

  try {
    await mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || 'Chatvizzy',
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);

    mongoose.connection.on('error', err => {
      console.error('MongoDB error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected — reconnecting...');
      isConnected = false;
    });

  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

export function getConnectionStatus() {
  return {
    connected: isConnected,
    state: mongoose.connection.readyState,
    host: mongoose.connection.host || null,
  };
}

export default connectDB;
