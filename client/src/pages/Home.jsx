import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Code2, Trophy, Users, Award, ArrowRight, Zap, Target, Medal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Animated counter component
const AnimatedCounter = ({ target, suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const counterRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    let startTime;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * target));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [isVisible, target, duration]);

  return (
    <span ref={counterRef}>
      {count}{suffix}
    </span>
  );
};

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-transparent pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center space-y-8 animate-slideIn">
            <div className="inline-block">
              <div className="bg-primary-500/10 border border-primary-500/30 rounded-full px-4 py-2 inline-flex items-center gap-2 mb-6">
                <Zap className="w-4 h-4 text-primary-500" />
                <span className="text-primary-500 text-sm font-semibold">Weekly Coding Contests</span>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="text-white">Kompete. Kode.</span>
              <br />
              <span className="gradient-text">Konquer.</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto">
              Join weekly coding contests, solve challenging problems, and climb the leaderboard.
              Test your skills in MCQs and coding challenges.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link to="/contests" className="btn-primary text-lg px-8 py-4 flex items-center gap-2 glow-effect">
                Browse Contests
                <ArrowRight className="w-5 h-5" />
              </Link>
              {!isAuthenticated && (
                <Link to="/register" className="btn-outline text-lg px-8 py-4">
                  Get Started Free
                </Link>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-2xl mx-auto mt-12 sm:mt-16 pt-12 sm:pt-16 border-t border-dark-800">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary-500 mb-2">
                  <AnimatedCounter target={500} suffix="+" duration={2000} />
                </div>
                <div className="text-gray-400 text-sm">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary-500 mb-2">
                  <AnimatedCounter target={50} suffix="+" duration={1500} />
                </div>
                <div className="text-gray-400 text-sm">Contests</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary-500 mb-2">
                  <AnimatedCounter target={1000} suffix="+" duration={2500} />
                </div>
                <div className="text-gray-400 text-sm">Problems Solved</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-dark-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4">Why Choose Our Platform?</h2>
            <p className="text-xl text-gray-400">Everything you need to excel in competitive programming</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card-hover group">
              <div className="bg-primary-500/10 p-4 rounded-xl w-fit mb-4 group-hover:bg-primary-500 transition-colors duration-300">
                <Code2 className="w-8 h-8 text-primary-500 group-hover:text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Multi-Language Support</h3>
              <p className="text-gray-400">
                Code in your preferred language - C, C++, Java, Python, JavaScript and more.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card-hover group">
              <div className="bg-primary-500/10 p-4 rounded-xl w-fit mb-4 group-hover:bg-primary-500 transition-colors duration-300">
                <Trophy className="w-8 h-8 text-primary-500 group-hover:text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Real-time Leaderboards</h3>
              <p className="text-gray-400">
                Track your performance and compete with others on live leaderboards.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card-hover group">
              <div className="bg-primary-500/10 p-4 rounded-xl w-fit mb-4 group-hover:bg-primary-500 transition-colors duration-300">
                <Target className="w-8 h-8 text-primary-500 group-hover:text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">MCQ & Aptitude Tests</h3>
              <p className="text-gray-400">
                Test your theoretical knowledge with timed MCQ sections and aptitude tests.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card-hover group">
              <div className="bg-primary-500/10 p-4 rounded-xl w-fit mb-4 group-hover:bg-primary-500 transition-colors duration-300">
                <Medal className="w-8 h-8 text-primary-500 group-hover:text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Certificates</h3>
              <p className="text-gray-400">
                Earn verifiable certificates for your achievements and top rankings.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card-hover group">
              <div className="bg-primary-500/10 p-4 rounded-xl w-fit mb-4 group-hover:bg-primary-500 transition-colors duration-300">
                <Zap className="w-8 h-8 text-primary-500 group-hover:text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Instant Evaluation</h3>
              <p className="text-gray-400">
                Get immediate feedback on your submissions with detailed test case results.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card-hover group">
              <div className="bg-primary-500/10 p-4 rounded-xl w-fit mb-4 group-hover:bg-primary-500 transition-colors duration-300">
                <Users className="w-8 h-8 text-primary-500 group-hover:text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Community Driven</h3>
              <p className="text-gray-400">
                Join a vibrant community of coders and learn from each other.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Only show for non-authenticated users */}
      {!isAuthenticated && (
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="card glow-effect">
              <Award className="w-16 h-16 text-primary-500 mx-auto mb-6" />
              <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4">Ready to Start?</h2>
              <p className="text-xl text-gray-400 mb-8">
                Join thousands of developers competing in weekly contests
              </p>
              <Link to="/register" className="btn-primary text-lg px-8 py-4 inline-flex items-center gap-2">
                Create Free Account
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section - For authenticated users */}
      {isAuthenticated && (
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="card glow-effect">
              <Trophy className="w-16 h-16 text-primary-500 mx-auto mb-6" />
              <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4">Ready to Compete?</h2>
              <p className="text-xl text-gray-400 mb-8">
                Browse upcoming contests and test your skills
              </p>
              <Link to="/contests" className="btn-primary text-lg px-8 py-4 inline-flex items-center gap-2">
                View Contests
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;

