import { TouchableOpacity, Text, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
}

export function Button({ label, variant = 'primary', className = '', ...props }: ButtonProps) {
  let bgClass = '';
  let textClass = 'text-white font-body';

  switch (variant) {
    case 'primary':
      bgClass = 'bg-brand dark:bg-brand-dark';
      break;
    case 'secondary':
      bgClass = 'bg-transparent border border-border dark:border-border-dark';
      textClass = 'text-text-primary dark:text-text-primary-dark font-body';
      break;
    case 'ghost':
      bgClass = 'bg-transparent';
      textClass = 'text-brand dark:text-brand-dark font-body';
      break;
    case 'destructive':
      bgClass = 'bg-accent-error dark:bg-accent-error-dark';
      break;
  }

  return (
    <TouchableOpacity
      className={`min-h-[48px] items-center justify-center rounded-btn px-6 ${bgClass} ${className}`}
      {...props}
    >
      <Text className={textClass}>{label}</Text>
    </TouchableOpacity>
  );
}
