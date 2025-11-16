import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { FrontendSecurity } from '../../utils/security.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import SecurityVerification from '../../components/auth/SecurityVerification.jsx';

const SecureRoute = ({ 
    children, 
    requiredRole = null,
    requiredPermissions = [],
    securityLevel = 'medium',
    fallbackPath = '/login',
    enableVerification = true 
}) => {
    const { 
        isAuthenticated, 
        user, 
        isLoading,
        hasRole 
    } = useAuth();
    
    const location = useLocation();
    const [needsVerification, setNeedsVerification] = React.useState(false);
    const [verificationComplete, setVerificationComplete] = React.useState(false);

    // التحقق من الأمان عند تغيير المسار
    React.useEffect(() => {
        if (isAuthenticated && !isLoading) {
            performSecurityCheck();
        }
    }, [isAuthenticated, isLoading, location.pathname]);

    // إجراء فحص أمان شامل
    const performSecurityCheck = async () => {
        try {
            const securityAssessment = await assessRouteSecurity();
            
            if (securityAssessment.requiresVerification && enableVerification) {
                setNeedsVerification(true);
                
                FrontendSecurity.logSecurityEvent('ROUTE_VERIFICATION_REQUIRED', {
                    route: location.pathname,
                    securityLevel,
                    riskScore: securityAssessment.riskScore,
                    userId: user?.id
                });
            } else {
                setNeedsVerification(false);
                setVerificationComplete(true);
            }
            
        } catch (error) {
            FrontendSecurity.logSecurityEvent('SECURITY_CHECK_FAILED', {
                route: location.pathname,
                error: error.message,
                userId: user?.id
            });
            
            // في حالة فشل الفحص الأمني، نطلب التحقق
            setNeedsVerification(true);
        }
    };

    // تقييم أمان المسار
    const assessRouteSecurity = async () => {
        const checks = {
            // فحص المستخدم والصلاحيات
            userAuthenticated: isAuthenticated,
            hasRequiredRole: requiredRole ? hasRole(requiredRole) : true,
            hasPermissions: requiredPermissions.every(perm => 
                user?.permissions?.includes(perm)
            ),
            
            // فحص الجلسة
            sessionAge: await checkSessionAge(),
            ipConsistency: await checkIPConsistency(),
            deviceTrust: await checkDeviceTrust(),
            
            // فحص المسار
            isSensitiveRoute: checkIfSensitiveRoute(),
            previousAccess: await checkPreviousAccess()
        };

        const riskScore = calculateRiskScore(checks);
        const requiresVerification = riskScore >= getVerificationThreshold();

        return {
            riskScore,
            requiresVerification,
            checks
        };
    };

    // حساب درجة المخاطرة
    const calculateRiskScore = (checks) => {
        let score = 0;

        if (!checks.userAuthenticated) score += 100;
        if (!checks.hasRequiredRole) score += 80;
        if (!checks.hasPermissions) score += 60;
        if (checks.sessionAge > 3600) score += 30; // جلسة أقدم من ساعة
        if (!checks.ipConsistency) score += 40;
        if (!checks.deviceTrust) score += 50;
        if (checks.isSensitiveRoute) score += 20;
        if (!checks.previousAccess) score += 35;

        return Math.min(score, 100);
    };

    // الحصول على عتبة التحقق المطلوبة
    const getVerificationThreshold = () => {
        const thresholds = {
            low: 70,
            medium: 50,
            high: 30,
            critical: 10
        };
        
        return thresholds[securityLevel] || 50;
    };

    // ========== وظائف الفحص الأمني ==========

    const checkSessionAge = () => {
        // محاكاة فحص عمر الجلسة
        return 1800; // 30 دقيقة
    };

    const checkIPConsistency = async () => {
        // التحقق من ثبات عنوان IP
        try {
            const storedIP = FrontendSecurity.secureGetItem('last_known_ip');
            return !storedIP || storedIP === 'current_ip'; // تبسيط
        } catch {
            return false;
        }
    };

    const checkDeviceTrust = async () => {
        // التحقق من ثقة الجهاز
        const deviceFingerprint = await generateDeviceFingerprint();
        const trustedDevices = FrontendSecurity.secureGetItem('trusted_devices') || [];
        return trustedDevices.includes(deviceFingerprint);
    };

    const checkIfSensitiveRoute = () => {
        const sensitiveRoutes = [
            '/admin',
            '/profile',
            '/payment',
            '/security',
            '/orders'
        ];
        
        return sensitiveRoutes.some(route => 
            location.pathname.startsWith(route)
        );
    };

    const checkPreviousAccess = async () => {
        // التحقق من الوصول السابق لهذا المسار
        const accessHistory = FrontendSecurity.secureGetItem('route_access_history') || [];
        return accessHistory.includes(location.pathname);
    };

    const generateDeviceFingerprint = async () => {
        // إنشاء بصمة جهاز مبسطة
        const components = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset()
        ];
        
        return FrontendSecurity.generateSignature(components.join('|'));
    };

    // معالجة اكتمال التحقق
    const handleVerificationComplete = (success) => {
        if (success) {
            setNeedsVerification(false);
            setVerificationComplete(true);
            
            // تسجيل الجهاز كموثوق
            recordTrustedDevice();
            
            FrontendSecurity.logSecurityEvent('ROUTE_VERIFICATION_SUCCESS', {
                route: location.pathname,
                userId: user?.id
            });
        } else {
            FrontendSecurity.logSecurityEvent('ROUTE_VERIFICATION_FAILED', {
                route: location.pathname,
                userId: user?.id
            });
            
            // إعادة التوجيه في حالة فشل التحقق
            window.location.href = fallbackPath;
        }
    };

    const recordTrustedDevice = async () => {
        try {
            const deviceFingerprint = await generateDeviceFingerprint();
            const trustedDevices = FrontendSecurity.secureGetItem('trusted_devices') || [];
            
            if (!trustedDevices.includes(deviceFingerprint)) {
                trustedDevices.push(deviceFingerprint);
                FrontendSecurity.secureSetItem('trusted_devices', trustedDevices);
            }
        } catch (error) {
            console.error('Failed to record trusted device:', error);
        }
    };

    // ========== منطق التوجيه ==========

    // عرض التحميل
    if (isLoading) {
        return (
            <div className="secure-route-loading">
                <LoadingSpinner 
                    size="large" 
                    overlay={true}
                    text="جاري التحقق من الأمان..."
                    secure={true}
                />
            </div>
        );
    }

    // إذا لم يكن مسجل الدخول
    if (!isAuthenticated) {
        FrontendSecurity.logSecurityEvent('ROUTE_ACCESS_DENIED', {
            reason: 'not_authenticated',
            route: location.pathname,
            redirectTo: fallbackPath
        });

        return (
            <Navigate 
                to={fallbackPath} 
                state={{ from: location }} 
                replace 
            />
        );
    }

    // إذا لم يكن لديه الصلاحية المطلوبة
    if (requiredRole && !hasRole(requiredRole)) {
        FrontendSecurity.logSecurityEvent('ROUTE_ACCESS_DENIED', {
            reason: 'insufficient_role',
            route: location.pathname,
            requiredRole,
            userRole: user?.role,
            redirectTo: '/unauthorized'
        });

        return <Navigate to="/unauthorized" replace />;
    }

    // إذا كانت هناك صلاحيات مطلوبة إضافية
    if (requiredPermissions.length > 0 && 
        !requiredPermissions.every(perm => user?.permissions?.includes(perm))) {
        
        FrontendSecurity.logSecurityEvent('ROUTE_ACCESS_DENIED', {
            reason: 'insufficient_permissions',
            route: location.pathname,
            requiredPermissions,
            userPermissions: user?.permissions,
            redirectTo: '/unauthorized'
        });

        return <Navigate to="/unauthorized" replace />;
    }

    // إذا تطلب التحقق الأمني
    if (needsVerification && !verificationComplete) {
        return (
            <div className="security-verification-container">
                <SecurityVerification
                    level={securityLevel}
                    onComplete={handleVerificationComplete}
                    onCancel={() => window.location.href = fallbackPath}
                />
            </div>
        );
    }

    // تسجيل الوصول الناجح
    React.useEffect(() => {
        if (isAuthenticated && !needsVerification && verificationComplete) {
            FrontendSecurity.logSecurityEvent('ROUTE_ACCESS_GRANTED', {
                route: location.pathname,
                userId: user?.id,
                userRole: user?.role,
                securityLevel
            });

            // تحديث سجل الوصول
            updateAccessHistory();
        }
    }, [isAuthenticated, needsVerification, verificationComplete]);

    const updateAccessHistory = () => {
        try {
            const accessHistory = FrontendSecurity.secureGetItem('route_access_history') || [];
            if (!accessHistory.includes(location.pathname)) {
                accessHistory.push(location.pathname);
                FrontendSecurity.secureSetItem('route_access_history', accessHistory);
            }
        } catch (error) {
            console.error('Failed to update access history:', error);
        }
    };

    // إذا اجتاز جميع الشروط، عرض المحتوى
    return children;
};

// مكون للشاشات عالية الأمان
export const HighSecurityRoute = (props) => (
    <SecureRoute 
        {...props}
        securityLevel="high"
        enableVerification={true}
    />
);

// مكون لشاشات الأدمن
export const AdminRoute = (props) => (
    <SecureRoute 
        {...props}
        requiredRole="admin"
        securityLevel="high"
        enableVerification={true}
    />
);

// مكون لشاشات السوبر أدمن
export const SuperAdminRoute = (props) => (
    <SecureRoute 
        {...props}
        requiredRole="super_admin"
        securityLevel="critical"
        enableVerification={true}
    />
);

export default SecureRoute;