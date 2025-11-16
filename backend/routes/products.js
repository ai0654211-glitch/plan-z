import express from 'express';
import ProductController from '../controllers/productController.js';
import Product from '../models/Product.js';
import { AuthMiddleware } from '../middleware/auth.js';
import ValidationUtils from '../utils/validation.js';

const router = express.Router();

// مسارات عامة (لا تحتاج مصادقة)
router.get('/',
    ValidationUtils.sanitizeInput,
    ProductController.getProducts
);

router.get('/:id',
    ValidationUtils.sanitizeInput,
    ProductController.getProductById
);

// مسارات تحتاج مصادقة
router.use(AuthMiddleware.authenticateToken);

// إنشاء منتج جديد
router.post('/',
    ValidationUtils.sanitizeInput,
    AuthMiddleware.authorize('vendor', 'admin', 'super_admin'),
    ProductController.createProduct
);

// تحديث منتج
router.put('/:id',
    ValidationUtils.sanitizeInput,
    AuthMiddleware.authorize('vendor', 'admin', 'super_admin'),
    ProductController.updateProduct
);

// حذف منتج
router.delete('/:id',
    ValidationUtils.sanitizeInput,
    AuthMiddleware.authorize('vendor', 'admin', 'super_admin'),
    ProductController.deleteProduct
);

// مسارات إضافية للأدمن فقط
router.use('/admin', AuthMiddleware.authorize('admin', 'super_admin'));

// الحصول على جميع المنتجات (بما فيها المخفية)
router.get('/admin/all', async(req, res) => {
    try {
        const products = await Product.find()
            .populate('vendor', 'personalInfo email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            products,
            total: products.length
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch all products',
            code: 'ADMIN_PRODUCTS_FETCH_ERROR'
        });
    }
});

// تحديث حالة منتج
router.patch('/admin/:id/status', async(req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['draft', 'active', 'archived'].includes(status)) {
            return res.status(400).json({
                error: 'Invalid status',
                code: 'INVALID_STATUS'
            });
        }

        const product = await Product.findByIdAndUpdate(
            id, { status }, { new: true }
        );

        if (!product) {
            return res.status(404).json({
                error: 'Product not found',
                code: 'PRODUCT_NOT_FOUND'
            });
        }

        res.json({
            success: true,
            message: `Product status updated to ${status}`,
            product
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to update product status',
            code: 'STATUS_UPDATE_ERROR'
        });
    }
});

export default router;