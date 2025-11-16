import Order from '../models/Order.js';
import Product from '../models/Product.js';
import ValidationUtils from '../utils/validation.js';
import { SecurityUtils } from '../utils/encryption.js';
import AuditLogger from '../middleware/audit.js';
import PaymentService from '../services/paymentService.js';

export class OrderController {

    // إنشاء طلب جديد
    static async createOrder(req, res) {
        try {
            const { items, shippingAddress, billingAddress, shippingMethod, couponCode } = req.body;
            const userId = req.userId;

            // التحقق من صحة البيانات
            const validationResult = await this.validateOrderData({
                userId,
                items,
                shippingAddress,
                billingAddress,
                shippingMethod
            });

            if (!validationResult.isValid) {
                return res.status(400).json({
                    error: validationResult.errors.join(', '),
                    code: 'ORDER_VALIDATION_ERROR'
                });
            }

            // إنشاء الطلب
            const order = new Order({
                customer: {
                    userId,
                    email: req.userEmail,
                    phone: shippingAddress.phone
                },
                shippingAddress,
                billingAddress: billingAddress || shippingAddress,
                shipping: {
                    method: shippingMethod,
                    cost: this.calculateShippingCost(shippingMethod),
                    estimatedDelivery: this.calculateEstimatedDelivery(shippingMethod)
                },
                security: {
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    fraudScore: await this.calculateFraudScore(req)
                }
            });

            // إضافة العناصر للطلب
            for (const item of items) {
                const product = await Product.findById(item.productId);
                if (!product) {
                    throw new Error(`المنتج غير موجود: ${item.productId}`);
                }

                if (!product.isAvailable(item.quantity)) {
                    throw new Error(`الكمية غير متوفرة للمنتج: ${product.name}`);
                }

                order.addItem(product, item.quantity, item.variant);
            }

            // تطبيق الكوبون إذا موجود
            if (couponCode) {
                const coupon = await this.validateCoupon(couponCode);
                if (coupon) {
                    order.applyCoupon(coupon);
                }
            }

            // حفظ الطلب
            await order.save();

            // تسجيل الحدث
            await AuditLogger.logSecurityEvent('ORDER_CREATED', {
                orderId: order._id,
                userId,
                itemCount: order.items.length,
                total: order.pricing.total
            });

            res.status(201).json({
                success: true,
                message: 'تم إنشاء الطلب بنجاح',
                order: {
                    id: SecurityUtils.encrypt(order._id.toString()),
                    orderNumber: order.orderNumber,
                    total: order.pricing.total,
                    status: order.status
                }
            });

        } catch (error) {
            await AuditLogger.logSecurityEvent('ORDER_CREATION_ERROR', {
                error: error.message,
                userId: req.userId,
                ip: req.ip
            });

            res.status(500).json({
                error: 'فشل في إنشاء الطلب',
                code: 'ORDER_CREATION_FAILED',
                details: error.message
            });
        }
    }

    // الحصول على طلبات المستخدم
    static async getUserOrders(req, res) {
        try {
            const userId = req.userId;
            const { page = 1, limit = 10, status } = req.query;

            const query = { 'customer.userId': userId };
            if (status) {
                query.status = status;
            }

            const orders = await Order.find(query)
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .populate('items.product', 'name media status');

            const total = await Order.countDocuments(query);

            // تسجيل الوصول
            await AuditLogger.logSecurityEvent('ORDERS_ACCESSED', {
                userId,
                ordersCount: orders.length,
                filters: { status }
            });

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
            await AuditLogger.logSecurityEvent('ORDERS_ACCESS_ERROR', {
                error: error.message,
                userId: req.userId
            });

            res.status(500).json({
                error: 'فشل في جلب الطلبات',
                code: 'ORDERS_FETCH_ERROR'
            });
        }
    }

    // الحصول على طلب محدد
    static async getOrderById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.userId;
            const userRole = req.userRole;

            if (!ValidationUtils.isValidObjectId(id)) {
                return res.status(400).json({
                    error: 'معرف الطلب غير صالح',
                    code: 'INVALID_ORDER_ID'
                });
            }

            const order = await Order.findById(id)
                .populate('items.product', 'name media categories')
                .populate('customer.userId', 'personalInfo email');

            if (!order) {
                return res.status(404).json({
                    error: 'الطلب غير موجود',
                    code: 'ORDER_NOT_FOUND'
                });
            }

            // التحقق من الصلاحيات
            if (userRole !== 'admin' &&
                userRole !== 'super_admin' &&
                order.customer.userId._id.toString() !== userId) {
                return res.status(403).json({
                    error: 'غير مصرح بالوصول لهذا الطلب',
                    code: 'ORDER_ACCESS_DENIED'
                });
            }

            // تسجيل الوصول
            await AuditLogger.logSecurityEvent('ORDER_ACCESSED', {
                orderId: id,
                userId,
                userRole
            });

            res.json({
                success: true,
                order
            });

        } catch (error) {
            await AuditLogger.logSecurityEvent('ORDER_ACCESS_ERROR', {
                error: error.message,
                orderId: req.params.id,
                userId: req.userId
            });

            res.status(500).json({
                error: 'فشل في جلب بيانات الطلب',
                code: 'ORDER_FETCH_ERROR'
            });
        }
    }

    // تحديث حالة الطلب
    static async updateOrderStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, note } = req.body;
            const userId = req.userId;

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

            // التحقق من الصلاحيات
            if (!this.canModifyOrder(req.userRole, order, userId)) {
                return res.status(403).json({
                    error: 'غير مصرح بتحديث حالة هذا الطلب',
                    code: 'ORDER_UPDATE_DENIED'
                });
            }

            // التحقق من صحة الحالة الجديدة
            if (!this.isValidStatusTransition(order.status, status)) {
                return res.status(400).json({
                    error: 'تحول حالة الطلب غير مسموح',
                    code: 'INVALID_STATUS_TRANSITION'
                });
            }

            // تحديث الحالة
            order.updateStatus(status, note, userId);
            await order.save();

            // إرسال إشعار للمستخدم إذا لزم الأمر
            if (this.shouldNotifyCustomer(status)) {
                await this.sendStatusNotification(order, status);
            }

            // تسجيل التحديث
            await AuditLogger.logSecurityEvent('ORDER_STATUS_UPDATED', {
                orderId: id,
                userId,
                oldStatus: order.status,
                newStatus: status,
                note
            });

            res.json({
                success: true,
                message: 'تم تحديث حالة الطلب بنجاح',
                order: {
                    id: SecurityUtils.encrypt(order._id.toString()),
                    status: order.status,
                    orderNumber: order.orderNumber
                }
            });

        } catch (error) {
            await AuditLogger.logSecurityEvent('ORDER_STATUS_UPDATE_ERROR', {
                error: error.message,
                orderId: req.params.id,
                userId: req.userId
            });

            res.status(500).json({
                error: 'فشل في تحديث حالة الطلب',
                code: 'ORDER_UPDATE_ERROR'
            });
        }
    }

    // إلغاء الطلب
    static async cancelOrder(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const userId = req.userId;

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

            // التحقق من إمكانية الإلغاء
            if (!order.canBeCancelled) {
                return res.status(400).json({
                    error: 'لا يمكن إلغاء الطلب في حالته الحالية',
                    code: 'ORDER_CANNOT_BE_CANCELLED'
                });
            }

            // التحقق من الصلاحيات
            if (!this.canModifyOrder(req.userRole, order, userId)) {
                return res.status(403).json({
                    error: 'غير مصرح بإلغاء هذا الطلب',
                    code: 'ORDER_CANCELLATION_DENIED'
                });
            }

            // تحديث الحالة للإلغاء
            order.updateStatus('cancelled', reason || 'تم الإلغاء من قبل المستخدم', userId);
            await order.save();

            // استرداد المبلغ إذا كان مدفوعاً
            if (order.isPaid) {
                await PaymentService.refundPayment(order.payment.transactionId, order.pricing.total);
            }

            // تسجيل الإلغاء
            await AuditLogger.logSecurityEvent('ORDER_CANCELLED', {
                orderId: id,
                userId,
                reason,
                refundAmount: order.isPaid ? order.pricing.total : 0
            });

            res.json({
                success: true,
                message: 'تم إلغاء الطلب بنجاح',
                refundIssued: order.isPaid
            });

        } catch (error) {
            await AuditLogger.logSecurityEvent('ORDER_CANCELLATION_ERROR', {
                error: error.message,
                orderId: req.params.id,
                userId: req.userId
            });

            res.status(500).json({
                error: 'فشل في إلغاء الطلب',
                code: 'ORDER_CANCELLATION_ERROR'
            });
        }
    }

    // ========== الطرق المساعدة ==========

    // التحقق من بيانات الطلب
    static async validateOrderData(orderData) {
        const errors = [];

        if (!orderData.userId) {
            errors.push('معرف المستخدم مطلوب');
        }

        if (!orderData.items || orderData.items.length === 0) {
            errors.push('الطلب يجب أن يحتوي على عناصر واحدة على الأقل');
        }

        if (!orderData.shippingAddress) {
            errors.push('عنوان الشحن مطلوب');
        }

        if (orderData.items) {
            for (const item of orderData.items) {
                const product = await Product.findById(item.productId);
                if (!product) {
                    errors.push(`المنتج غير موجود: ${item.productId}`);
                    continue;
                }

                if (!product.isAvailable(item.quantity)) {
                    errors.push(`الكمية غير متوفرة للمنتج: ${product.name}`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // حساب تكلفة الشحن
    static calculateShippingCost(method) {
        const costs = {
            standard: 15,
            express: 30,
            next_day: 50
        };
        return costs[method] || 15;
    }

    // حساب تاريخ التوصيل المتوقع
    static calculateEstimatedDelivery(method) {
        const deliveryDays = {
            standard: 7,
            express: 3,
            next_day: 1
        };

        const days = deliveryDays[method] || 7;
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date;
    }

    // حساب درجة الاحتيال
    static async calculateFraudScore(req) {
        let score = 0;

        // عوامل المخاطرة
        if (req.ip.includes('tor') || req.ip.includes('vpn')) score += 30;
        if (req.get('User-Agent').includes('bot')) score += 40;

        // يمكن إضافة المزيد من عوامل المخاطرة

        return Math.min(score, 100);
    }

    // التحقق من إمكانية تعديل الطلب
    static canModifyOrder(userRole, order, userId) {
        if (userRole === 'admin' || userRole === 'super_admin') {
            return true;
        }

        return order.customer.userId.toString() === userId;
    }

    // التحقق من تحول الحالة
    static isValidStatusTransition(fromStatus, toStatus) {
        const allowedTransitions = {
            pending: ['confirmed', 'cancelled'],
            confirmed: ['processing', 'cancelled'],
            processing: ['shipped', 'cancelled'],
            shipped: ['delivered'],
            delivered: ['refunded'],
            cancelled: [],
            refunded: []
        };

        return allowedTransitions[fromStatus] ? .includes(toStatus) || false;
    }

    // التحقق من الحاجة لإشعار العميل
    static shouldNotifyCustomer(status) {
        return ['confirmed', 'shipped', 'delivered', 'cancelled'].includes(status);
    }

    // إرسال إشعار حالة الطلب
    static async sendStatusNotification(order, newStatus) {
        // تنفيذ إرسال الإشعارات
        // يمكن استخدام خدمة البريد الإلكتروني أو الإشعارات الدفعية
    }

    // التحقق من صحة الكوبون
    static async validateCoupon(code) {
        // تنفيذ التحقق من الكوبون
        // مؤقتاً: إرجاع كوبون تجريبي
        return {
            code,
            discountValue: 10,
            discountType: 'percentage'
        };
    }
}

export default OrderController;