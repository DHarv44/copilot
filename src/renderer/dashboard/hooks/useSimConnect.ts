import { useState, useEffect } from 'react';
import type { SimMessage, AircraftProfile, AutopilotFlags } from '../../../types/simconnect';

interface SimConnectionState {
  connected: boolean;
  status: string;
  statusColor: string;
}

export function useSimConnection() {
  const [state, setState] = useState<SimConnectionState>({
    connected: false,
    status: 'Waiting for sim…',
    statusColor: '#e67e22'
  });

  useEffect(() => {
    if (!window.sim) {
      setState({
        connected: false,
        status: 'Preload not available',
        statusColor: '#e74c3c'
      });
      return;
    }

    window.sim.onUpdate((msg: SimMessage) => {
      if (msg.type === 'status') {
        setState({
          connected: msg.connected || false,
          status: msg.connected ? 'Connected' : 'Disconnected',
          statusColor: msg.connected ? '#2ecc71' : '#e67e22'
        });
      }
    });
  }, []);

  return state;
}

export function useFlightData() {
  const [ias, setIas] = useState<string>('—');
  const [alt, setAlt] = useState<string>('—');

  useEffect(() => {
    if (!window.sim) return;

    window.sim.onUpdate((msg: SimMessage) => {
      if (msg.type === 'sample') {
        if (typeof msg.ias === 'number') {
          setIas(`${msg.ias.toFixed(1)} kt`);
        }
        if (typeof msg.alt === 'number') {
          setAlt(`${Math.round(msg.alt).toLocaleString()} ft`);
        }
      }
    });
  }, []);

  return { ias, alt };
}

export function useAircraftProfile() {
  const [profile, setProfile] = useState<AircraftProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.sim) return;

    window.sim.onUpdate((msg: SimMessage) => {
      if (msg.type === 'aircraft') {
        setLoading(true);
        setError(null);
      }

      if (msg.type === 'aircraftProfile') {
        setProfile(msg as any);
        setLoading(false);
        setError(null);
      }

      if (msg.type === 'aircraftError') {
        setLoading(false);
        if (msg.reason === 'TITLE_EMPTY_TIMEOUT') {
          setError(`⚠ Aircraft data unavailable (TITLE timeout after ${msg.attempts || 10} attempts)`);
        } else if (msg.reason === 'METADATA_EMPTY_TITLE') {
          setError('⚠ Aircraft metadata incomplete (empty TITLE)');
        } else {
          setError(`⚠ Aircraft data error: ${msg.reason}`);
        }
      }
    });
  }, []);

  return { profile, loading, error };
}

export function useAutopilotState() {
  const [apFlags, setApFlags] = useState<AutopilotFlags>({});

  useEffect(() => {
    if (!window.sim) return;

    window.sim.onUpdate((msg: SimMessage) => {
      if (msg.type === 'apState' && msg.flags) {
        setApFlags(msg.flags);
      }
    });
  }, []);

  return apFlags;
}
