import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables before importing app modules
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('⚙️  Environment variables loaded from .env');

// Dynamically import server after env is loaded
// If running locally against localhost MongoDB, prefer development mode
if (process.env.MONGODB_URI && (process.env.MONGODB_URI.includes('127.0.0.1') || process.env.MONGODB_URI.includes('localhost'))) {
    process.env.NODE_ENV = 'development';
    console.log('🔧 Detected local MongoDB; forcing NODE_ENV=development for safe startup');
}

// Import server module
await
import ('./server.js');