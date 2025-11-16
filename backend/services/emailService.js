// Email service stub for backend
class EmailService {
    static async sendVerificationEmail(user, token) {
        console.log(`📧 Verification email would be sent to ${user.email} with token: ${token}`);
        return { success: true, sent: false, reason: 'Email service stub' };
    }

    static async sendPasswordChangeNotification(user) {
        console.log(`📧 Password change notification would be sent to ${user.email}`);
        return { success: true, sent: false, reason: 'Email service stub' };
    }

    static async sendAccountDeletionNotification(user) {
        console.log(`📧 Account deletion notification would be sent to ${user.email}`);
        return { success: true, sent: false, reason: 'Email service stub' };
    }

    static async sendOrderNotification(order, status) {
        console.log(`📧 Order notification for order ${order.orderNumber} with status ${status}`);
        return { success: true, sent: false, reason: 'Email service stub' };
    }
}

export default EmailService;