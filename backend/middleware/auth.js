import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { SecurityUtils } from '../utils/encryption.js';

export class AuthMiddleware {

    // التحقق من التوكن
    static authenticateToken = async(req, res, next) => {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

            if (!token) {
                return res.status(401).json({
                    error: 'Access denied',
                    code: 'NO_TOKEN'
                });
            }

            // التحقق من التوكن
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // فك تشفير البيانات الحساسة
            if (decoded.userId) {
                req.userId = SecurityUtils.decrypt(decoded.userId);
            }
            if (decoded.email) {
                req.userEmail = SecurityUtils.decrypt(decoded.email);
            }

            req.userRole = decoded.role;
            next();
        } catch (error) {
            return res.status(403).json({
                error: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            });
        }
    };

    // التحقق من الصلاحيات
    static authorize = (...roles) => {
        return (req, res, next) => {
            if (!req.userRole) {
                return res.status(401).json({
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED'
                });
            }

            if (!roles.includes(req.userRole)) {
                return res.status(403).json({
                    error: 'Insufficient permissions',
                    code: 'FORBIDDEN',
                    required: roles,
                    current: req.userRole
                });
            }
            next();
        };
    };

    // منع هجمات Brute Force
    static rateLimitAuth = (req, res, next) => {
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 دقيقة
            max: 5, // 5 محاولات تسجيل دخول فقط
            message: {
                error: 'Too many login attempts, please try again later.',
                code: 'RATE_LIMIT_EXCEEDED'
            },
            keyGenerator: (req) => req.ip
        });
        return limiter(req, res, next);
    };
}

export default AuthMiddleware;