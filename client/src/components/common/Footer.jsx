import { Link } from 'react-router-dom';
import { ArrowRight, Award } from 'lucide-react';
import BrandMark from './BrandMark';

const Footer = () => {
  return (
    <footer className="mt-auto border-t" style={{ borderColor: 'rgb(var(--color-border) / 0.8)' }}>
      <div className="section-shell py-8 sm:py-10">
        <div
          className="overflow-hidden rounded-[2rem] border px-5 py-6 sm:px-7 sm:py-8"
          style={{
            borderColor: 'rgb(var(--color-border) / 0.9)',
            background:
              'radial-gradient(circle at top left, rgb(var(--color-accent-200) / 0.16), transparent 28%), linear-gradient(135deg, rgb(var(--color-panel)) 0%, rgb(var(--color-panel-muted)) 100%)',
            boxShadow: '0 22px 60px rgb(15 23 42 / 0.06)',
          }}
        >
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl space-y-5">
              <div className="flex items-center gap-4">
               

                <div>
                  <div className="brand-wordmark text-base uppercase">
                    <span className="text-primary-500">Fakt</span>
                    <span className="text-strong">Check</span>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-soft-ui">
                    Contest Platform
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="max-w-lg text-sm leading-7 text-muted-ui sm:text-[0.95rem]">
                  Run coding rounds, MCQ screenings, form-based assessments, and leaderboard-driven evaluations
                  from one focused workspace.
                </p>

            
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:min-w-[420px] lg:gap-12">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-soft-ui">
                  Explore
                </p>
                <div className="grid gap-2.5 text-sm">
                  <Link to="/contests" className="nav-link inline-flex items-center gap-2">
                    Contests
                  </Link>
                  <Link to="/leaderboard" className="nav-link inline-flex items-center gap-2">
                    Leaderboards
                  </Link>
                  <Link to="/dashboard" className="nav-link inline-flex items-center gap-2">
                    Dashboard
                  </Link>
                  <Link to="/rooms" className="nav-link inline-flex items-center gap-2">
                    Rooms
                  </Link>
                </div>
              </div>

              <div>
             
                <div className="space-y-3">
                  <a
                    href="https://fedkiit.com"
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-2 text-sm text-muted-ui transition-colors hover:text-strong"
                  >
                    Visit FED KIIT
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
                
                </div>
              </div>
            </div>
          </div>

          <div
            className="mt-8 flex flex-col gap-3  pt-5 text-xs sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="text-soft-ui">
              © {new Date().getFullYear()} Fakt Check.
            </div>
          
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
