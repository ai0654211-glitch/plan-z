import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

// Security Middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'"],
        },
    },
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    }
});
app.use(limiter);

// CORS
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database Connection
const connectDB = async() => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/planz_ecommerce', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('❌ Database connection error:', error);
        process.exit(1);
    }
};

// Health Check Route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: '🚀 Server is running perfectly!',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: '🎉 Welcome to PlanZ Ecommerce API!',
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: {
            health: '/api/health',
            products: '/api/products',
            auth: '/api/auth'
        }
    });
});

// Sample Products Route
app.get('/api/products', (req, res) => {
    res.json({
        success: true,
        data: [{
                id: 1,
                name: 'iPhone 14 Pro',
                price: 999,
                category: 'Electronics',
                image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400',
                rating: 4.8,
                inStock: true
            },
            {
                id: 2,
                name: 'MacBook Pro',
                price: 1999,
                category: 'Electronics',
                image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
                rating: 4.9,
                inStock: true
            },
            {
                id: 3,
                name: 'AirPods Pro',
                price: 249,
                category: 'Electronics',
                image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400',
                rating: 4.7,
                inStock: true
            }
        ],
        total: 3,
        page: 1,
        pages: 1
    });
});

// 404 Handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: '🔍 Route not found'
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('🚨 Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

// Start Server
const PORT = process.env.PORT || 5000;

const startServer = async() => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`\n🎯 Server running in ${process.env.NODE_ENV || 'development'} mode`);
            console.log(`📍 Backend URL: http://localhost:${PORT}`);
            console.log(`📚 API Health: http://localhost:${PORT}/api/health`);
            console.log(`🛍️ API Products: http://localhost:${PORT}/api/products`);
            console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
            console.log(`🚀 Ready to handle requests!`);
        });
    } catch (error) {
        console.error('💥 Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGINT', async() => {
    console.log('\n👋 Received SIGINT. Shutting down gracefully...');
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed.');
    process.exit(0);
});

process.on('SIGTERM', async() => {
    console.log('\n👋 Received SIGTERM. Shutting down gracefully...');
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed.');
    process.exit(0);
});

startServer();