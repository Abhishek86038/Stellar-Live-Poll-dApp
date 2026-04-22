import React from 'react';
import './ToastNotification.css';

const ToastNotification = ({ toasts = [] }) => {
  return (
    <div className="toast-container">
      {toasts.map((t) => {
        const icon = t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️';
        return (
          <div key={t.id} className={`toast toast-${t.type || 'info'}`}>
            <span className="toast-icon">{icon}</span>
            <span className="toast-message">{t.msg || t.message}</span>
          </div>
        );
      })}
    </div>
  );
};

export default ToastNotification;
