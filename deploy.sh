#!/bin/bash

# سكريبت النشر لـ PlanZ Ecommerce

set -e

echo "🚀 بدء عملية النشر..."

# المتغيرات
APP_NAME="planZ-ecommerce"
DOCKER_REGISTRY="your-registry"
ENVIRONMENT=${1:-production}

# التحقق من المتغيرات المطلوبة
if [ -z "$DOCKER_REGISTRY" ]; then
    echo "❌ يرجى تعيين DOCKER_REGISTRY"
    exit 1
fi

# بناء الصور
echo "📦 بناء صور Docker..."
docker-compose -f docker-compose.yml build

# إضافة tags للصور
docker tag planz-frontend $DOCKER_REGISTRY/planz-frontend:latest
docker tag planz-backend $DOCKER_REGISTRY/planz-backend:latest

# رفع الصور للسجل
echo "📤 رفع الصور إلى السجل..."
docker push $DOCKER_REGISTRY/planz-frontend:latest
docker push $DOCKER_REGISTRY/planz-backend:latest

# إيقاف الخدمات الحالية
echo "🛑 إيقاف الخدمات الحالية..."
docker-compose down

# سحب أحدث الصور
echo "📥 سحب أحدث الصور..."
docker-compose pull

# تشغيل الخدمات
echo "🔧 تشغيل الخدمات..."
docker-compose up -d

# الانتظار حتى تصبح الخدمات جاهزة
echo "⏳ الانتظار حتى تصبح الخدمات جاهزة..."
sleep 30

# التحقق من حالة الخدمات
echo "🔍 التحقق من حالة الخدمات..."
docker-compose ps

# تنظيف الصور القديمة
echo "🧹 تنظيف الصور القديمة..."
docker image prune -f

echo "✅ تم النشر بنجاح!"
echo "🌐 التطبيق يعمل على: https://yourdomain.com"