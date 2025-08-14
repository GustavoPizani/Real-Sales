import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10', 
    lg: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${sizeClasses[size]} bg-secondary-custom rounded-lg flex items-center justify-center shadow-lg`}>
        <span className="text-white font-bold text-lg">RS</span>
      </div>
      {showText && (
        <div>
          <h1 className={`font-bold ${textSizeClasses[size]} text-white`}>Real Sales</h1>
          {size !== 'sm' && (
            <p className="text-xs text-gray-300">CRM Imobiliário</p>
          )}
        </div>
      )}
    </div>
  );
}
