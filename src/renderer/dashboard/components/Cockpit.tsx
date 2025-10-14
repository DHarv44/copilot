import { useEffect, useRef, useState } from 'react';
import { useAutopilotState } from '../hooks/useSimConnect';
import { initializeCockpit, updateControlStates } from '../utils/cockpitControls';

export function Cockpit() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [initialized, setInitialized] = useState(false);
  const apFlags = useAutopilotState();

  // Initialize cockpit SVG on mount
  useEffect(() => {
    if (!containerRef.current || initialized) return;

    const initialize = async () => {
      try {
        await initializeCockpit(containerRef.current!);
        setInitialized(true);
      } catch (err) {
        console.error('Failed to initialize cockpit:', err);
      }
    };

    initialize();
  }, [initialized]);

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
