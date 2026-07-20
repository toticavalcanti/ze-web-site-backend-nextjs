import mongoose from 'mongoose';
import { env } from '@/lib/env';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

let cached = global.mongoose as unknown as MongooseCache | undefined;

if (!cached) {
  cached = (global as unknown as { mongoose: MongooseCache }).mongoose = { conn: null, promise: null };
}

export async function connectMongo() {
  if (cached?.conn) {
    return cached.conn;
  }

  if (!cached?.promise) {
    cached!.promise = mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME || undefined
    });
  }

  cached!.conn = await cached!.promise;
  return cached!.conn;
}

export default connectMongo;
