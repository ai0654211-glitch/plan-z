import express from 'express';
import AuthController from '../controllers/authController.js';
import { AuthMiddleware } from '../middleware/auth.js';
import ValidationUtils from '../utils/validation.js';

const router = express.Router();

// تطبيق rate limiting على مسارات المصادقة
router.use(AuthMiddleware.rateLimitAuth);

// تسجيل مستخدم جديد
router.post('/register',
    ValidationUtils.sanitizeInput,
    async(req, res, next) => {
        // تحقق إضافي من البيانات
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required',
                code: 'MISSING_CREDENTIALS'
            });
        }

        next();
    },
    AuthController.register
);

// تسجيل دخول
router.post('/login',
    ValidationUtils.sanitizeInput,
    async(req, res, next) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required',
                code: 'MISSING_CREDENTIALS'
            });
        }

        next();
    },
    AuthController.login
);

// تجديد التوكن
router.post('/refresh',
    ValidationUtils.sanitizeInput,
    AuthController.refreshToken
);

// تسجيل خروج من جميع الأجهزة
router.post('/logout-all',
    AuthMiddleware.authenticateToken,
    AuthController.logoutAll
);

// التحقق من التوكن
router.get('/verify',
    AuthMiddleware.authenticateToken,
    (req, res) => {
        res.json({
            success: true,
            user: {
                id: req.userId,
                role: req.userRole,
                isAuthenticated: true
            }
        });
    }
);

// طلبات تحتاج صلاحيات عالية
router.use('/admin',
    AuthMiddleware.authenticateToken,
    AuthMiddleware.authorize('admin', 'super_admin')
);

// إحصائيات المصادقة (للأدمن فقط)
router.get('/admin/stats', async(req, res) => {
    try {
        // هنا يمكن إضافة إحصائيات المصادقة
        res.json({
            success: true,
            stats: {
                totalUsers: 0, // سيتم استبدالها ببيانات حقيقية
                activeSessions: 0,
                failedLogins: 0
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch auth statistics',
            code: 'STATS_FETCH_ERROR'
        });
    }
});

export default router;