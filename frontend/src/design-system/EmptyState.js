import React from 'react';
import { Inbox } from 'lucide-react';
import Card from './Card';

const EmptyState = ({ title, description, action, icon: Icon = Inbox, className = '' }) => (
  <Card className={`py-8 text-center ${className}`}>
    <Icon className="mx-auto text-slate-300" size={36} aria-hidden="true" />
    <h3 className="mt-3 font-bold text-slate-800">{title}</h3>
    {description && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </Card>
);

export default EmptyState;
