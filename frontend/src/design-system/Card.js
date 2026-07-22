import React from 'react';

const Card = ({ as: Element = 'div', className = '', children, ...props }) => (
  <Element className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`} {...props}>{children}</Element>
);

export default Card;
