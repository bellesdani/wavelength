import { Monitor, Wifi } from 'lucide-react';
import { Suspense, lazy, useState } from 'react';
import ActionButton from './components/ActionButton';

type Mode = 'menu' | 'local' | 'online';

const LocalGame = lazy(() => import('./components/LocalGame'));
const OnlineGame = lazy(() => import('./components/OnlineGame'));

const App = () => {
  const [mode, setMode] = useState<Mode>('menu');

  return (
    <main className="h-dvh overflow-hidden bg-[#e9ede8] text-[#202a32]" aria-label="La Ruleta de TikTok">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-center p-3 sm:p-5">
        {mode === 'menu' && (
          <section className="w-full max-w-sm rounded-[1.5rem] bg-[#f7f4ef] p-5 text-center shadow-[0_18px_40px_rgba(32,42,50,0.14)] sm:rounded-[1.75rem] sm:p-6">
            <h1 className="text-2xl font-black uppercase tracking-[0.08em]">La Ruleta de TikTok</h1>
            <p className="mt-2 text-sm font-semibold text-[#7b6f63]">Elige como jugar</p>

            <div className="mt-6 flex flex-col gap-3">
              <ActionButton label="Local" icon={<Monitor />} onClick={() => setMode('local')} />
              <ActionButton label="Online" icon={<Wifi />} onClick={() => setMode('online')} variant="light" />
            </div>
          </section>
        )}

        {mode === 'local' && (
          <Suspense fallback={<LoadingPanel />}>
            <LocalGame />
          </Suspense>
        )}
        {mode === 'online' && (
          <Suspense fallback={<LoadingPanel />}>
            <OnlineGame />
          </Suspense>
        )}
      </div>
    </main>
  );
};

const LoadingPanel = () => (
  <section className="w-full max-w-sm rounded-[1.5rem] bg-[#f7f4ef] p-5 text-center shadow-[0_18px_40px_rgba(32,42,50,0.14)] sm:rounded-[1.75rem] sm:p-6">
    <div className="text-sm font-black uppercase tracking-[0.08em] text-[#52606a]">Cargando...</div>
  </section>
);

export default App;
