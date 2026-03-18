const BrandMark = ({ className = 'h-11 w-11' }) => {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="5" width="54" height="54" rx="16" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.28" />
      <path d="M24 22 16 32l8 10" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 22 48 32l-8 10" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m35 18-6 28" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  );
};

export default BrandMark;
