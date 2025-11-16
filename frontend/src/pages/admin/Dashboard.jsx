import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated or not admin
  if (!isAuthenticated || user?.role !== 'admin') {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            لوحة التحكم - الأدمن
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">إجمالي المبيعات</h3>
              <p className="text-2xl font-bold text-blue-600">$12,456</p>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold text-green-800 mb-2">الطلبات</h3>
              <p className="text-2xl font-bold text-green-600">156</p>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
              <h3 className="text-lg font-semibold text-purple-800 mb-2">المنتجات</h3>
              <p className="text-2xl font-bold text-purple-600">89</p>
            </div>
            
            <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
              <h3 className="text-lg font-semibold text-orange-800 mb-2">العملاء</h3>
              <p className="text-2xl font-bold text-orange-600">542</p>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              مرحباً بك في لوحة التحكم
            </h2>
            <p className="text-gray-600">
              هذه لوحة التحكم الخاصة بالأدمن. يمكنك إدارة المنتجات والطلبات والعملاء من هنا.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;