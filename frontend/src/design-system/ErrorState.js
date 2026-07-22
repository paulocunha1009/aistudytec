import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';
import Card from './Card';

const ErrorState = ({ title = 'Não foi possível carregar', message = 'Verifique sua conexão e tente novamente.', onRetry, className = '' }) => (
  <Card role="alert" className={`border-red-200 bg-red-50 py-6 text-center ${className}`}>
    <AlertTriangle className="mx-auto text-red-600" size={32} aria-hidden="true" />
    <h3 className="mt-3 font-bold text-red-900">{title}</h3>
    <p className="mt-1 text-sm text-red-800">{message}</p>
    {onRetry && <Button variant="danger" size="sm" className="mt-4" onClick={onRetry}>Tentar novamente</Button>}
  </Card>
);

export default ErrorState;
