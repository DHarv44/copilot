import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { Cockpit } from './components/Cockpit';
import { AutopilotMonitor } from './components/AutopilotMonitor';
import './style.css';

type View = 'sim' | 'cockpit' | 'autopilot';

export default function App() {
  const [currentView, setCurrentView] = useState<View>(() => {
    const saved = localStorage.getItem('lastView');
    return (saved as View) || 'cockpit';
  });

  useEffect(() => {
    localStorage.setItem('lastView', currentView);
  }, [currentView]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        setCurrentView('sim');
      } else if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        setCurrentView('cockpit');
      } else if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        setCurrentView('autopilot');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <nav className="top-nav">
        <button
          className={`nav-btn ${currentView === 'sim' ? 'active' : ''}`}
          onClick={() => setCurrentView('sim')}
          data-view="sim"
        >
          Sim Info
        </button>
        <button
          className={`nav-btn ${currentView === 'cockpit' ? 'active' : ''}`}
          onClick={() => setCurrentView('cockpit')}
          data-view="cockpit"
        >
          Cockpit
        </button>
        <button
          className={`nav-btn ${currentView === 'autopilot' ? 'active' : ''}`}
          onClick={() => setCurrentView('autopilot')}
          data-view="autopilot"
        >
          Autopilot Monitor
        </button>
      </nav>

      <div className={`view ${currentView === 'sim' ? 'active' : ''}`} id="view-sim">
        <Dashboard />
      </div>

      <div className={`view ${currentView === 'cockpit' ? 'active' : ''}`} id="view-cockpit">
        <Cockpit />
      </div>

      <div className={`view ${currentView === 'autopilot' ? 'active' : ''}`} id="view-autopilot">
        <AutopilotMonitor />
      </div>
    </>
  );
}
