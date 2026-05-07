import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, RefreshCw } from 'lucide-react';
import ActionButton from './ActionButton';
import Dial from './Dial';
import { DEFAULT_SPIN_DURATION_MS, MAX_EXTRA_TURNS, MIN_EXTRA_TURNS, SPIN_DURATION_RANGE_MS } from '../types/room';

interface LocalGameProps {
  onBack: () => void;
}

const LocalGame = ({ onBack }: LocalGameProps) => {
  const [coverOpen, setCoverOpen] = useState(false);
  const [guessAngle, setGuessAngle] = useState(90);
  const [wheelRotation, setWheelRotation] = useState(90);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinDurationMs, setSpinDurationMs] = useState(DEFAULT_SPIN_DURATION_MS);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const spin = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    const randomAngle = Math.round(Math.random() * 180);
    const extraTurns = randomInt(MIN_EXTRA_TURNS, MAX_EXTRA_TURNS);
    const nextSpinDurationMs = randomInt(SPIN_DURATION_RANGE_MS.min, SPIN_DURATION_RANGE_MS.max);
    const currentTurns = Math.ceil(wheelRotation / 360);
    const nextRotation = (currentTurns + extraTurns) * 360 + randomAngle;

    setCoverOpen(false);
    setSpinDurationMs(nextSpinDurationMs);
    setWheelRotation(nextRotation);
    setIsSpinning(true);

    timerRef.current = window.setTimeout(() => {
      setIsSpinning(false);
      timerRef.current = null;
      navigator.vibrate?.(18);
    }, nextSpinDurationMs);
  };

  return (
    <section className="flex h-full min-h-0 w-full max-w-[430px] flex-col items-center justify-between gap-2 overflow-hidden rounded-none bg-[#f7f4ef] px-1 py-1 sm:h-[720px] sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-[520px] sm:rounded-[1.75rem] sm:px-6 sm:py-5 sm:shadow-[0_22px_60px_rgba(32,42,50,0.16)]">
      <div className="grid w-full shrink-0 grid-cols-[3rem_1fr_3rem] items-start gap-2 sm:grid-cols-[3.5rem_1fr_3.5rem]">
        <button
          type="button"
          onClick={onBack}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#202a32] shadow-[0_12px_24px_rgba(15,23,42,0.12)] active:scale-95 sm:h-14 sm:w-14"
          aria-label="Volver atras"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="max-w-full shrink-0 truncate rounded-full bg-white px-4 py-2 text-center text-[11px] font-black uppercase tracking-[0.1em] text-[#52606a] shadow-[0_10px_22px_rgba(32,42,50,0.1)] sm:px-5 sm:text-xs sm:tracking-[0.14em]">
          Persona 1 adivina - Persona 2 gira
        </div>
        <div />
      </div>

      <Dial
        coverOpen={coverOpen}
        guessAngle={guessAngle}
        isSpinning={isSpinning}
        onGuessChange={setGuessAngle}
        spinDurationMs={spinDurationMs}
        wheelRotation={wheelRotation}
      />

      <div className="grid w-full max-w-sm shrink-0 grid-cols-2 gap-2 sm:flex sm:h-16 sm:items-center sm:justify-center sm:gap-3">
        <ActionButton className="w-full" label="Girar" icon={<RefreshCw className={isSpinning ? 'animate-spin' : ''} />} onClick={spin} />
        <ActionButton
          className="w-full"
          label={coverOpen ? 'Tapar' : 'Ver'}
          icon={coverOpen ? <EyeOff /> : <Eye />}
          onClick={() => setCoverOpen((open) => !open)}
        />
      </div>
    </section>
  );
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default LocalGame;
