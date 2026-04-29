import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import ActionButton from './ActionButton';
import Dial from './Dial';
import { SPIN_DURATION_MS } from '../types/room';

const LocalGame = () => {
  const [coverOpen, setCoverOpen] = useState(false);
  const [guessAngle, setGuessAngle] = useState(90);
  const [wheelRotation, setWheelRotation] = useState(90);
  const [isSpinning, setIsSpinning] = useState(false);
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
    const currentTurns = Math.ceil(wheelRotation / 360);
    const nextRotation = (currentTurns + 4) * 360 + randomAngle;

    setCoverOpen(false);
    setWheelRotation(nextRotation);
    setIsSpinning(true);

    timerRef.current = window.setTimeout(() => {
      setIsSpinning(false);
      timerRef.current = null;
      navigator.vibrate?.(18);
    }, SPIN_DURATION_MS);
  };

  return (
    <>
      <div className="rounded-full bg-white px-5 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#52606a] shadow-[0_12px_28px_rgba(32,42,50,0.1)]">
        Persona 1 adivina - Persona 2 gira
      </div>

      <Dial
        coverOpen={coverOpen}
        guessAngle={guessAngle}
        isSpinning={isSpinning}
        onGuessChange={setGuessAngle}
        spinDurationMs={SPIN_DURATION_MS}
        wheelRotation={wheelRotation}
      />

      <div className="h-16 flex items-center justify-center gap-3">
        <ActionButton label="Girar" icon={<RefreshCw className={isSpinning ? 'animate-spin' : ''} />} onClick={spin} />
        <ActionButton
          label={coverOpen ? 'Tapar' : 'Ver'}
          icon={coverOpen ? <EyeOff /> : <Eye />}
          onClick={() => setCoverOpen((open) => !open)}
        />
      </div>
    </>
  );
};

export default LocalGame;
