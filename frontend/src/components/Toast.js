import React from 'react';
import { ToastRegion } from '../design-system';

const Toast = ({ toasts, removeToast }) => <ToastRegion toasts={toasts} onDismiss={removeToast} />;

export default Toast;
