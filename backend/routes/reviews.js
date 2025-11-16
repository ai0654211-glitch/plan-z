import express from 'express';
import { AuthMiddleware } from '../middleware/auth.js';
import { ValidationUtils } from '../utils/validation.js';

const router = express.Router();

// الحصول على جميع التقييمات
router.get('/', async(req, res) => {
    try {
        const { productId, limit = 10, skip = 0 } = req.query;

        // بيانات تجريبية
        const reviews = [{
                id: 1,
                productId,
                userId: 'user1',
                rating: 5,
                title: 'منتج ممتاز',
                content: 'جودة عالية جداً',
                createdAt: new Date()
            },
            {
                id: 2,
                productId,
                userId: 'user2',
                rating: 4,
                title: 'جيد جداً',
                content: 'يستحق السعر',
                createdAt: new Date()
            }
        ];

        res.json({
            success: true,
            data: reviews,
            total: reviews.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// إضافة تقييم جديد
router.post('/',
    AuthMiddleware.authenticateToken,
    async(req, res) => {
        try {
            const { productId, rating, title, content } = req.body;

            // التحقق من البيانات
            if (!productId || !rating || !title || !content) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields'
                });
            }

            if (rating < 1 || rating > 5) {
                return res.status(400).json({
                    success: false,
                    error: 'Rating must be between 1 and 5'
                });
            }

            // تنظيف البيانات
            const sanitizedData = {
                productId: ValidationUtils.sanitizeString(productId),
                title: ValidationUtils.sanitizeString(title),
                content: ValidationUtils.sanitizeString(content),
                rating: parseInt(rating),
                userId: req.userId,
                createdAt: new Date()
            };

            res.status(201).json({
                success: true,
                message: 'Review added successfully',
                data: sanitizedData
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// تحديث تقييم
router.put('/:reviewId',
    AuthMiddleware.authenticateToken,
    async(req, res) => {
        try {
            const { reviewId } = req.params;
            const { rating, title, content } = req.body;

            // تحديث البيانات
            const updatedReview = {
                id: reviewId,
                rating: parseInt(rating),
                title: ValidationUtils.sanitizeString(title),
                content: ValidationUtils.sanitizeString(content),
                updatedAt: new Date()
            };

            res.json({
                success: true,
                message: 'Review updated successfully',
                data: updatedReview
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// حذف تقييم
router.delete('/:reviewId',
    AuthMiddleware.authenticateToken,
    async(req, res) => {
        try {
            const { reviewId } = req.params;

            res.json({
                success: true,
                message: 'Review deleted successfully',
                data: { reviewId }
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