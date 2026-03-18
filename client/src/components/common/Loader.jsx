const Loader = ({ size = 'md', fullScreen = false, label = 'Preparing experience...' }) => {
  const sizeClasses = {
    sm: 'h-20 w-20',
    md: 'h-28 w-28',
    lg: 'h-36 w-36',
  };

  const shellClasses = fullScreen
    ? 'page-shell flex min-h-screen items-start justify-center px-4 pt-24'
    : 'flex min-h-[18rem] items-start justify-center px-4 pt-16';

  const loader = (
    <div
      className="relative overflow-hidden rounded-[2rem] px-6 py-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.12)] backdrop-blur-xl"
      
    >
      <style>{`
        @keyframes spinSmooth {
          to { transform: rotate(360deg); }
        }

        @keyframes pulseSoft {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 0.9; transform: scale(1.05); }
        }
      `}</style>

      <div className="relative z-10 flex flex-col items-center gap-4">
        
        {/* Minimal Loader */}
        <div className={`relative ${sizeClasses[size]}`}>
          
          {/* Outer ring */}
          <div
            className="absolute inset-0 rounded-full border"
            style={{
              borderColor: 'rgb(var(--color-border) / 0.5)',
            }}
          />

          {/* Spinning accent ring */}
          <div
            className="absolute inset-0 rounded-full border-t-2 border-r-2"
            style={{
              borderColor: 'rgb(var(--color-accent-500))',
              animation: 'spinSmooth 1s linear infinite',
            }}
          />

        
        </div>

        {/* Text */}
        <div className="space-y-1">
          <p className="text-base font-semibold text-strong">Loading</p>
          <p className="max-w-xs text-sm text-muted-ui">{label}</p>
        </div>
      </div>
    </div>
  );

  return <div className={shellClasses}>{loader}</div>;
};

export default Loader;