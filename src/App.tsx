import { Monitor, ShieldCheck, Sparkles, Trophy, Wifi } from 'lucide-react';
import type { ReactNode } from 'react';
import { Suspense, lazy, useEffect, useState } from 'react';
import Dial from './components/Dial';

type Mode = 'menu' | 'local' | 'online';

const LocalGame = lazy(() => import('./components/LocalGame'));
const OnlineGame = lazy(() => import('./components/OnlineGame'));

const App = () => {
  const [mode, setMode] = useState<Mode>('menu');
  const [homeCoverOpen, setHomeCoverOpen] = useState(false);
  const [homeWheelRotation, setHomeWheelRotation] = useState(22);
  const [homeWheelMoving, setHomeWheelMoving] = useState(false);

  useEffect(() => {
    const moveTimer = window.setTimeout(() => {
      setHomeWheelMoving(true);
      setHomeWheelRotation(382);
    }, 180);
    const openTimer = window.setTimeout(() => setHomeCoverOpen(true), 980);
    const doneTimer = window.setTimeout(() => setHomeWheelMoving(false), 1500);

    return () => {
      window.clearTimeout(moveTimer);
      window.clearTimeout(openTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  return (
    <main className="app-root app-background" aria-label="La Ruleta de TikTok">
      <div className="app-frame">
        {mode === 'menu' && (
          <section className="home-shell">
            <div className="home-copy">
              <div>
                <div className="home-kicker">
                  <Sparkles />
                  Party game
                </div>
                <h1 className="home-title">
                  La Ruleta<br />de TikTok
                </h1>
                <div className="home-pills">
                  <TrustPill icon={<Trophy />} label="Rondas rapidas" />
                  <TrustPill icon={<ShieldCheck />} label="Listo para sala" />
                </div>
              </div>

              <div className="home-actions">
                <button type="button" className="home-button home-button-primary" onClick={() => setMode('local')}>
                  <Monitor />
                  <span>Local</span>
                </button>
                <button type="button" className="home-button home-button-secondary" onClick={() => setMode('online')}>
                  <Wifi />
                  <span>Online</span>
                </button>
              </div>
            </div>

            <div className="home-wheel-stage">
              <div className="home-wheel-shadow" />
              <Dial
                canMovePointer={false}
                className="home-wheel"
                coverOpen={homeCoverOpen}
                guessAngle={96}
                isSpinning={homeWheelMoving}
                onGuessChange={() => undefined}
                spinDurationMs={940}
                wheelRotation={homeWheelRotation}
              />
            </div>
          </section>
        )}

        {mode === 'local' && (
          <Suspense fallback={<LoadingPanel />}>
            <LocalGame onBack={() => setMode('menu')} />
          </Suspense>
        )}
        {mode === 'online' && (
          <Suspense fallback={<LoadingPanel />}>
            <OnlineGame onBack={() => setMode('menu')} />
          </Suspense>
        )}
      </div>
    </main>
  );
};

const LoadingPanel = () => (
  <section className="app-panel w-full max-w-sm rounded-lg p-5 text-center backdrop-blur sm:p-6">
    <div className="text-sm font-black uppercase text-[#52606a]">Cargando...</div>
  </section>
);

const TrustPill = ({ icon, label }: { icon: ReactNode; label: string }) => (
  <div className="home-pill">
    {icon}
    <span>{label}</span>
  </div>
);

export default App;
