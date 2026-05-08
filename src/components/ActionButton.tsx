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
      ? 'bg-[#17222b] text-white hover:bg-[#0f171e] disabled:bg-[#c8ced2] disabled:text-[#66737c]'
      : 'bg-white/90 text-[#17222b] ring-1 ring-[#d9ded8] hover:bg-white disabled:bg-[#eee8dd] disabled:text-[#9a9085] disabled:ring-transparent';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-12 min-w-0 items-center justify-center gap-2 rounded-lg px-4 text-xs font-black uppercase shadow-[0_14px_28px_rgba(23,34,43,0.14)] transition duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:hover:translate-y-0 disabled:active:scale-100 sm:h-14 sm:min-w-32 sm:gap-3 sm:px-6 sm:text-sm [&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0 ${colors} ${className}`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
};

export default ActionButton;
