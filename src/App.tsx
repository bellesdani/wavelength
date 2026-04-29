import { Monitor, Wifi } from 'lucide-react';
import { useState } from 'react';
import ActionButton from './components/ActionButton';
import LocalGame from './components/LocalGame';
import OnlineGame from './components/OnlineGame';

type Mode = 'menu' | 'local' | 'online';

const App = () => {
  const [mode, setMode] = useState<Mode>('menu');

  return (
    <main className="min-h-dvh bg-[#f7f4ef] text-[#202a32] flex flex-col items-center justify-center gap-6 p-5 overflow-hidden">
      {mode === 'menu' && (
        <section className="w-full max-w-sm rounded-[2rem] bg-white p-5 text-center shadow-[0_18px_40px_rgba(32,42,50,0.14)]">
          <h1 className="text-2xl font-black uppercase tracking-[0.08em]">Wavelength Mini</h1>
          <p className="mt-2 text-sm font-semibold text-[#7b6f63]">Elige como jugar</p>

          <div className="mt-6 flex flex-col gap-3">
            <ActionButton label="Local" icon={<Monitor />} onClick={() => setMode('local')} />
            <ActionButton label="Online" icon={<Wifi />} onClick={() => setMode('online')} variant="light" />
          </div>
        </section>
      )}

      {mode === 'local' && <LocalGame />}
      {mode === 'online' && <OnlineGame />}
    </main>
  );
};

export default App;
