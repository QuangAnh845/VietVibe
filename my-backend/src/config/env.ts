import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vietvibe_db';
export const PORT = Number(process.env.PORT || 3001);
export const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';
