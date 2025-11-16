import express from 'express';
import OrderController from '../controllers/orderController.js';
import Order from '../models/Order.js';
import { AuthMiddleware } from '../middleware/auth.js';
import ValidationUtils from '../utils/validation.js';
import AuditLogger from '../middleware/audit.js';

const router = express.Router();

// جميع المسارات تحتاج مصادقة
router.use(AuthMiddleware.authenticateToken);

// إنشاء طلب جديد
router.post('/',
    ValidationUtils.sanitizeInput,
    ValidationUtils.validateSignature,
    async(req, res, next) => {
        // تحقق إضافي من البيانات
        const { items, shippingAddress } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({
                error: 'الطلب يجب أن يحتوي على عناصر',
                code: 'EMPTY_ORDER'
            });
        }

        if (!shippingAddress) {
            return res.status(400).json({
                error: 'عنوان الشحن مطلوب',
                code: 'MISSING_SHIPPING_ADDRESS'
            });
        }

        next();
    },
    OrderController.createOrder
);

// الحصول على طلبات المستخدم
router.get('/',
    ValidationUtils.sanitizeInput,
    OrderController.getUserOrders
);

// الحصول على طلب محدد
router.get('/:id',
    ValidationUtils.sanitizeInput,
    OrderController.getOrderById
);

// تحديث حالة الطلب
router.patch('/:id/status',
    ValidationUtils.sanitizeInput,
    AuthMiddleware.authorize('admin', 'super_admin'),
    async(req, res, next) => {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                error: 'حالة الطلب مطلوبة',
                code: 'MISSING_STATUS'
            });
        }

        next();
    },
    OrderController.updateOrderStatus
);

// إلغاء الطلب
router.post('/:id/cancel',
    ValidationUtils.sanitizeInput,
    async(req, res, next) => {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                error: 'سبب الإلغاء مطلوب',
                code: 'MISSING_CANCELLATION_REASON'
            });
        }

        next();
    },
    OrderController.cancelOrder
);

// مسارات الأدمن فقط
router.use('/admin', AuthMiddleware.authorize('admin', 'super_admin'));

// الحصول على جميع الطلبات
router.get('/admin/all',
    ValidationUtils.sanitizeInput,
    async(req, res) => {
        try {
            const {
                page = 1,
                    limit = 20,
                    status,
                    startDate,
                    endDate
            } = req.query;

            const query = {};
            if (status) query.status = status;
            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }

            const orders = await Order.find(query)
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .populate('customer.userId', 'personalInfo email')
                .populate('items.product', 'name');

            const total = await Order.countDocuments(query);

            res.json({
                success: true,
                orders,
                pagination: {
                    page: page * 1,
                    limit: limit * 1,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            res.status(500).json({
                error: 'فشل في جلب الطلبات',
                code: 'ADMIN_ORDERS_FETCH_ERROR'
            });
        }
    }
);

// إحصائيات الطلبات
router.get('/admin/stats',
    ValidationUtils.sanitizeInput,
    async(req, res) => {
        try {
            const stats = await Order.getOrderStats();

            // إحصائيات إضافية
            const statusCounts = await Order.aggregate([{
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }]);

            const recentOrders = await Order.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('customer.userId', 'personalInfo');

            res.json({
                success: true,
                stats: {
                    ...stats,
                    statusCounts,
                    recentOrders: recentOrders.length
                }
            });
        } catch (error) {
            res.status(500).json({
                error: 'فشل في جلب إحصائيات الطلبات',
                code: 'STATS_FETCH_ERROR'
            });
        }
    }
);

// حذف طلب (للأدمن فقط)
router.delete('/admin/:id',
    ValidationUtils.sanitizeInput,
    async(req, res) => {
        try {
            const { id } = req.params;

            if (!ValidationUtils.isValidObjectId(id)) {
                return res.status(400).json({
                    error: 'معرف الطلب غير صالح',
                    code: 'INVALID_ORDER_ID'
                });
            }

            const order = await Order.findById(id);
            if (!order) {
                return res.status(404).json({
                    error: 'الطلب غير موجود',
                    code: 'ORDER_NOT_FOUND'
                });
            }

            // حذف منطقي (أرشفة) بدلاً من الحذف الفعلي
            order.status = 'archived';
            await order.save();

            await AuditLogger.logSecurityEvent('ORDER_ARCHIVED', {
                orderId: id,
                adminId: req.userId
            });

            res.json({
                success: true,
                message: 'تم أرشفة الطلب بنجاح'
            });
        } catch (error) {
            res.status(500).json({
                error: 'فشل في أرشفة الطلب',
                code: 'ORDER_ARCHIVE_ERROR'
            });
        }
    }
);

export default router;