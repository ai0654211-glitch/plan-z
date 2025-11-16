import React from 'react';

const SecurityVerification = ({ level = 'medium', onComplete = () => {}, onCancel = () => {} }) => {
    return (
        <div className="security-verification">
            <h3>التحقق الأمني ({level})</h3>
            <p>هذا عنصر نائب لعملية التحقق الأمني.</p>
            <div>
                <button onClick={() => onComplete(true)}>تم التحقق</button>
                <button onClick={() => onCancel()}>إلغاء</button>
            </div>
        </div>
    );
};

export default SecurityVerification;
