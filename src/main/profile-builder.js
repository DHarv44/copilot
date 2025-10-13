const fs = require('fs');
const path = require('path');
const os = require('os');
const bus = require('./bus');

// No cache - always scan fresh

// Read InstalledPackagesPath from UserCfg.opt
function readUserCfgOpt() {
  try {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const userCfgPath = path.join(appData, 'Microsoft Flight Simulator', 'UserCfg.opt');

    if (!fs.existsSync(userCfgPath)) {
      console.warn('[profile] UserCfg.opt not found at', userCfgPath);
      return null;
    }

    const content = fs.readFileSync(userCfgPath, 'utf8');
    const match = content.match(/InstalledPackagesPath\s+"(.+?)"/);

    if (match && match[1]) {
      const packagesPath = match[1].replace(/\\\\/g, '\\');
      console.log('[profile] InstalledPackagesPath:', packagesPath);
      return packagesPath;
    }
  } catch (err) {
    console.error('[profile] readUserCfgOpt failed:', err);
  }
  return null;
}

// Find aircraft.cfg by title
function findAircraftByTitle(title) {
  const packagesRoot = readUserCfgOpt();
  if (!packagesRoot) return null;

  const searchPaths = [
    path.join(packagesRoot, 'Official', 'Steam'),  // Steam Official packages
    path.join(packagesRoot, 'Official', 'OneStore'),  // MS Store Official packages
    path.join(packagesRoot, 'Official'),  // Fallback
    path.join(packagesRoot, 'Community')
  ];

  for (const basePath of searchPaths) {
    if (!fs.existsSync(basePath)) continue;

    const result = walkForAircraft(basePath, title);
    if (result) return result;
  }

  return null;
}

function walkForAircraft(baseDir, targetTitle) {
  try {
    const packages = fs.readdirSync(baseDir, { withFileTypes: true });
    console.log('[profile] scanning', packages.length, 'packages in', baseDir);

    for (const pkg of packages) {
      if (!pkg.isDirectory()) continue;

      const simObjectsDir = path.join(baseDir, pkg.name, 'SimObjects', 'Airplanes');
      if (!fs.existsSync(simObjectsDir)) continue;

      const aircrafts = fs.readdirSync(simObjectsDir, { withFileTypes: true });

      for (const ac of aircrafts) {
        if (!ac.isDirectory()) continue;

        const aircraftCfgPath = path.join(simObjectsDir, ac.name, 'aircraft.cfg');
        if (!fs.existsSync(aircraftCfgPath)) continue;

        console.log('[profile] checking', aircraftCfgPath);
        const result = parseAircraftCfg(aircraftCfgPath, targetTitle);
        if (result) {
          console.log('[profile] ✓ MATCH found in', ac.name);
          const aircraftDir = path.join(simObjectsDir, ac.name);

          // If there's a base_container, follow it to get base data
          if (result.baseContainer) {
            // base_container like "..\Asobo_DA62" means go to sibling folder at Airplanes level
            // But if that doesn't exist, search all packages for the base aircraft folder name
            const simObjectsAirplanesDir = path.dirname(aircraftDir);
            let basePath = path.join(simObjectsAirplanesDir, result.baseContainer, 'aircraft.cfg');

            if (!fs.existsSync(basePath)) {
              // Base not found in same package, search all packages
              const baseAircraftName = path.basename(result.baseContainer);
              console.log('[profile] base not in same package, searching for:', baseAircraftName);

              // Search in all Official/Steam and Community packages
              const packagesRoot = readUserCfgOpt();
              if (packagesRoot) {
                const searchPaths = [
                  path.join(packagesRoot, 'Official', 'Steam'),
                  path.join(packagesRoot, 'Official', 'OneStore'),
                  path.join(packagesRoot, 'Community')
                ];

                for (const searchBase of searchPaths) {
                  if (!fs.existsSync(searchBase)) continue;
                  const packages = fs.readdirSync(searchBase, { withFileTypes: true });

                  for (const pkg of packages) {
                    if (!pkg.isDirectory()) continue;
                    const candidatePath = path.join(searchBase, pkg.name, 'SimObjects', 'Airplanes', baseAircraftName, 'aircraft.cfg');
                    if (fs.existsSync(candidatePath)) {
                      basePath = candidatePath;
                      console.log('[profile] ✓ found base in different package:', candidatePath);
                      break;
                    }
                  }
                  if (fs.existsSync(basePath)) break;
                }
              }
            }

            console.log('[profile] following base_container to:', basePath);
            if (fs.existsSync(basePath)) {
              const baseData = parseAircraftCfg(basePath, null); // null = just parse [GENERAL]
              if (baseData) {
                console.log('[profile] ✓ base data loaded:', baseData);
                // Merge base data, preferring base for icao/manufacturer
                return {
                  dir: aircraftDir,
                  aircraftCfgPath,
                  baseDir: path.dirname(basePath),  // baseDir is the directory containing base aircraft.cfg
                  ...result,
                  icao: baseData.icao || result.icao,
                  manufacturer: baseData.icaoManufacturer || result.uiManufacturer,
                  uiType: baseData.icaoModel || result.uiType,
                  panel: null  // Ignore livery panel, use base panel
                };
              }
            }
          }

          return {
            dir: aircraftDir,
            aircraftCfgPath,
            ...result,
            manufacturer: result.uiManufacturer,
            uiType: result.uiType
          };
        }
      }
    }
  } catch (err) {
    console.error('[profile] walkForAircraft error:', err);
  }

  return null;
}

function parseAircraftCfg(cfgPath, targetTitle) {
  try {
    const content = fs.readFileSync(cfgPath, 'utf8');
    const lines = content.split('\n');

    let inFltsim = false;
    let inVariation = false;
    let inGeneral = false;
    let currentFltsim = {};
    let baseContainer = null;
    let generalData = {};

    for (const line of lines) {
      const trimmed = line.trim();

      // Section detection
      if (trimmed.match(/^\[fltsim\.\d+\]/i)) {
        if (targetTitle && currentFltsim.title && currentFltsim.title.trim() === targetTitle.trim()) {
          console.log('[profile] ✓ MATCH found:', currentFltsim.title);
          // Merge general data and return
          return { ...currentFltsim, ...generalData, baseContainer };
        }
        inFltsim = true;
        inVariation = false;
        inGeneral = false;
        currentFltsim = {};
        continue;
      }

      if (trimmed.match(/^\[variation\]/i)) {
        inVariation = true;
        inFltsim = false;
        inGeneral = false;
        continue;
      }

      if (trimmed.match(/^\[general\]/i)) {
        inGeneral = true;
        inFltsim = false;
        inVariation = false;
        continue;
      }

      if (trimmed.match(/^\[/)) {
        if (targetTitle && currentFltsim.title && currentFltsim.title.trim() === targetTitle.trim()) {
          console.log('[profile] ✓ MATCH found:', currentFltsim.title);
          return { ...currentFltsim, ...generalData, baseContainer };
        }
        inFltsim = false;
        inVariation = false;
        inGeneral = false;
        continue;
      }

      // Parse key=value
      if (trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        let value = valueParts.join('=').trim();
        value = value.split(';')[0].trim();
        value = value.replace(/^["']|["']$/g, '').trim();
        const keyLower = key.trim().toLowerCase();

        if (inVariation && keyLower === 'base_container') {
          baseContainer = value;
        } else if (inGeneral) {
          if (keyLower === 'icao_type_designator') generalData.icao = value;
          else if (keyLower === 'icao_manufacturer') generalData.icaoManufacturer = value;
          else if (keyLower === 'icao_model') generalData.icaoModel = value;
        } else if (inFltsim) {
          if (keyLower === 'title') currentFltsim.title = value;
          else if (keyLower === 'ui_manufacturer') currentFltsim.uiManufacturer = value;
          else if (keyLower === 'ui_type') currentFltsim.uiType = value;
          else if (keyLower === 'panel') currentFltsim.panel = value;
        }
      }
    }

    // Check last section
    if (targetTitle && currentFltsim.title && currentFltsim.title.trim() === targetTitle.trim()) {
      console.log('[profile] ✓ MATCH found:', currentFltsim.title);
      return { ...currentFltsim, ...generalData, baseContainer };
    }

    // If no targetTitle, just return generalData (for base aircraft lookup)
    if (!targetTitle && Object.keys(generalData).length > 0) {
      return { ...generalData, baseContainer };
    }
  } catch (err) {
    console.error('[profile] parseAircraftCfg error:', err);
  }

  return null;
}

function detectProfile(title, metadata) {
  // Always scan fresh - no cache
  setImmediate(() => {
    console.log('[profile] scanning for title:', title);

    const aircraftData = findAircraftByTitle(title);

    if (aircraftData) {
      console.log('[profile] ✓ found aircraft.cfg at:', aircraftData.aircraftCfgPath);
      const profile = buildProfile(title, metadata, aircraftData);
      bus.publish({ type: 'aircraftProfile', ...profile });
    } else {
      console.error('[profile] ✗ aircraft.cfg NOT FOUND for title:', title);
      console.error('[profile] This means the title from SimConnect doesn\'t match any [FLTSIM.x] title in aircraft.cfg files');
      bus.publish({ type: 'aircraftError', reason: 'AIRCRAFT_CFG_NOT_FOUND', title });
    }
  });
}

function buildProfile(title, metadata, aircraftData) {
  // Use ui_manufacturer + ui_type for display name, not livery title
  const displayName = aircraftData.manufacturer && aircraftData.uiType
    ? `${aircraftData.manufacturer} ${aircraftData.uiType}`
    : title;

  const profile = {
    title: displayName,
    icao: aircraftData.icao || '',  // Use icao_type_designator from aircraft.cfg, NOT ATC ID
    manufacturer: aircraftData.manufacturer || '',
    uiType: aircraftData.uiType || '',
    avionics: { g1000: false, g3000: false, g3x: false, gtnxi: false },
    autopilot: { available: false, fd: false, modes: [] },
    radios: { com: 0, nav: 0, adf: false, dme: false },
    sources: {
      packageDir: path.dirname(path.dirname(aircraftData.dir)),
      aircraftCfg: aircraftData.aircraftCfgPath
    },
    resolvedBy: 'files',
    ts: Date.now()
  };

  // Resolve effective panel dir: variant panel -> base panel
  let panelDir = null;
  if (aircraftData.panel) {
    panelDir = path.join(aircraftData.dir, 'panel', aircraftData.panel);
  } else if (aircraftData.baseDir) {
    panelDir = path.join(aircraftData.baseDir, 'panel');
  } else {
    panelDir = path.join(aircraftData.dir, 'panel');
  }

  if (fs.existsSync(panelDir)) {
    console.log('[profile] parsing panel at:', panelDir);
    profile.avionics = parsePanel(panelDir);
    profile.sources.panelDir = panelDir;
  } else {
    console.log('[profile] panel not found at:', panelDir);
  }

  // Parse systems from base
  const systemsCfgPath = aircraftData.baseDir
    ? path.join(aircraftData.baseDir, 'systems.cfg')
    : path.join(aircraftData.dir, 'systems.cfg');

  if (fs.existsSync(systemsCfgPath)) {
    console.log('[profile] parsing systems at:', systemsCfgPath);
    profile.autopilot = parseAutopilot(systemsCfgPath);
    profile.sources.systemsCfg = systemsCfgPath;
  } else {
    console.log('[profile] systems.cfg not found at:', systemsCfgPath);
  }

  return profile;
}

function parsePanel(panelDir) {
  const result = { g1000: false, g3000: false, g3x: false, gtnxi: false };

  try {
    const panelCfgPath = path.join(panelDir, 'panel.cfg');
    if (!fs.existsSync(panelCfgPath)) {
      console.log('[profile] panel.cfg not found at:', panelCfgPath);
      return result;
    }

    const content = fs.readFileSync(panelCfgPath, 'utf8');

    // Strip comments (;...)
    const stripped = content.split('\n').map(line => {
      const idx = line.indexOf(';');
      return idx >= 0 ? line.substring(0, idx) : line;
    }).join('\n');

    // Strong token matching - case insensitive, priority order
    const g3000 = /wtg3000/i.test(stripped);
    const g1000 = !g3000 && /(as1000_(pfd|mfd)|wtg1000|workingtitle.*g1000)/i.test(stripped);
    const g3x = !g3000 && !g1000 && /wtg3x/i.test(stripped);
    const gtnxi = /(tds.*gtnxi|pms50.*gtn(650|750)|pms50_gtn)/i.test(stripped);

    result.g1000 = g1000;
    result.g3000 = g3000;
    result.g3x = g3x;
    result.gtnxi = gtnxi;

    console.log('[profile] avionics detected:', result);
  } catch (err) {
    console.error('[profile] parsePanel error:', err);
  }

  return result;
}

function parseAutopilot(systemsCfgPath) {
  const ap = { available: false, fd: false, modes: [] };

  try {
    const content = fs.readFileSync(systemsCfgPath, 'utf8');
    const lines = content.split('\n');

    let inAutopilot = false;

    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();

      if (trimmed === '[autopilot]') {
        inAutopilot = true;
        continue;
      }

      if (trimmed.startsWith('[')) {
        inAutopilot = false;
        continue;
      }

      if (inAutopilot && trimmed.includes('=')) {
        const [key, value] = trimmed.split('=').map(s => s.trim());

        if (key === 'autopilot_available' && value === '1') ap.available = true;
        if (key === 'flight_director_available' && value === '1') ap.fd = true;

        // Modes
        if (value === '1') {
          if (key.includes('heading')) ap.modes.push('HDG');
          if (key.includes('nav')) ap.modes.push('NAV');
          if (key.includes('approach')) ap.modes.push('APR');
          if (key.includes('altitude')) ap.modes.push('ALT');
          if (key.includes('vertical_speed')) ap.modes.push('VS');
          if (key.includes('flc') || key.includes('airspeed')) ap.modes.push('FLC');
          if (key.includes('vnav')) ap.modes.push('VNAV');
        }
      }
    }

    // Deduplicate
    ap.modes = [...new Set(ap.modes)];
  } catch (err) {
    console.error('[profile] parseAutopilot error:', err);
  }

  return ap;
}

function buildHeuristicProfile(title, metadata) {
  return {
    title,
    icao: metadata.atcId || '',
    manufacturer: '',
    uiType: '',
    avionics: { g1000: false, g3000: false, g3x: false, gtnxi: false },
    autopilot: { available: false, fd: false, modes: [] },
    radios: { com: 0, nav: 0, adf: false, dme: false },
    sources: {},
    resolvedBy: 'heuristic',
    ts: Date.now()
  };
}

module.exports = { detectProfile };
