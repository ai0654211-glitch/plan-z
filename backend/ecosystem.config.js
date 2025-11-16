module.exports = {
    apps: [{
        name: 'planZ-backend',
        script: './server.js',
        instances: 'max',
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'development',
            PORT: 5000,
        },
        env_production: {
            NODE_ENV: 'production',
            PORT: 5000,
        },
        // إعدادات المراقبة
        watch: false,
        max_memory_restart: '1G',

        // إعدادات السجل
        log_file: './logs/combined.log',
        out_file: './logs/out.log',
        error_file: './logs/error.log',
        time: true,

        // إعدادات التوسع
        instance_var: 'INSTANCE_ID',

        // إعدادات الصحة
        min_uptime: '10s',
        max_restarts: 10,
        restart_delay: 4000,

        // إعدادات البيئة
        env: {
            NODE_ENV: 'development'
        },
        env_production: {
            NODE_ENV: 'production'
        }
    }],

    deploy: {
        production: {
            user: 'SSH_USERNAME',
            host: 'SSH_HOSTMACHINE',
            ref: 'origin/main',
            repo: 'GIT_REPOSITORY',
            path: '/var/www/planZ-backend',
            'pre-deploy-local': '',
            'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
            'pre-setup': ''
        }
    }
};