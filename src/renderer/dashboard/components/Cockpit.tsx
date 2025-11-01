import { useEffect, useRef, useState } from 'react';
import { useAutopilotState } from '../hooks/useSimConnect';
import { initializeCockpit, updateControlStates } from '../utils/cockpitControls';

export function Cockpit() {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [initialized, setInitialized] = useState(false);
  const apFlags = useAutopilotState();

  // Initialize cockpit SVG on mount
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;

    const initialize = async () => {
      try {
        initializedRef.current = true;
        await initializeCockpit(containerRef.current!);
        setInitialized(true);
      } catch (err) {
        console.error('Failed to initialize cockpit:', err);
        initializedRef.current = false;
      }
    };

    initialize();
  }, []);

  // Update control states when autopilot flags change
  useEffect(() => {
    if (!initialized || !containerRef.current) return;
    updateControlStates(containerRef.current, apFlags);
  }, [apFlags, initialized]);

  return (
    <div className="cockpit-container">
      <div ref={containerRef} id="svg-container" />
    </div>
  );
}
