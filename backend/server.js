import express from 'express';
import mongoose from 'mongoose';
import https from 'https';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import compression from 'compression';
import { securityMiddleware } from './middleware/security.js';
import { AuthMiddleware } from './middleware/auth.js';
import { SecurityUtils } from './utils/encryption.js';
import { ValidationUtils } from './utils/validation.js';
import { AuditLogger } from './middleware/audit.js';

// استيراد routes الجديدة
import reviewRoutes from './routes/reviews.js';
import offerRoutes from './routes/offers.js';
import videoRoutes from './routes/videos.js';

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

class SecureServer {
    constructor() {
        this.app = express();
        this.setupSecurity();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupSecurity() {
        // 1. تطبيق جميع طبقات الأمان
        this.app.use(securityMiddleware);

        // 2. أمان إضافي للبيانات
        this.app.use(express.json({
            limit: '10mb',
            verify: (req, res, buf) => {
                try {
                    JSON.parse(buf);
                } catch (e) {
                    throw new Error('Invalid JSON payload');
                }
            }
        }));

        // 3. منع اكتشاف التكنولوجيا المستخدمة
        this.app.disable('x-powered-by');
        this.app.set('trust proxy', 1);
    }

    setupMiddleware() {
        // 1. تسجيل وتحليل جميع الطلبات
        this.app.use(AuditLogger.trackRequest);

        // 2. تحقق من صحة البيانات في جميع الطلبات
        this.app.use(ValidationUtils.sanitizeInput);

        // 3. ضغط البيانات الآمن
        this.app.use(compression({ level: 6 }));

        // 4. خدمة الملفات الثابتة بأمان
        this.app.use('/public', express.static(path.join(__dirname, 'public'), {
            maxAge: '1d',
            etag: true,
            lastModified: true,
            setHeaders: (res, path) => {
                res.set('X-Content-Type-Options', 'nosniff');
            }
        }));
    }

    setupRoutes() {
        // 1. health check آمن
        this.app.get('/api/health', AuthMiddleware.authenticateToken, (req, res) => {
            res.json({
                status: 'secure',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV,
                security: {
                    ssl: true,
                    cors: true,
                    rateLimit: true,
                    encryption: true
                }
            });
        });

        // 2. المسارات الجديدة
        this.app.use('/api/reviews', reviewRoutes);
        this.app.use('/api/offers', offerRoutes);
        this.app.use('/api/videos', videoRoutes);

        // 3. test route مع التحقق من التوقيع
        this.app.post('/api/secure-test',
            AuthMiddleware.authenticateToken,
            ValidationUtils.validateSignature,
            (req, res) => {
                const encryptedData = SecurityUtils.encrypt(JSON.stringify({
                    message: 'Secure API is working',
                    userId: req.userId,
                    timestamp: Date.now()
                }));

                res.json({
                    success: true,
                    data: encryptedData,
                    signature: SecurityUtils.signData(encryptedData)
                });
            }
        );

        // 4. نظام المراقبة
        this.app.get('/api/security/audit',
            AuthMiddleware.authenticateToken,
            AuthMiddleware.authorize('admin', 'super_admin'),
            AuditLogger.getAuditLogs
        );

        // 5. إحصائيات الأمان
        this.app.get('/api/security/stats',
            AuthMiddleware.authenticateToken,
            AuthMiddleware.authorize('admin', 'super_admin'),
            async(req, res) => {
                const stats = await AuditLogger.getSecurityStats();
                res.json({
                    security: {
                        totalRequests: stats.total,
                        blockedRequests: stats.blocked,
                        failedLogins: stats.failedLogins,
                        suspiciousActivities: stats.suspicious
                    },
                    system: {
                        uptime: process.uptime(),
                        memory: process.memoryUsage(),
                        environment: process.env.NODE_ENV
                    }
                });
            }
        );
    }

    setupErrorHandling() {
        // 1. معالجة الأخطاء المعروفة
        this.app.use((err, req, res, next) => {
            // تسجيل الخطأ في نظام المراقبة
            AuditLogger.logSecurityEvent('ERROR', {
                ip: req.ip,
                method: req.method,
                url: req.url,
                error: err.message,
                stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
            });

            // عدم كشف معلومات حساسة
            const errorResponse = {
                error: 'Something went wrong',
                code: 'INTERNAL_ERROR',
                timestamp: new Date().toISOString()
            };

            // إرجاع رسائل خطأ محددة بناءً على نوع الخطأ
            if (err.name === 'ValidationError') {
                errorResponse.error = 'Invalid data provided';
                errorResponse.code = 'VALIDATION_ERROR';
                return res.status(400).json(errorResponse);
            }

            if (err.name === 'JsonWebTokenError') {
                errorResponse.error = 'Invalid authentication token';
                errorResponse.code = 'AUTH_ERROR';
                return res.status(401).json(errorResponse);
            }

            if (err.code === 'LIMIT_FILE_SIZE') {
                errorResponse.error = 'File too large';
                errorResponse.code = 'FILE_SIZE_EXCEEDED';
                return res.status(413).json(errorResponse);
            }

            res.status(500).json(errorResponse);
        });

        // 2. معالجة المسارات غير الموجودة
        this.app.use((req, res) => {
            AuditLogger.logSecurityEvent('UNAUTHORIZED_ACCESS', {
                ip: req.ip,
                method: req.method,
                url: req.originalUrl,
                userAgent: req.get('User-Agent')
            });

            res.status(404).json({
                error: 'Route not found',
                code: 'ROUTE_NOT_FOUND'
            });
        });
    }

    async connectDatabase() {
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });

            console.log('🔒 Secure MongoDB connection established');

            // مراقبة حالة الاتصال
            mongoose.connection.on('error', (err) => {
                AuditLogger.logSecurityEvent('DATABASE_ERROR', { error: err.message });
            });

            mongoose.connection.on('disconnected', () => {
                AuditLogger.logSecurityEvent('DATABASE_DISCONNECTED');
            });

        } catch (error) {
            AuditLogger.logSecurityEvent('DATABASE_CONNECTION_FAILED', {
                error: error.message
            });
            console.error('Database connection failed:', error.message);
            if (process.env.NODE_ENV === 'production') {
                process.exit(1);
            }
        }
    }

    start() {
        const PORT = process.env.PORT || 5000;

        // في production استخدم HTTPS
        if (process.env.NODE_ENV === 'production') {
            const options = {
                key: fs.readFileSync('/path/to/private-key.pem'),
                cert: fs.readFileSync('/path/to/certificate.pem'),
                secureProtocol: 'TLSv1_2_method',
                ciphers: [
                    'ECDHE-RSA-AES128-GCM-SHA256',
                    'ECDHE-RSA-AES256-GCM-SHA384'
                ].join(':'),
                honorCipherOrder: true
            };

            https.createServer(options, this.app).listen(PORT, () => {
                console.log(`🔐 Secure HTTPS Server running on port ${PORT}`);
                console.log(`🛡️  Security Features: Enabled`);
                console.log(`📊 Audit Logging: Active`);
            });
        } else {
            this.app.listen(PORT, () => {
                console.log(`🚀 Secure Server running on port ${PORT}`);
                console.log(`🛡️  Security Level: Maximum`);
            });
        }
    }
}

// تشغيل السيرفر
const server = new SecureServer();

server.connectDatabase()
    .then(() => server.start())
    .catch(error => {
        console.error('❌ Failed to start secure server:', error);
        process.exit(1);
    });

export default server;