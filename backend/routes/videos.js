import express from 'express';
import { AuthMiddleware } from '../middleware/auth.js';
import { ValidationUtils } from '../utils/validation.js';

const router = express.Router();

// الحصول على جميع الفيديوهات
router.get('/', async(req, res) => {
    try {
        const { skip = 0, limit = 10, category } = req.query;

        // بيانات تجريبية
        const videos = [{
                id: 1,
                title: 'شرح المنتج',
                description: 'فيديو شرح مفصل للمنتج',
                url: 'https://example.com/video1',
                thumbnail: 'https://example.com/thumb1.jpg',
                category: 'tutorial',
                duration: 300,
                views: 1500,
                likes: 250,
                createdAt: new Date()
            },
            {
                id: 2,
                title: 'تقييم المنتج',
                description: 'تقييم شامل للمنتج',
                url: 'https://example.com/video2',
                thumbnail: 'https://example.com/thumb2.jpg',
                category: 'review',
                duration: 600,
                views: 800,
                likes: 150,
                createdAt: new Date()
            }
        ];

        res.json({
            success: true,
            data: videos,
            total: videos.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// الحصول على فيديو واحد
router.get('/:videoId', async(req, res) => {
    try {
        const { videoId } = req.params;

        // بيانات تجريبية
        const video = {
            id: videoId,
            title: 'شرح المنتج',
            description: 'فيديو شرح مفصل للمنتج',
            url: 'https://example.com/video1',
            thumbnail: 'https://example.com/thumb1.jpg',
            category: 'tutorial',
            duration: 300,
            views: 1500,
            likes: 250,
            comments: [],
            createdAt: new Date()
        };

        res.json({
            success: true,
            data: video
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// إضافة فيديو جديد (للمشرفين فقط)
router.post('/',
    AuthMiddleware.authenticateToken,
    AuthMiddleware.authorize('admin', 'super_admin'),
    async(req, res) => {
        try {
            const { title, description, url, thumbnail, category, duration } = req.body;

            // التحقق من البيانات
            if (!title || !url || !category) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields'
                });
            }

            // تنظيف البيانات
            const sanitizedVideo = {
                title: ValidationUtils.sanitizeString(title),
                description: ValidationUtils.sanitizeString(description),
                url: ValidationUtils.sanitizeString(url),
                thumbnail: ValidationUtils.sanitizeString(thumbnail),
                category: ValidationUtils.sanitizeString(category),
                duration: parseInt(duration),
                views: 0,
                likes: 0,
                createdAt: new Date(),
                createdBy: req.userId
            };

            res.status(201).json({
                success: true,
                message: 'Video uploaded successfully',
                data: sanitizedVideo
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// تحديث فيديو
router.put('/:videoId',
    AuthMiddleware.authenticateToken,
    AuthMiddleware.authorize('admin', 'super_admin'),
    async(req, res) => {
        try {
            const { videoId } = req.params;
            const { title, description, category } = req.body;

            const updatedVideo = {
                id: videoId,
                title: ValidationUtils.sanitizeString(title),
                description: ValidationUtils.sanitizeString(description),
                category: ValidationUtils.sanitizeString(category),
                updatedAt: new Date(),
                updatedBy: req.userId
            };

            res.json({
                success: true,
                message: 'Video updated successfully',
                data: updatedVideo
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// حذف فيديو
router.delete('/:videoId',
    AuthMiddleware.authenticateToken,
    AuthMiddleware.authorize('admin', 'super_admin'),
    async(req, res) => {
        try {
            const { videoId } = req.params;

            res.json({
                success: true,
                message: 'Video deleted successfully',
                data: { videoId }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// إضافة لايك للفيديو
router.post('/:videoId/like',
    AuthMiddleware.authenticateToken,
    async(req, res) => {
        try {
            const { videoId } = req.params;

            res.json({
                success: true,
                message: 'Like added successfully',
                data: {
                    videoId,
                    userId: req.userId
                }
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