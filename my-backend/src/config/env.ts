import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://admin:admin123@cluster0.sro5fph.mongodb.net/vietvibe_db?appName=Cluster0';
export const PORT = Number(process.env.PORT || 3001);
export const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';
