import { useState, useEffect, useRef } from 'react';

interface HEvent {
  timestamp: number;
  event: string;
  type: 'sent' | 'error';
  error?: string;
}

export function Debug() {
  const [events, setEvents] = useState<HEvent[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [maxEvents, setMaxEvents] = useState(100);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Store original send for intercepting
    const originalSend = window.cmd?.send;

    if (!originalSend) return;

    // Create a wrapper that will be called instead
    const sendWrapper = function(msg: any) {
      // Log H-events before sending
      if (msg && (msg.type === 'h' || msg.type === 'H')) {
        setEvents(prev => {
          const newEvent: HEvent = {
            timestamp: Date.now(),
            event: msg.event,
            type: 'sent'
          };
          const updated = [newEvent, ...prev].slice(0, maxEvents);
          return updated;
        });
      }

      // Call original send
      return originalSend.call(window.cmd, msg);
    };

    // Try to override the send property with Object.defineProperty
    try {
      const descriptor = Object.getOwnPropertyDescriptor(window.cmd, 'send');

      // Check if property is already non-configurable (meaning it's already been intercepted)
      if (descriptor && !descriptor.configurable) {
        return undefined;
      }

      Object.defineProperty(window.cmd, 'send', {
        value: sendWrapper,
        writable: true,
        configurable: true,
        enumerable: descriptor?.enumerable ?? true
      });

      return () => {
        // Restore original
        if (descriptor) {
          Object.defineProperty(window.cmd, 'send', descriptor);
        }
      };
    } catch (err) {
      console.error('[Debug] Failed to intercept window.cmd.send:', err);
      return undefined;
    }
  }, [maxEvents]);

  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [events, autoScroll]);

  const clearEvents = () => {
    setEvents([]);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${timeStr}.${ms}`;
  };

  return (
    <div className="debug-container">
      <div className="debug-header">
        <h2>H-Event Debug Monitor</h2>
        <div className="debug-controls">
          <label>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
          <label>
            Max events:
            <select value={maxEvents} onChange={(e) => setMaxEvents(Number(e.target.value))}>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </label>
          <button onClick={clearEvents} className="btn-clear">
            Clear
          </button>
          <span className="event-count">{events.length} events</span>
        </div>
      </div>

      <div className="debug-content" ref={listRef}>
        {events.length === 0 ? (
          <div className="empty-state">
            <p>No H-events captured yet.</p>
            <p className="hint">Click any G1000 softkey or turn a knob to see events appear here.</p>
          </div>
        ) : (
          <table className="event-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Event</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, index) => (
                <tr key={`${event.timestamp}-${index}`} className={event.type}>
                  <td className="time">{formatTime(event.timestamp)}</td>
                  <td className="event-name">
                    <code>H:{event.event}</code>
                  </td>
                  <td className="status">
                    {event.type === 'sent' ? (
                      <span className="badge success">✓ Sent</span>
                    ) : (
                      <span className="badge error" title={event.error}>
                        ✗ Error
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
