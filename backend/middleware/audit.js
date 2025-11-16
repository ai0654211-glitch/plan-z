import mongoose from 'mongoose';
import { SecurityUtils } from '../utils/encryption.js';

const auditSchema = new mongoose.Schema({
    eventType: {
        type: String,
        required: true,
        enum: [
            'LOGIN_ATTEMPT',
            'LOGIN_SUCCESS',
            'LOGIN_FAILED',
            'USER_CREATED',
            'USER_UPDATED',
            'USER_DELETED',
            'PASSWORD_CHANGED',
            'ROLE_CHANGED',
            'DATA_ACCESS',
            'DATA_MODIFIED',
            'SECURITY_EVENT',
            'SYSTEM_EVENT',
            'DATABASE_CONNECTION_FAILED',
            'ERROR_EVENT',
            'UNAUTHORIZED_ACCESS',
            'RATE_LIMIT_EXCEEDED',
            'SUSPICIOUS_ACTIVITY'
        ]
    },
    severity: {
        type: String,
        required: true,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'LOW'
    },
    userId: {
        type: String,
        set: (id) => id ? SecurityUtils.encrypt(String(id)) : undefined
    },
    userIp: {
        type: String,
        required: false,
        set: (ip) => ip ? SecurityUtils.encrypt(String(ip)) : undefined
    },
    userAgent: String,
    requestMethod: String,
    requestUrl: String,
    requestBody: {
        type: mongoose.Schema.Types.Mixed,
        set: (data) => {
            if (data && typeof data === 'object') {
                // إخفاء البيانات الحساسة
                const sanitized = {...data };
                if (sanitized.password) sanitized.password = '***';
                if (sanitized.token) sanitized.token = '***';
                if (sanitized.creditCard) sanitized.creditCard = '***';
                return SecurityUtils.encrypt(JSON.stringify(sanitized));
            }
            return data;
        }
    },
    responseStatus: Number,
    responseTime: Number,
    metadata: mongoose.Schema.Types.Mixed,
    location: {
        country: String,
        city: String,
        region: String
    },
    riskScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    isSuspicious: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// فهارس للأداء
auditSchema.index({ eventType: 1, createdAt: -1 });
auditSchema.index({ userIp: 1, createdAt: -1 });
auditSchema.index({ userId: 1, createdAt: -1 });
auditSchema.index({ severity: 1, createdAt: -1 });
auditSchema.index({ isSuspicious: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditSchema);

export class AuditLogger {

    // تسجيل حدث أمان
    static async logSecurityEvent(eventType, data = {}) {
        try {
            // إذا لم تكن هناك اتصالات قاعدة بيانات، تخطي التسجيل
            if (mongoose.connection.readyState !== 1) {
                console.warn('⚠️  Database not connected, skipping audit log');
                return null;
            }

            const logEntry = new AuditLog({
                eventType,
                severity: this.calculateSeverity(eventType, data),
                userIp: data.ip || 'unknown',
                userAgent: data.userAgent,
                requestMethod: data.method,
                requestUrl: data.url,
                requestBody: data.body,
                responseStatus: data.status,
                responseTime: data.responseTime,
                userId: data.userId,
                metadata: data.metadata,
                riskScore: this.calculateRiskScore(eventType, data),
                isSuspicious: this.isSuspiciousActivity(eventType, data)
            });

            await logEntry.save();

            // إذا كان الحدث خطير، إرسال تنبيه
            if (logEntry.severity === 'CRITICAL' || logEntry.isSuspicious) {
                await this.sendSecurityAlert(logEntry);
            }

            return logEntry;
        } catch (error) {
            // تسجيل الخطأ فقط دون إيقاف السيرفر
            if (process.env.NODE_ENV === 'development') {
                console.warn('⚠️  Non-blocking error in audit logging:', error.message);
            }
            return null;
        }
    }

    // تتبع الطلبات
    static trackRequest(req, res, next) {
        const startTime = Date.now();
        const originalSend = res.send;

        res.send = function(data) {
            const responseTime = Date.now() - startTime;

            // تسجيل الطلب بعد إكماله
            AuditLogger.logSecurityEvent('DATA_ACCESS', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                method: req.method,
                url: req.url,
                body: req.body,
                status: res.statusCode,
                responseTime,
                userId: req.userId,
                metadata: {
                    route: req.route ? req.route.path : undefined,
                    params: req.params,
                    query: req.query
                }
            });

            originalSend.call(this, data);
        };

        next();
    }

    // حساب خطورة الحدث
    static calculateSeverity(eventType, data) {
        const severityMap = {
            'LOGIN_FAILED': data.attempts >= 3 ? 'HIGH' : 'MEDIUM',
            'UNAUTHORIZED_ACCESS': 'HIGH',
            'RATE_LIMIT_EXCEEDED': 'MEDIUM',
            'SUSPICIOUS_ACTIVITY': 'CRITICAL',
            'DATA_MODIFIED': data.sensitive ? 'HIGH' : 'LOW',
            'ERROR_EVENT': 'MEDIUM',
            'LOGIN_SUCCESS': 'LOW',
            'SYSTEM_EVENT': 'LOW'
        };

        return severityMap[eventType] || 'LOW';
    }

    // حساب درجة المخاطرة
    static calculateRiskScore(eventType, data) {
        let score = 0;

        // عوامل المخاطرة
        if (eventType === 'LOGIN_FAILED') score += 20;
        if (eventType === 'UNAUTHORIZED_ACCESS') score += 50;
        if (data.ip && this.isSuspiciousIP(data.ip)) score += 30;
        if (data.userAgent && this.isSuspiciousUserAgent(data.userAgent)) score += 25;
        if (data.attempts > 5) score += 40;

        return Math.min(score, 100);
    }

    // كشف الأنشطة المشبوهة
    static isSuspiciousActivity(eventType, data) {
        // محاولات تسجيل دخول متعددة فاشلة
        if (eventType === 'LOGIN_FAILED' && data.attempts >= 5) return true;

        // وصول من IPs متعددة في وقت قصير
        if (eventType === 'DATA_ACCESS' && data.multipleIPs) return true;

        // أنماط طلبات غير عادية
        if (this.hasUnusualPattern(data)) return true;

        return false;
    }

    // كشف IPs مشبوهة
    static isSuspiciousIP(ip) {
        const suspiciousIPs = [
            '127.0.0.1', // localhost في production
            '0.0.0.0',
            '255.255.255.255'
        ];

        return suspiciousIPs.includes(ip) ||
            this.isVPNorProxy(ip) ||
            this.isTORNode(ip);
    }

    // كشف user agents مشبوهة
    static isSuspiciousUserAgent(userAgent) {
        const suspiciousPatterns = [
            'curl', 'wget', 'python', 'bot', 'crawler',
            'scanner', 'sqlmap', 'nikto', 'metasploit'
        ];

        if (!userAgent) return false;
        const lowerUA = userAgent.toLowerCase();
        return suspiciousPatterns.some(pattern => lowerUA.includes(pattern));
    }

    // كشف أنماط غير عادية
    static hasUnusualPattern(data) {
        if (!data || typeof data !== 'object') return false;

        // طلبات سريعة جدًا
        if (typeof data.responseTime === 'number' && data.responseTime < 10) return true;

        // حجم طلبات كبير غير عادي
        try {
            if (data.body && JSON.stringify(data.body).length > 10000) return true;
        } catch (err) {
            // ignore serialization errors
        }

        // مسارات غير معتادة
        const suspiciousPaths = ['/admin', '/api/security', '/.env'];
        if (data.url && suspiciousPaths.some(p => data.url.includes(p))) return true;

        return false;
    }

    // إرسال تنبيهات الأمان
    static async sendSecurityAlert(logEntry) {
        // هنا يمكن إضافة إرسال إيميلات، إشعارات، etc.
        console.log('🚨 SECURITY ALERT:', {
            event: logEntry.eventType,
            severity: logEntry.severity,
            riskScore: logEntry.riskScore,
            timestamp: logEntry.createdAt
        });

        // مثال: إرسال إيميل تنبيه
        // await EmailService.sendSecurityAlert(logEntry);
    }

    // الحصول على سجلات المراقبة
    static async getAuditLogs(req, res) {
        try {
            const {
                page = 1,
                    limit = 50,
                    eventType,
                    severity,
                    startDate,
                    endDate
            } = req.query;

            const filter = {};
            if (eventType) filter.eventType = eventType;
            if (severity) filter.severity = severity;
            if (startDate || endDate) {
                filter.createdAt = {};
                if (startDate) filter.createdAt.$gte = new Date(startDate);
                if (endDate) filter.createdAt.$lte = new Date(endDate);
            }

            const logs = await AuditLog.find(filter)
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await AuditLog.countDocuments(filter);

            res.json({
                success: true,
                logs,
                pagination: {
                    page: page * 1,
                    limit: limit * 1,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to retrieve audit logs',
                code: 'AUDIT_LOGS_ERROR'
            });
        }
    }

    // إحصائيات الأمان
    static async getSecurityStats() {
        const [
            totalEvents,
            criticalEvents,
            suspiciousActivities,
            failedLogins,
            last24Hours
        ] = await Promise.all([
            AuditLog.countDocuments(),
            AuditLog.countDocuments({ severity: 'CRITICAL' }),
            AuditLog.countDocuments({ isSuspicious: true }),
            AuditLog.countDocuments({ eventType: 'LOGIN_FAILED' }),
            AuditLog.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            })
        ]);

        return {
            total: totalEvents,
            critical: criticalEvents,
            suspicious: suspiciousActivities,
            failedLogins,
            last24Hours,
            riskLevel: this.calculateOverallRiskLevel(criticalEvents, totalEvents)
        };
    }

    // حساب مستوى المخاطرة الكلي
    static calculateOverallRiskLevel(criticalEvents, totalEvents) {
        const criticalRatio = totalEvents > 0 ? (criticalEvents / totalEvents) * 100 : 0;

        if (criticalRatio > 10) return 'CRITICAL';
        if (criticalRatio > 5) return 'HIGH';
        if (criticalRatio > 2) return 'MEDIUM';
        return 'LOW';
    }

    // مساعدة في كشف VPN/Proxy (مثال مبسط)
    static isVPNorProxy(ip) {
        // في التطبيق الحقيقي، استخدم خدمة مثل ipapi أو maxmind
        return false;
    }

    // مساعدة في كشف TOR (مثال مبسط)
    static isTORNode(ip) {
        // في التطبيق الحقيقي، استخدم قائمة TOR exit nodes
        return false;
    }
}

export default AuditLogger;