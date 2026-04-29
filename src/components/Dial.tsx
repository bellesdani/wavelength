import { useRef } from 'react';
import type { PointerEvent } from 'react';
import { motion } from 'motion/react';

const CENTER = 200;
const RADIUS = 150;
const BASE_TOP = CENTER;
const SCORE_RADIUS = RADIUS - 2;
const LABEL_RADIUS = RADIUS - 42;
const POINTER_LENGTH = 128;

interface DialProps {
  canMovePointer?: boolean;
  coverOpen: boolean;
  guessAngle: number;
  isSpinning: boolean;
  wheelRotation: number;
  spinDurationMs: number;
  onGuessChange: (angle: number) => void;
}

const scoreSlices = [
  { color: '#f4d438', from: -34, to: -22, label: '1' },
  { color: '#f28a2e', from: -22, to: -11, label: '2' },
  { color: '#d63a31', from: -11, to: 11, label: '3' },
  { color: '#f28a2e', from: 11, to: 22, label: '2' },
  { color: '#f4d438', from: 22, to: 34, label: '1' },
];

const Dial = ({
  canMovePointer = true,
  coverOpen,
  guessAngle,
  isSpinning,
  wheelRotation,
  spinDurationMs,
  onGuessChange,
}: DialProps) => {
  const dragRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const updateGuess = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;

    const rect = dragRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * (CENTER / 368);
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const raw = (Math.atan2(dy, dx) * 180) / Math.PI;
    const normalized = (raw + 180 + 360) % 360;
    const nextAngle = normalized > 180 ? (normalized > 270 ? 0 : 180) : normalized;

    onGuessChange(nextAngle);
  };

  return (
    <div ref={dragRef} className="relative w-full max-w-[560px] aspect-[1/0.92]">
      <svg viewBox="0 0 400 368" className="h-full w-full drop-shadow-[0_24px_30px_rgba(15,23,42,0.22)]" role="img" aria-label="Ruleta de puntos">
        <defs>
          <radialGradient id="face" cx="48%" cy="42%" r="62%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#eef1ef" />
          </radialGradient>
          <radialGradient id="rim" cx="44%" cy="38%" r="70%">
            <stop offset="0" stopColor="#7b8790" />
            <stop offset="1" stopColor="#47535c" />
          </radialGradient>
          <linearGradient id="baseFill" x1="0" y1="200" x2="0" y2="350" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#66737c" />
            <stop offset="1" stopColor="#46535d" />
          </linearGradient>
          <linearGradient id="baseTopFill" x1="34" y1="205" x2="366" y2="205" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#36434d" />
            <stop offset="0.5" stopColor="#6d7b84" />
            <stop offset="1" stopColor="#33404a" />
          </linearGradient>
          <linearGradient id="baseBodyFill" x1="56" y1="232" x2="344" y2="350" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#71808a" />
            <stop offset="0.58" stopColor="#4c5a64" />
            <stop offset="1" stopColor="#2e3942" />
          </linearGradient>
          <linearGradient id="basePanelFill" x1="102" y1="242" x2="298" y2="330" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#e8efeb" />
            <stop offset="1" stopColor="#bac7c2" />
          </linearGradient>
          <filter id="texture" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="9" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 0.055" />
            </feComponentTransfer>
          </filter>
          <clipPath id="circleFace">
            <circle cx={CENTER} cy={CENTER} r={RADIUS - 18} />
          </clipPath>
          <filter id="pointerShadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#111827" floodOpacity="0.35" />
          </filter>
        </defs>

        <g>
          <motion.g
            animate={{ rotate: wheelRotation }}
            transition={{ duration: isSpinning ? spinDurationMs / 1000 : 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
          >
            {Array.from({ length: 42 }, (_, index) => {
              const angle = (index * 360) / 42;
              const point = polarToCartesian(CENTER, CENTER, RADIUS + 20, angle);
              return <circle key={angle} cx={point.x} cy={point.y} r="10" fill="#4d5963" />;
            })}
          </motion.g>

          <circle cx={CENTER} cy={CENTER} r={RADIUS + 18} fill="url(#rim)" />

          <motion.g
            animate={{ rotate: wheelRotation }}
            transition={{ duration: isSpinning ? spinDurationMs / 1000 : 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
          >
            <circle cx={CENTER} cy={CENTER} r={RADIUS + 7} fill="#52606a" />
            <circle cx={CENTER} cy={CENTER} r={RADIUS - 4} fill="url(#face)" />
            <g clipPath="url(#circleFace)">
              <circle cx={CENTER} cy={CENTER} r={RADIUS - 18} fill="#ffffff" />
              <rect x="52" y="196" width="296" height="8" fill="#43515b" opacity="0.45" />
              <ScoreGroup rotation={0} />
              <ScoreGroup rotation={180} />

              <rect x="52" y="196" width="296" height="8" fill="#111827" opacity="0.26" />
              <rect x="52" y="198.5" width="296" height="3" fill="#ffffff" opacity="0.18" />

              <rect x="52" y="52" width="296" height="296" fill="url(#texture)" />
            </g>
          </motion.g>

          <g
            style={{
              transform: `rotate(${coverOpen ? 180 : 0}deg)`,
              transformOrigin: `${CENTER}px ${CENTER}px`,
              transition: 'transform 780ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            pointerEvents="none"
          >
            <path d="M 42 200 A 158 158 0 0 1 358 200 L 42 200 Z" fill="#2f3a42" />
            <path d="M 52 200 A 148 148 0 0 1 348 200 L 52 200 Z" fill="url(#baseFill)" />
            <path d="M 72 190 A 128 128 0 0 1 328 190 L 72 190 Z" fill="#5f6d76" opacity="0.9" />
            <path d="M 70 184 A 130 130 0 0 1 330 184" fill="none" stroke="#7f8b93" strokeWidth="12" opacity="0.7" />
            <path d="M 52 200 L 348 200" stroke="#2f3a42" strokeWidth="8" strokeLinecap="round" />
            <path d="M 78 186 A 122 122 0 0 1 322 186" fill="none" stroke="#ffffff" strokeWidth="5" opacity="0.16" />
            <circle cx="42" cy="200" r="14" fill="#2f3a42" />
            <circle cx="42" cy="200" r="8" fill="#7f8b93" />
          </g>

          <circle cx={CENTER} cy={CENTER} r="17" fill="#2f3a42" />
          <circle cx={CENTER} cy={CENTER} r="9" fill="#151b20" />
          <circle cx="188" cy="191" r="3" fill="#ffffff" opacity="0.35" />
        </g>

        <g>
          <ellipse cx="200" cy="356" rx="154" ry="17" fill="#111820" opacity="0.18" />
          <path d="M 8 200 L 392 200 L 356 246 L 44 246 Z" fill="url(#baseTopFill)" />
          <path d="M 44 246 L 356 246 L 334 358 L 66 358 Z" fill="url(#baseBodyFill)" />
          <path d="M 50 246 L 350 246 L 340 288 Q 200 313 60 288 Z" fill="#ffffff" opacity="0.09" />
          <path d="M 66 358 L 334 358 L 302 366 L 98 366 Z" fill="#25313a" />
          <path d="M 80 252 L 320 252 L 300 334 Q 200 350 100 334 Z" fill="url(#basePanelFill)" opacity="0.95" />
          <path d="M 98 260 L 302 260" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" opacity="0.45" />
          <Screw x={116} y={286} />
          <Screw x={284} y={286} />
          <text x="200" y="296" textAnchor="middle" fontSize="22" fontWeight="900" letterSpacing="1.4" fill="#202a32">
            WAVELENGTH
          </text>
          <text x="200" y="316" textAnchor="middle" fontSize="12" fontWeight="900" letterSpacing="3" fill="#52606a">
            MINI
          </text>
          <path d="M 116 334 Q 200 348 284 334" stroke="#7d8a92" strokeWidth="5" strokeLinecap="round" opacity="0.45" />
          <path d="M 14 204 L 386 204" stroke="#202a32" strokeWidth="9" strokeLinecap="round" />
          <circle cx={CENTER} cy={BASE_TOP} r="24" fill="#35414a" />
          <circle cx={CENTER} cy={BASE_TOP} r="13" fill="#151b20" />
          <circle cx="190" cy="192" r="4" fill="#ffffff" opacity="0.28" />
          <path d="M 62 358 L 118 358 L 108 366 L 50 366 Z" fill="#202a32" opacity="0.75" />
          <path d="M 282 358 L 338 358 L 350 366 L 292 366 Z" fill="#202a32" opacity="0.75" />
        </g>

        <Pointer rotation={angleToRotation(guessAngle)} />
      </svg>

      {canMovePointer && (
        <div
          className="absolute inset-x-0 top-0 z-10 h-[64%] cursor-pointer touch-none"
          onPointerDown={(event) => {
            isDraggingRef.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            updateGuess(event);
          }}
          onPointerMove={(event) => {
            if (isDraggingRef.current) {
              updateGuess(event);
            }
          }}
          onPointerUp={(event) => {
            isDraggingRef.current = false;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            isDraggingRef.current = false;
          }}
        />
      )}
    </div>
  );
};

const Pointer = ({ rotation }: { rotation: number }) => (
  <g transform={`rotate(${rotation} ${CENTER} ${CENTER})`} filter="url(#pointerShadow)">
    <line
      x1={CENTER}
      y1={CENTER}
      x2={CENTER}
      y2={CENTER - POINTER_LENGTH}
      stroke="#202a32"
      strokeWidth="9"
      strokeLinecap="round"
      opacity="0.28"
    />
    <line
      x1={CENTER}
      y1={CENTER - 2}
      x2={CENTER}
      y2={CENTER - POINTER_LENGTH + 8}
      stroke="#d63a31"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d={`M ${CENTER - 9} ${CENTER - POINTER_LENGTH + 12} L ${CENTER} ${CENTER - POINTER_LENGTH - 6} L ${CENTER + 9} ${CENTER - POINTER_LENGTH + 12} Z`}
      fill="#d63a31"
      stroke="#202a32"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx={CENTER} cy={CENTER} r="6" fill="#202a32" />
    <circle cx={CENTER} cy={CENTER} r="2.5" fill="#d63a31" />
  </g>
);

const Screw = ({ x, y }: { x: number; y: number }) => (
  <g>
    <circle cx={x} cy={y} r="10" fill="#6f7d86" stroke="#202a32" strokeWidth="3" />
    <circle cx={x - 3} cy={y - 4} r="2" fill="#ffffff" opacity="0.35" />
    <path d={`M ${x - 5} ${y + 1} L ${x + 5} ${y - 1}`} stroke="#202a32" strokeWidth="2.5" strokeLinecap="round" />
  </g>
);

const ScoreGroup = ({ rotation }: { rotation: 0 | 180 }) => {
  return (
    <g>
      {scoreSlices.map((slice, index) => {
        const start = rotation + slice.from;
        const end = rotation + slice.to;
        const labelPoint = polarToCartesian(CENTER, CENTER, LABEL_RADIUS, (start + end) / 2);

        return (
          <g key={`${rotation}-${index}`}>
            <path
              d={describeSector(CENTER, CENTER, SCORE_RADIUS, start, end)}
              fill={slice.color}
              stroke="#47535c"
              strokeWidth="1.8"
            />
            <text
              x={labelPoint.x}
              y={labelPoint.y + 7}
              textAnchor="middle"
              fontSize="25"
              fontWeight="900"
              fill={slice.label === '3' ? '#ffffff' : '#3b2f1b'}
            >
              {slice.label}
            </text>
          </g>
        );
      })}
    </g>
  );
};

function describeSector(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;

  return ['M', cx, cy, 'L', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 1, end.x, end.y, 'Z'].join(' ');
}

function angleToRotation(angle: number) {
  return angle - 90;
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

export default Dial;
