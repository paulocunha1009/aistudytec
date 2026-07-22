import React from 'react';

const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 disabled:text-slate-300',
};

const sizes = {
  sm: 'min-h-10 px-3 py-2 text-sm',
  md: 'min-h-11 px-4 py-2.5',
  lg: 'min-h-12 px-6 py-3 text-lg',
};

const Button = React.forwardRef(({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors focus-visible:outline-none disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    {...props}
  >
    {children}
  </button>
));

Button.displayName = 'Button';
export default Button;
