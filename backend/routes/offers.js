import express from 'express';
import { AuthMiddleware } from '../middleware/auth.js';
import { ValidationUtils } from '../utils/validation.js';

const router = express.Router();

// الحصول على جميع العروض
router.get('/', async(req, res) => {
    try {
        const { skip = 0, limit = 10, status = 'active' } = req.query;

        // بيانات تجريبية
        const offers = [{
                id: 1,
                title: 'عرض خصم 50%',
                description: 'خصم 50% على المنتجات المختارة',
                discount: 50,
                type: 'percentage',
                status: 'active',
                startDate: new Date(),
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            },
            {
                id: 2,
                title: 'عرض شراء واحصل على واحد',
                description: 'اشتري واحد وأحصل على آخر مجاني',
                discount: 100,
                type: 'buy_one_get_one',
                status: 'active',
                startDate: new Date(),
                endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
            }
        ];

        res.json({
            success: true,
            data: offers,
            total: offers.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// إضافة عرض جديد (للمشرفين فقط)
router.post('/',
    AuthMiddleware.authenticateToken,
    AuthMiddleware.authorize('admin', 'super_admin'),
    async(req, res) => {
        try {
            const { title, description, discount, type, startDate, endDate } = req.body;

            // التحقق من البيانات
            if (!title || !description || !discount || !type) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields'
                });
            }

            // تنظيف البيانات
            const sanitizedOffer = {
                title: ValidationUtils.sanitizeString(title),
                description: ValidationUtils.sanitizeString(description),
                discount: parseInt(discount),
                type: ValidationUtils.sanitizeString(type),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                status: 'active',
                createdAt: new Date(),
                createdBy: req.userId
            };

            res.status(201).json({
                success: true,
                message: 'Offer created successfully',
                data: sanitizedOffer
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// تحديث عرض
router.put('/:offerId',
    AuthMiddleware.authenticateToken,
    AuthMiddleware.authorize('admin', 'super_admin'),
    async(req, res) => {
        try {
            const { offerId } = req.params;
            const { title, description, discount, status } = req.body;

            const updatedOffer = {
                id: offerId,
                title: ValidationUtils.sanitizeString(title),
                description: ValidationUtils.sanitizeString(description),
                discount: parseInt(discount),
                status: ValidationUtils.sanitizeString(status),
                updatedAt: new Date(),
                updatedBy: req.userId
            };

            res.json({
                success: true,
                message: 'Offer updated successfully',
                data: updatedOffer
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// حذف عرض
router.delete('/:offerId',
    AuthMiddleware.authenticateToken,
    AuthMiddleware.authorize('admin', 'super_admin'),
    async(req, res) => {
        try {
            const { offerId } = req.params;

            res.json({
                success: true,
                message: 'Offer deleted successfully',
                data: { offerId }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

export default router;