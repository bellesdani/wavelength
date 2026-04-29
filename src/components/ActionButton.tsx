import type { ReactNode } from 'react';

interface ActionButtonProps {
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'dark' | 'light';
}

const ActionButton = ({ disabled, icon, label, onClick, variant = 'dark' }: ActionButtonProps) => {
  const colors =
    variant === 'dark'
      ? 'bg-[#202a32] text-white hover:bg-[#111820] disabled:bg-[#c8ced2] disabled:text-[#66737c]'
      : 'bg-white text-[#202a32] hover:bg-[#fffaf2] disabled:bg-[#eee8dd] disabled:text-[#9a9085]';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`h-14 min-w-36 rounded-full px-6 font-black uppercase tracking-[0.08em] flex items-center justify-center gap-3 shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition active:scale-95 disabled:active:scale-100 ${colors}`}
    >
      {icon}
      {label}
    </button>
  );
};

export default ActionButton;
