import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  TrendingUp, 
  Shield, 
  BarChart3, 
  Users, 
  Settings,
  ArrowRight,
  CheckCircle2,
  Database,
  Lock,
  Sparkles
} from 'lucide-react';

/**
 * LandingPage Component
 * 
 * A modern, professional landing page for Inventory Management System.
 * Features hero section, key features, benefits, and call-to-action with advanced animations.
 * 
 * @component
 * @returns {JSX.Element} The LandingPage component
 */
const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState<{ [key: string]: boolean }>({});
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Use requestAnimationFrame to defer observer setup
    const rafId = requestAnimationFrame(() => {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible((prev) => ({
                ...prev,
                [entry.target.id]: true,
              }));
              // Unobserve after first intersection for better performance
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '50px' } // Start animation slightly before element is visible
      );

      // Observe refs after a small delay to ensure DOM is ready
      timeoutId = setTimeout(() => {
        Object.values(sectionRefs.current).forEach((ref) => {
          if (ref) observer?.observe(ref);
        });
      }, 100);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (timeoutId) clearTimeout(timeoutId);
      if (observer) {
        Object.values(sectionRefs.current).forEach((ref) => {
          if (ref) observer?.unobserve(ref);
        });
      }
    };
  }, []);

  useEffect(() => {
    // Throttle function to limit mousemove calculations
    let lastTime = 0;
    const throttleDelay = 16; // ~60fps
    
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastTime < throttleDelay) return;
      lastTime = now;
      
      setMousePosition({ x: e.clientX, y: e.clientY });
      
      // Parallax effect for hero section - use requestAnimationFrame for smooth updates
      if (heroRef.current) {
        requestAnimationFrame(() => {
          if (!heroRef.current) return;
          const rect = heroRef.current.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          const y = (e.clientY - rect.top) / rect.height;
          
          const cards = heroRef.current.querySelectorAll('.parallax-card');
          cards.forEach((card, index) => {
            const speed = (index + 1) * 0.1;
            const xOffset = (x - 0.5) * speed * 20;
            const yOffset = (y - 0.5) * speed * 20;
            (card as HTMLElement).style.transform = `translate(${xOffset}px, ${yOffset}px)`;
          });
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const features = [
    {
      icon: Box,
      title: 'Inventory Management',
      description: 'Complete inventory tracking with real-time stock updates and location-based management.',
      color: 'blue'
    },
    {
      icon: TrendingUp,
      title: 'Analytics & Reports',
      description: 'Comprehensive reporting and analytics to make data-driven business decisions.',
      color: 'green'
    },
    {
      icon: Shield,
      title: 'Access Control',
      description: 'Role-based access control ensuring secure and organized user permissions.',
      color: 'purple'
    },
    {
      icon: BarChart3,
      title: 'Stock Monitoring',
      description: 'Real-time stock status monitoring with alerts for low stock and reorder points.',
      color: 'orange'
    },
    {
      icon: Users,
      title: 'User Management',
      description: 'Efficient user and company management with multi-tenant support.',
      color: 'indigo'
    },
    {
      icon: Settings,
      title: 'Customizable Settings',
      description: 'Flexible configuration options to tailor the system to your business needs.',
      color: 'pink'
    }
  ];

  const benefits = [
    'Real-time inventory tracking',
    'Automated stock alerts',
    'Multi-location support',
    'Comprehensive reporting',
    'Role-based security',
    'Bulk import/export',
    'Custom specifications management',
    'Tax & pricing management'
  ];

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Animated Background Particles - Optimized: reduced blur and particles */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ willChange: 'transform' }}>
        <div className="absolute top-20 left-10 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-2xl opacity-15 animate-float" style={{ willChange: 'transform' }}></div>
        <div className="absolute top-40 right-10 w-64 h-64 bg-purple-400 rounded-full mix-blend-multiply filter blur-2xl opacity-15 animate-float" style={{ animationDelay: '2s', willChange: 'transform' }}></div>
        <div className="absolute -bottom-8 left-1/2 w-64 h-64 bg-pink-400 rounded-full mix-blend-multiply filter blur-2xl opacity-15 animate-float" style={{ animationDelay: '4s', willChange: 'transform' }}></div>
      </div>

      {/* Navigation - Optimized: reduced backdrop blur */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 shadow-sm animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="animate-slide-in-left">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Box className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">Inventory System</span>
              </div>
            </div>
            <div className="flex items-center gap-4 animate-slide-in-right">
              <button
                onClick={handleLogin}
                className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 hover:scale-110 magnetic px-8 py-4 rounded-xl text-lg"
              >
                Login
              </button>
              <button
                onClick={handleRegister}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-110 shadow-lg hover-glow flex items-center gap-2 animate-gradient"
              >
                Register Your Company
                <ArrowRight className="w-4 h-4 animate-bounce-slow" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative bg-gradient-to-br from-blue-50 via-white to-blue-50 py-20 lg:py-32 overflow-hidden particle-bg">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4 animate-fade-in-up">
                <h1 className="text-[2.7rem] lg:text-[3.375rem] font-bold text-gray-900 leading-tight">
                  Streamline Your
                  <span className="block animate-shimmer-text">Inventory Management</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed animate-fade-in-up animate-delay-300 mt-[1.1rem]">
                  Powerful, intuitive inventory management system designed for modern businesses. 
                  Track stock, manage orders, and make data-driven decisions with ease.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up animate-delay-400">
                <button
                  onClick={handleLogin}
                  className="group bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:shadow-2xl transition-all transform hover:scale-110 shadow-lg hover-glow flex items-center justify-center gap-2 animate-gradient relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Login
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
                <button
                  onClick={handleRegister}
                  className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-50 transition-all transform hover:scale-110 hover:border-blue-700 magnetic"
                >
                  Register Your Company
                </button>
              </div>

              <div className="flex items-center gap-8 pt-4 animate-fade-in-up animate-delay-500">
                {[
                  { value: '99.9%', label: 'Uptime' },
                  { value: '24/7', label: 'Support' },
                  { value: '1000+', label: 'Active Users' }
                ].map((stat, index) => (
                  <div 
                    key={index}
                    className="transform hover:scale-125 transition-all duration-300 magnetic group"
                  >
                    <div className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative animate-fade-in-up animate-delay-300">
              <div className="parallax-card bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-2xl p-8 shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-500 animate-float hover-3d hover-glow relative overflow-hidden" style={{ willChange: 'transform' }}>
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-transparent to-purple-400/20 animate-gradient opacity-50"></div>
                
                {/* Sparkle effects */}
                <Sparkles className="absolute top-4 right-4 w-6 h-6 text-yellow-300 animate-wiggle" style={{ animationDelay: '0s' }} />
                <Sparkles className="absolute bottom-8 left-6 w-4 h-4 text-yellow-300 animate-wiggle" style={{ animationDelay: '1s' }} />
                
                <div className="bg-white rounded-xl p-6 space-y-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center animate-pulse-slow hover:scale-125 transition-transform">
                      <Box className="w-6 h-6 text-blue-600 animate-bounce-slow" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Inventory Dashboard</div>
                      <div className="text-sm text-gray-500">Real-time overview</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 transform hover:scale-110 transition-transform duration-300 hover-glow group">
                      <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">1,234</div>
                      <div className="text-sm text-gray-600">Total Items</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 transform hover:scale-110 transition-transform duration-300 hover-glow group">
                      <div className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">856</div>
                      <div className="text-sm text-gray-600">In Stock</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section 
        id="features"
        ref={(el) => { sectionRefs.current['features'] = el; }}
        className="py-20 bg-white relative"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 ${isVisible['features'] ? 'animate-zoom-in' : 'opacity-0'}`}>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Inventory
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive features designed to streamline your inventory operations
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const colorClasses = {
                blue: 'bg-blue-100 text-blue-600',
                green: 'bg-green-100 text-green-600',
                purple: 'bg-purple-100 text-purple-600',
                orange: 'bg-orange-100 text-orange-600',
                indigo: 'bg-indigo-100 text-indigo-600',
                pink: 'bg-pink-100 text-pink-600'
              };

              return (
                <div
                  key={index}
                  className={`bg-white border border-gray-200 rounded-xl p-6 hover:shadow-2xl transition-all hover:-translate-y-3 duration-500 hover-3d hover-glow group ${
                    isVisible['features'] 
                      ? 'animate-slide-up' 
                      : 'opacity-0'
                  }`}
                  style={{
                    animationDelay: `${(index + 1) * 0.1}s`
                  }}
                >
                  <div className={`w-12 h-12 rounded-lg ${colorClasses[feature.color as keyof typeof colorClasses]} flex items-center justify-center mb-4 transform group-hover:scale-125 group-hover:rotate-12 transition-all duration-300`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                  
                  {/* Hover effect gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-50/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section 
        id="benefits"
        ref={(el) => { sectionRefs.current['benefits'] = el; }}
        className="py-20 bg-gradient-to-br from-blue-50 to-white particle-bg relative"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className={isVisible['benefits'] ? 'animate-slide-in-left' : 'opacity-0'}>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Why Choose <span className="animate-shimmer-text">Our Platform</span>?
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Built for modern businesses, our platform helps you manage inventory 
                efficiently and scale your operations.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center gap-3 transform hover:translate-x-3 hover:scale-105 transition-all duration-300 magnetic ${
                      isVisible['benefits'] 
                        ? 'animate-fade-in-up' 
                        : 'opacity-0'
                    }`}
                    style={{
                      animationDelay: `${(index + 1) * 0.1}s`
                    }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 animate-bounce-slow" style={{ animationDelay: `${index * 0.2}s` }} />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`space-y-6 ${isVisible['benefits'] ? 'animate-slide-in-right' : 'opacity-0'}`}>
              {[
                {
                  icon: Database,
                  iconBg: 'bg-green-100',
                  iconColor: 'text-green-600',
                  title: 'Scalable Solution',
                  subtitle: 'Grows with your business',
                  description: 'From small businesses to large enterprises, scale effortlessly as you grow.',
                  delay: '0s'
                },
                {
                  icon: Lock,
                  iconBg: 'bg-purple-100',
                  iconColor: 'text-purple-600',
                  title: 'Secure & Compliant',
                  subtitle: 'Enterprise-grade security',
                  description: 'Your data is protected with industry-standard security measures and compliance.',
                  delay: '0.2s'
                }
              ].map((card, index) => {
                const Icon = card.icon;
                return (
                  <div 
                    key={index}
                    className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 transform hover:scale-105 transition-all duration-300 hover-3d hover-glow group"
                    style={{ animationDelay: card.delay }}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center animate-pulse-slow group-hover:scale-125 group-hover:rotate-12 transition-all duration-300`}>
                        <Icon className={`w-6 h-6 ${card.iconColor}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{card.title}</h3>
                        <p className="text-sm text-gray-600">{card.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-gray-600">{card.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        id="cta"
        ref={(el) => { sectionRefs.current['cta'] = el; }}
        className="py-20 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden"
      >
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/30 via-purple-400/30 to-pink-400/30 animate-gradient"></div>
        
        {/* Floating particles - Reduced from 5 to 3 for better performance */}
        <div className="absolute top-10 left-10 w-2 h-2 bg-white/40 rounded-full animate-float" style={{ willChange: 'transform' }}></div>
        <div className="absolute top-20 right-20 w-3 h-3 bg-white/30 rounded-full animate-float" style={{ animationDelay: '1s', willChange: 'transform' }}></div>
        <div className="absolute bottom-10 left-1/4 w-2 h-2 bg-white/40 rounded-full animate-float" style={{ animationDelay: '2s', willChange: 'transform' }}></div>
        
        <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 ${isVisible['cta'] ? 'animate-zoom-in' : 'opacity-0'}`}>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Transform <span className="animate-shimmer-text-white inline-block">Your Inventory Management?</span>
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Join thousands of businesses already using our platform to streamline their operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleLogin}
              className="group bg-white text-indigo-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-indigo-50 transition-all transform hover:scale-110 shadow-2xl hover-glow flex items-center justify-center gap-2 relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                Login
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
            <button
              onClick={handleRegister}
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/20 transition-all transform hover:scale-110 hover:border-pink-200 magnetic backdrop-blur-sm"
            >
              Register Your Company
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Box className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Inventory System</span>
              </div>
              <p className="text-sm text-gray-400">
                Professional inventory management for modern businesses.
              </p>
            </div>

            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Updates'] },
              { title: 'Company', links: ['About', 'Contact', 'Support'] },
              { title: 'Legal', links: ['Privacy', 'Terms', 'Security'] }
            ].map((section, index) => (
              <div key={index}>
                <h3 className="text-white font-semibold mb-4">{section.title}</h3>
                <ul className="space-y-2 text-sm">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a href="#" className="hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block magnetic">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} Inventory Management System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
