import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { SecurityUtils } from '../utils/encryption.js';
import ValidationUtils from '../utils/validation.js';
import AuditLogger from '../middleware/audit.js';
import EmailService from '../services/emailService.js';

export class AuthController {

    // تسجيل مستخدم جديد بأمان عالي
    static async register(req, res) {
        try {
            const { email, password, firstName, lastName, phone } = req.body;

            // تحقق مكثف من البيانات
            if (!ValidationUtils.validateEmail(email)) {
                return res.status(400).json({
                    error: 'Invalid email address',
                    code: 'INVALID_EMAIL'
                });
            }

            if (!ValidationUtils.validatePassword(password)) {
                return res.status(400).json({
                    error: 'Password must be at least 8 characters with uppercase, lowercase, numbers and special characters',
                    code: 'WEAK_PASSWORD'
                });
            }

            if (!ValidationUtils.validatePhone(phone)) {
                return res.status(400).json({
                    error: 'Invalid phone number',
                    code: 'INVALID_PHONE'
                });
            }

            // التحقق من وجود المستخدم
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(409).json({
                    error: 'User already exists',
                    code: 'USER_EXISTS'
                });
            }

            // إنشاء المستخدم
            const user = new User({
                email,
                password,
                personalInfo: { firstName, lastName, phone }
            });

            await user.save();

            // توليد توكن التحقق
            const verificationToken = SecurityUtils.generateSecureToken(32);
            user.verificationToken = verificationToken;
            user.verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 ساعة
            await user.save();

            // إرسال إيميل التحقق
            await EmailService.sendVerificationEmail(user, verificationToken);

            // تسجيل الحدث
            await AuditLogger.logSecurityEvent('USER_CREATED', {
                userId: user._id,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.status(201).json({
                success: true,
                message: 'User registered successfully. Please check your email for verification.',
                userId: SecurityUtils.encrypt(user._id.toString())
            });

        } catch (error) {
            await AuditLogger.logSecurityEvent('REGISTRATION_ERROR', {
                error: error.message,
                ip: req.ip
            });

            res.status(500).json({
                error: 'Registration failed',
                code: 'REGISTRATION_ERROR'
            });
        }
    }

    // تسجيل دخول آمن
    static async login(req, res) {
        try {
            const { email, password, twoFactorCode } = req.body;

            // البحث عن المستخدم
            const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil +twoFactorAuth');

            if (!user) {
                await AuditLogger.logSecurityEvent('LOGIN_FAILED', {
                    reason: 'User not found',
                    email,
                    ip: req.ip
                });

                return res.status(401).json({
                    error: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            // التحقق من حالة القفل
            if (user.isLocked()) {
                await AuditLogger.logSecurityEvent('LOGIN_BLOCKED', {
                    userId: user._id,
                    ip: req.ip,
                    reason: 'Account locked'
                });

                return res.status(423).json({
                    error: 'Account temporarily locked due to multiple failed attempts',
                    code: 'ACCOUNT_LOCKED',
                    unlockTime: user.lockUntil
                });
            }

            // التحقق من كلمة المرور
            const isValidPassword = await user.verifyPassword(password);
            if (!isValidPassword) {
                await user.incrementLoginAttempts();

                await AuditLogger.logSecurityEvent('LOGIN_FAILED', {
                    userId: user._id,
                    ip: req.ip,
                    attempts: user.loginAttempts
                });

                return res.status(401).json({
                    error: 'Invalid credentials',
                    code: 'INVALID_CREDENTIALS',
                    attempts: user.loginAttempts
                });
            }

            // التحقق بخطوتين إذا مفعل
            if (user.twoFactorAuth.enabled) {
                if (!twoFactorCode) {
                    return res.status(400).json({
                        error: 'Two-factor authentication code required',
                        code: '2FA_REQUIRED'
                    });
                }

                const isValid2FA = this.verifyTwoFactorCode(user.twoFactorAuth.secret, twoFactorCode);
                if (!isValid2FA) {
                    await AuditLogger.logSecurityEvent('2FA_FAILED', {
                        userId: user._id,
                        ip: req.ip
                    });

                    return res.status(401).json({
                        error: 'Invalid two-factor code',
                        code: 'INVALID_2FA_CODE'
                    });
                }
            }

            // إعادة تعيين عداد المحاولات
            await user.updateOne({
                loginAttempts: 0,
                lockUntil: undefined,
                lastLogin: new Date()
            });

            // تحديث سجل الدخول
            user.loginHistory.push({
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date()
            });

            await user.save();

            // توليد التوكنات
            const accessToken = this.generateAccessToken(user);
            const refreshToken = this.generateRefreshToken(user);

            // حفظ refresh token
            user.refreshTokens.push({
                token: refreshToken,
                expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 أيام
            });

            await user.save();

            // تسجيل الدخول الناجح
            await AuditLogger.logSecurityEvent('LOGIN_SUCCESS', {
                userId: user._id,
                ip: req.ip,
                with2FA: user.twoFactorAuth.enabled
            });

            res.json({
                success: true,
                tokens: {
                    accessToken,
                    refreshToken,
                    expiresIn: '15m'
                },
                user: {
                    id: SecurityUtils.encrypt(user._id.toString()),
                    email: user.getDecryptedEmail(),
                    role: user.role,
                    isVerified: user.isVerified,
                    has2FA: user.twoFactorAuth.enabled
                }
            });

        } catch (error) {
            await AuditLogger.logSecurityEvent('LOGIN_ERROR', {
                error: error.message,
                ip: req.ip
            });

            res.status(500).json({
                error: 'Login failed',
                code: 'LOGIN_ERROR'
            });
        }
    }

    // تجديد التوكن
    static async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({
                    error: 'Refresh token required',
                    code: 'REFRESH_TOKEN_REQUIRED'
                });
            }

            // التحقق من التوكن
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            const userId = SecurityUtils.decrypt(decoded.userId);

            const user = await User.findOne({
                _id: userId,
                'refreshTokens.token': refreshToken,
                'refreshTokens.expires': { $gt: new Date() }
            });

            if (!user) {
                return res.status(401).json({
                    error: 'Invalid refresh token',
                    code: 'INVALID_REFRESH_TOKEN'
                });
            }

            // توليد توكن جديد
            const newAccessToken = this.generateAccessToken(user);

            res.json({
                success: true,
                accessToken: newAccessToken,
                expiresIn: '15m'
            });

        } catch (error) {
            res.status(401).json({
                error: 'Token refresh failed',
                code: 'TOKEN_REFRESH_FAILED'
            });
        }
    }

    // تسجيل خروج من جميع الأجهزة
    static async logoutAll(req, res) {
        try {
            const userId = req.userId;

            await User.findByIdAndUpdate(userId, {
                $set: { refreshTokens: [] }
            });

            await AuditLogger.logSecurityEvent('LOGOUT_ALL', {
                userId,
                ip: req.ip
            });

            res.json({
                success: true,
                message: 'Logged out from all devices'
            });

        } catch (error) {
            res.status(500).json({
                error: 'Logout failed',
                code: 'LOGOUT_ERROR'
            });
        }
    }

    // توليد توكن الوصول
    static generateAccessToken(user) {
        const payload = {
            userId: SecurityUtils.encrypt(user._id.toString()),
            email: SecurityUtils.encrypt(user.getDecryptedEmail()),
            role: user.role
        };

        return jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE,
            issuer: 'ecommerce-api',
            audience: 'ecommerce-client'
        });
    }

    // توليد توكن التحديث
    static generateRefreshToken(user) {
        const payload = {
            userId: SecurityUtils.encrypt(user._id.toString()),
            type: 'refresh'
        };

        return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
            expiresIn: process.env.JWT_REFRESH_EXPIRE
        });
    }

    // التحقق من كود التحقق بخطوتين
    static verifyTwoFactorCode(secret, code) {
        // تنفيذ التحقق من كود 2FA
        // يمكن استخدام مكتبة مثل speakeasy
        return true; // مؤقتاً
    }
}

export default AuthController;