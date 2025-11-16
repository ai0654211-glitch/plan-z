const os = require('os');
const v8 = require('v8');

class Monitoring {
    constructor() {
        this.startTime = Date.now();
    }

    // الحصول على إحصائيات النظام
    getSystemStats() {
        return {
            uptime: Math.floor(process.uptime()),
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                used: process.memoryUsage(),
            },
            cpu: {
                load: os.loadavg(),
                cores: os.cpus().length,
            },
            heap: v8.getHeapStatistics(),
            platform: os.platform(),
            arch: os.arch(),
        };
    }

    // مراقبة الأداء
    getPerformanceMetrics() {
        const stats = this.getSystemStats();

        return {
            timestamp: new Date().toISOString(),
            system: {
                uptime: stats.uptime,
                memoryUsage: Math.round((stats.memory.used.rss / 1024 / 1024) * 100) / 100,
                memoryTotal: Math.round(stats.memory.total / 1024 / 1024),
                cpuLoad: stats.cpu.load[0],
            },
            application: {
                nodeVersion: process.version,
                pid: process.pid,
                environment: process.env.NODE_ENV,
            },
            heap: {
                used: Math.round(stats.heap.used_heap_size / 1024 / 1024),
                total: Math.round(stats.heap.total_available_size / 1024 / 1024),
            },
        };
    }

    // إنشاء تقرير صحي
    healthCheck() {
        const metrics = this.getPerformanceMetrics();

        const health = {
            status: 'healthy',
            timestamp: metrics.timestamp,
            checks: {
                memory: metrics.system.memoryUsage < 500 ? 'healthy' : 'warning',
                cpu: metrics.system.cpuLoad < 2 ? 'healthy' : 'warning',
                heap: metrics.heap.used < 100 ? 'healthy' : 'warning',
            },
        };

        // إذا كان هناك تحذيرين أو أكثر، غير الحالة إلى warning
        const warnings = Object.values(health.checks).filter(check => check === 'warning').length;
        if (warnings >= 2) {
            health.status = 'unhealthy';
        }

        return health;
    }
}

module.exports = new Monitoring();