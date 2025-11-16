import React from 'react';

const PasswordStrength = ({ password = '' }) => {
    const strength = password.length > 8 ? 'strong' : password.length > 4 ? 'medium' : 'weak';
    return (
        <div className={`password-strength ${strength}`}>
            <small>قوة كلمة المرور: {strength}</small>
        </div>
    );
};

export default PasswordStrength;
