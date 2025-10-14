import { useState, useEffect } from 'react';
import { useAutopilotState } from '../hooks/useSimConnect';
import type { AutopilotFlags } from '../../../types/simconnect';

interface VarRow {
  name: string;
  value: boolean | number;
  changed: boolean;
}

export function AutopilotMonitor() {
  const apFlags = useAutopilotState();
  const [rows, setRows] = useState<VarRow[]>([]);
  const [prevFlags, setPrevFlags] = useState<AutopilotFlags>({});

  useEffect(() => {
    const newRows: VarRow[] = [];

    Object.entries(apFlags).forEach(([key, value]) => {
      const changed = prevFlags[key] !== value;
      newRows.push({ name: key, value, changed });
    });

    // Sort by name
    newRows.sort((a, b) => a.name.localeCompare(b.name));

    setRows(newRows);

    // Clear changed state after animation
    const timeout = setTimeout(() => {
      setRows(prev => prev.map(row => ({ ...row, changed: false })));
    }, 2000);

    setPrevFlags(apFlags);

    return () => clearTimeout(timeout);
  }, [apFlags]);

  const formatValue = (value: boolean | number) => {
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }
    return value.toString();
  };

  const getValueClass = (value: boolean | number) => {
    if (typeof value === 'boolean') {
      return value ? 'value-true' : 'value-false';
    }
    return 'value-number';
  };

  return (
    <div className="autopilot-monitor">
      <h1>Autopilot Variables</h1>
      <table id="ap-vars-table">
        <thead>
          <tr>
            <th>Variable</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.name} className={row.changed ? 'changed' : ''}>
              <td>{row.name}</td>
              <td className={getValueClass(row.value)}>
                {formatValue(row.value)}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={2} style={{ textAlign: 'center', color: '#888' }}>
                No autopilot data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
