import type { ReactNode } from 'react';

interface ActionButtonProps {
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'dark' | 'light';
}

const ActionButton = ({ className = '', disabled, icon, label, onClick, variant = 'dark' }: ActionButtonProps) => {
  const colors =
    variant === 'dark'
      ? 'bg-[#202a32] text-white hover:bg-[#111820] disabled:bg-[#c8ced2] disabled:text-[#66737c]'
      : 'bg-white text-[#202a32] hover:bg-[#fffaf2] disabled:bg-[#eee8dd] disabled:text-[#9a9085]';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-12 min-w-0 items-center justify-center gap-2 rounded-full px-4 text-xs font-black uppercase tracking-[0.06em] shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition active:scale-95 disabled:active:scale-100 sm:h-14 sm:min-w-32 sm:gap-3 sm:px-6 sm:text-sm [&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0 ${colors} ${className}`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
};

export default ActionButton;
