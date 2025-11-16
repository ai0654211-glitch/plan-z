import React from 'react';
import './SecurityBadge.css';

const SecurityBadge = ({ label = 'آمن', small = false }) => (
    <span className={`security-badge ${small ? 'small' : ''}`}>🔒 {label}</span>
);

export default SecurityBadge;
