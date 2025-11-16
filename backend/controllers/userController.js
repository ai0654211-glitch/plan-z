import User from '../models/User.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import ValidationUtils from '../utils/validation.js';
import { SecurityUtils } from '../utils/encryption.js';
import AuditLogger from '../middleware/audit.js';
import EmailService from '../services/emailService.js';

export class UserController {

    // الحصول على ملف المستخدم
    static async getProfile(req, res) {
        try {
            const userId = req.userId;

            const user = await User.findById(userId)
                .select('-password -refreshTokens -loginAttempts -lockUntil -twoFactorAuth.secret');

            if (!user) {
                return res.status(404).json({
                    error: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            // فك تشفير البيانات الحساسة
            const decryptedUser = {
                ...user.toObject(),
                email: user.getDecryptedEmail(),
                personalInfo: user.getDecryptedPersonalInfo()
            };

            // تسجيل الوصول
            await AuditLogger.logSecurityEvent('PROFILE_ACCESSED', {
                userId,
                ip: req.ip
            });

            res.json({
                success: true,
                user: decryptedUser
            });

        } catch (error) {
            await AuditLogger.logSecurityEvent('PROFILE_ACCESS_ERROR', {
                error: error.message,
                userId: req.userId
            });

            res.status(500).json({
                error: 'Failed to fetch user profile',
                code: 'PROFILE_FETCH_ERROR'
            });
        }
    }

    // تحديث ملف المستخدم
    static async updateProfile(req, res) {
        try {
            const userId = req.userId;
            const updateData = req.body;

            // التحقق من البيانات
            const validationResult = this.validateProfileUpdate(updateData);
            if (!validationResult.isValid) {
                return res.status(400).json({
                    error: validationResult.errors.join(', '),
                    code: 'PROFILE_VALIDATION_ERROR'
                });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    error: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            // تحديث البيانات المسموح بها
            const allowedFields = ['personalInfo', 'preferences'];
            Object.keys(updateData).forEach(field => {
                if (allowedFields.includes(field)) {
                    user[field] = {...user[field], ...updateData[field] };
                }
            });

            await user.save();

            // تسجيل التحديث
            await AuditLogger.logSecurityEvent('PROFILE_UPDATED', {
                userId,
                updatedFields: Object.keys(updateData),
                ip: req.ip
            });

            res.json({
                success: true,
                message: 'Profile updated successfully',
                user: {
                    id: SecurityUtils.encrypt(user._id.toString()),
                    email: user.getDecryptedEmail(),
                    personalInfo: user.getDecryptedPersonalInfo()
                }
            });

        } catch (error) {
            await AuditLogger.logSecurityEvent('PROFILE_UPDATE_ERROR', {
                error: error.message,
                userId: req.userId
            });

            res.status(500).json({
                error: 'Failed to update profile',
                code: 'PROFILE_UPDATE_ERROR'
            });
        }
    }

    // تغيير كلمة المرور
    static async changePassword(req, res) {
        try {
            const userId = req.userId;
            const { currentPassword, newPassword, confirmPassword } = req.body;

            // التحقق من البيانات
            if (!currentPassword || !newPassword || !confirmPassword) {
                return res.status(400).json({
                    error: 'All password fields are required',
                    code: 'MISSING_PASSWORD_FIELDS'
                });
            }

            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    error: 'New passwords do not match',
                    code: 'PASSWORD_MISMATCH'
                });
            }

            if (!ValidationUtils.validatePassword(newPassword)) {
                return res.status(400).json({
                    error: 'New password does not meet security requirements',
                    code: 'WEAK_PASSWORD'
                });
            }

            const user = await User.findById(userId).select('+password');
            if (!user) {
                return res.status(404).json({
                    error: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            // التحقق من كلمة المرور الحالية
            const isCurrentPasswordValid = await user.verifyPassword(currentPassword);
            if (!isCurrentPasswordValid) {
                await AuditLogger.logSecurityEvent('PASSWORD_CHANGE_FAILED', {
                    userId,
                    reason: 'invalid_current_password',
                    ip: req.ip
                });

                return res.status(400).json({
                    error: 'Current password is incorrect',
                    code: 'INVALID_CURRENT_PASSWORD'
                });
            }

            // تحديث كلمة المرور
            user.password = newPassword;
            await user.save();

            // إرسال إشعار تغيير كلمة المرور
            await EmailService.sendPasswordChangeNotification(user);

            // تسجيل تغيير كلمة المرور
            await AuditLogger.logSecurityEvent('PASSWORD_CHANGED', {
                userId,
                ip: req.ip
            });

            res.json({
                success: true,
                message: 'Password changed successfully'
            });

        } catch (error) {
            await AuditLogger.logSecurityEvent('PASSWORD_CHANGE_ERROR', {
                error: error.message,
                userId: req.userId
            });

            res.status(500).json({
                error: 'Failed to change password',
                code: 'PASSWORD_CHANGE_ERROR'
            });
        }
    }

    // الحصول على طلبات المستخدم
    static async getUserOrders(req, res) {
        try {
            const userId = req.userId;
            const { page = 1, limit = 10, status } = req.query;

            const orders = await Order.findByUser(userId, {
                page: parseInt(page),
                limit: Math.min(parseInt(limit), 50),
                status
            });

            // تسجيل الوصول
            await AuditLogger.logSecurityEvent('USER_ORDERS_ACCESSED', {
                userId,
                ordersCount: orders.length,
                filters: { status }
            });

            res.json({
                success: true,
                orders,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: orders.length
                }
            });

        } catch (error) {
            await AuditLogger.logSecurityEvent('USER_ORDERS_ACCESS_ERROR', {
                error: error.message,
                userId: req.userId
            });

            res.status(500).json({
                error: 'Failed to fetch user orders',
                code: 'ORDERS_FETCH_ERROR'
            });
        }
    }

    // الحصول على تقييمات المستخدم
    static async getUserReviews(req, res) {
        try {
            const userId = req.userId;
            const { page = 1, limit = 10, status } = req.query;

            const query = { user: userId };
            if (status) query.status = status;

            const reviews = await Review.find(query)
                .populate('product', 'name media images')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Review.countDocuments(query);

            // تسجيل الوصول
            await AuditLogger.logSecurityEvent('USER_REVIEWS_ACCESSED', {
                userId,
                reviewsCount: reviews.length
            });

            res.json({
                success: true,
                reviews,
                pagination: {
                    page: page * 1,
                    limit: limit * 1,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            await AuditLogger.logSecurityEvent('USER_REVIEWS_ACCESS_ERROR', {
                error: error.message,
                userId: req.userId
            });

            res.status(500).json({
                error: 'Failed to fetch user reviews',
                code: 'REVIEWS_FETCH_ERROR'
            });
        }
    }

    // حذف الحساب
    static async deleteAccount(req, res) {
        try {
            const userId = req.userId;
            const { confirmation, password } = req.body;

            if (!confirmation || confirmation !== 'DELETE_MY_ACCOUNT') {
                return res.status(400).json({
                    error: 'Confirmation phrase is required',
                    code: 'CONFIRMATION_REQUIRED'
                });
            }

            const user = await User.findById(userId).select('+password');
            if (!user) {
                return res.status(404).json({
                    error: 'User not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            // التحقق من كلمة المرور
            const isPasswordValid = await user.verifyPassword(password);
            if (!isPasswordValid) {
                await AuditLogger.logSecurityEvent('ACCOUNT_DELETION_FAILED', {
                    userId,
                    reason: 'invalid_password',
                    ip: req.ip
                });

                return res.status(400).json({
                    error: 'Password is incorrect',
                    code: 'INVALID_PASSWORD'
                });
            }

            // حذف منطقي (تعطيل الحساب)
            user.isActive = false;
            user.deletedAt = new Date();
            await user.save();

            // إرسال إشعار حذف الحساب
            await EmailService.sendAccountDeletionNotification(user);

            // تسجيل حذف الحساب
            await AuditLogger.logSecurityEvent('ACCOUNT_DELETED', {
                userId,
                ip: req.ip
            });

            res.json({
                success: true,
                message: 'Account has been deactivated successfully'
            });

        } catch (error) {
            await AuditLogger.logSecurityEvent('ACCOUNT_DELETION_ERROR', {
                error: error.message,
                userId: req.userId
            });

            res.status(500).json({
                error: 'Failed to delete account',
                code: 'ACCOUNT_DELETION_ERROR'
            });
        }
    }

    // إحصائيات المستخدم
    static async getUserStats(req, res) {
        try {
            const userId = req.userId;

            // جلب الإحصائيات الأساسية
            const user = await User.findById(userId);
            const ordersCount = await Order.countDocuments({ 'customer.userId': userId });
            const reviewsCount = await Review.countDocuments({ user: userId });

            res.json({
                success: true,
                stats: {
                    user: {
                        id: user._id,
                        role: user.role,
                        joinedDate: user.createdAt
                    },
                    orders: {
                        total: ordersCount,
                        pending: await Order.countDocuments({ 'customer.userId': userId, status: { $in: ['pending', 'confirmed'] } }),
                        completed: await Order.countDocuments({ 'customer.userId': userId, status: 'delivered' })
                    },
                    reviews: {
                        total: reviewsCount,
                        pending: await Review.countDocuments({ user: userId, status: 'pending' }),
                        approved: await Review.countDocuments({ user: userId, status: 'approved' })
                    }
                }
            });

        } catch (error) {
            await AuditLogger.logSecurityEvent('USER_STATS_ERROR', {
                error: error.message,
                userId: req.userId
            });

            res.status(500).json({
                error: 'Failed to fetch user statistics',
                code: 'STATS_FETCH_ERROR'
            });
        }
    }

    // التحقق من صحة بيانات التحديث
    static validateProfileUpdate(data) {
        const errors = [];

        if (data.personalInfo) {
            if (data.personalInfo.firstName && data.personalInfo.firstName.length < 2) {
                errors.push('First name must be at least 2 characters');
            }
            if (data.personalInfo.lastName && data.personalInfo.lastName.length < 2) {
                errors.push('Last name must be at least 2 characters');
            }
            if (data.personalInfo.phone && !ValidationUtils.validatePhone(data.personalInfo.phone)) {
                errors.push('Invalid phone number');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

export default UserController;