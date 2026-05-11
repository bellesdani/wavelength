import { useEffect, useRef } from 'react';

const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT || 'ca-pub-6363643501349064';
const ADSENSE_SCRIPT_ID = 'google-adsense-script';

interface AdSlotProps {
  className?: string;
  slot?: string;
}

const AdSlot = ({ className = '', slot }: AdSlotProps) => {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!slot || pushedRef.current || typeof window === 'undefined') return;

    ensureAdsenseScript();

    try {
      const adsWindow = window as typeof window & {
        adsbygoogle?: unknown[];
      };
      adsWindow.adsbygoogle = adsWindow.adsbygoogle ?? [];
      adsWindow.adsbygoogle.push({});
      pushedRef.current = true;
    } catch {
      pushedRef.current = false;
    }
  }, [slot]);

  if (!slot) return null;

  return (
    <div className={`ad-slot ${className}`}>
      <ins
        className="adsbygoogle"
        data-ad-client={ADSENSE_CLIENT}
        data-ad-format="auto"
        data-ad-slot={slot}
        data-full-width-responsive="true"
        style={{ display: 'block' }}
      />
    </div>
  );
};

function ensureAdsenseScript() {
  if (document.getElementById(ADSENSE_SCRIPT_ID)) return;

  const script = document.createElement('script');
  script.id = ADSENSE_SCRIPT_ID;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  document.head.appendChild(script);
}

export default AdSlot;
