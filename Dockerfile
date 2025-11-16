# Dockerfile for Frontend
FROM node:18-alpine as frontend-build

WORKDIR /app

# نسخ package files
COPY package*.json ./
RUN npm ci --only=production

# نسخ الكود المصدري
COPY . .

# بناء التطبيق
RUN npm run build

# مرحلة الإنتاج
FROM nginx:alpine

# نسخ ملفات البناء إلى Nginx
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# نسخ إعدادات Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]