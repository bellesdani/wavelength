import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import Dial from './components/Dial';

const SPIN_DURATION_MS = 1500;

const App = () => {
  const [coverOpen, setCoverOpen] = useState(false);
  const [guessAngle, setGuessAngle] = useState(90);
  const [wheelRotation, setWheelRotation] = useState(90);
  const [isSpinning, setIsSpinning] = useState(false);
  const timerRef = useRef<number | null>(null);

  const spin = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    const randomAngle = Math.round(Math.random() * 180);
    const currentTurns = Math.ceil(wheelRotation / 360);
    const nextRotation = (currentTurns + 4) * 360 + randomAngle;

    setWheelRotation(nextRotation);
    setIsSpinning(true);

    timerRef.current = window.setTimeout(() => {
      setIsSpinning(false);
      timerRef.current = null;
      navigator.vibrate?.(18);
    }, SPIN_DURATION_MS);
  };

  return (
    <main className="min-h-dvh bg-white flex flex-col items-center justify-center gap-8 p-6 overflow-hidden">
      <Dial
        coverOpen={coverOpen}
        guessAngle={guessAngle}
        isSpinning={isSpinning}
        onGuessChange={setGuessAngle}
        spinDurationMs={SPIN_DURATION_MS}
        wheelRotation={wheelRotation}
      />

      <div className="h-16 flex items-center justify-center gap-3">
        <ActionButton label="Spin" icon={<RefreshCw className={isSpinning ? 'animate-spin' : ''} />} onClick={spin} />
        <ActionButton
          label={coverOpen ? 'Cerrar' : 'Ver'}
          icon={coverOpen ? <EyeOff /> : <Eye />}
          onClick={() => setCoverOpen((open) => !open)}
        />
      </div>
    </main>
  );
};

const ActionButton = ({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="h-14 min-w-36 rounded-full bg-[#202a32] px-6 text-white font-black uppercase tracking-[0.08em] flex items-center justify-center gap-3 shadow-[0_14px_28px_rgba(15,23,42,0.2)] transition hover:bg-[#111820] active:scale-95"
  >
    {icon}
    {label}
  </button>
);

export default App;
