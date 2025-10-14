import { useSimConnection, useFlightData, useAircraftProfile } from '../hooks/useSimConnect';

export function Dashboard() {
  const { status, statusColor } = useSimConnection();
  const { ias, alt } = useFlightData();
  const { profile, loading, error } = useAircraftProfile();

  return (
    <div>
      <h1>MSFS Dashboard</h1>

      <div className="card">
        <h2>Connection</h2>
        <div className="row">
          <strong>Status:</strong> <span style={{ color: statusColor }}>{status}</span>
        </div>
      </div>

      <div className="card">
        <h2>Flight Data</h2>
        <div className="row">
          <strong>IAS:</strong> <span>{ias}</span>
        </div>
        <div className="row">
          <strong>Altitude:</strong> <span>{alt}</span>
        </div>
      </div>

      {(profile || loading || error) && (
        <div className="card">
          <h2>Aircraft</h2>
          <div className="aircraft-title">
            {profile?.title || '—'}
          </div>
          <div className="aircraft-meta">
            <span>{profile?.manufacturer || '—'}</span>
            <span className="divider">•</span>
            <span>{profile?.icao || '—'}</span>
          </div>

          {error && (
            <div className="section">
              <div className="error">{error}</div>
            </div>
          )}

          {loading && (
            <div className="section">
              <div className="spinner">Detecting avionics...</div>
            </div>
          )}

          {profile && (
            <>
              <div className="section">
                <div className="label">Panel Inventory</div>
                <div className="badges">
                  {profile.panel?.gauges && profile.panel.gauges.length > 0 ? (
                    (() => {
                      const packages: { [key: string]: number } = {};
                      profile.panel.gauges.forEach(gauge => {
                        const parts = gauge.path.split('/');
                        const pkg = parts.slice(0, 2).join('/');
                        packages[pkg] = (packages[pkg] || 0) + 1;
                      });
                      return Object.entries(packages).map(([pkg, count]) => (
                        <span key={pkg} className="badge">
                          {pkg} ({count})
                        </span>
                      ));
                    })()
                  ) : (
                    <span className="none">No gauges detected</span>
                  )}
                </div>
              </div>

              <div className="section">
                <div className="label">Autopilot</div>
                <div className="badges">
                  {profile.autopilot && profile.autopilot.length > 0 ? (
                    profile.autopilot.map(ap => (
                      <span key={ap} className="badge">{ap}</span>
                    ))
                  ) : (
                    <span className="none">No autopilot detected</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
