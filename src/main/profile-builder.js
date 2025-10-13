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
  // Deterministic identity from base [GENERAL]
  const displayName = aircraftData.manufacturer && aircraftData.uiType
    ? `${aircraftData.manufacturer} ${aircraftData.uiType}`
    : 'Unresolved';

  const profile = {
    identity: {
      variantTitle: title,
      icao_type_designator: aircraftData.icao || 'unknown',
      icao_manufacturer: aircraftData.manufacturer || 'unknown',
      icao_model: aircraftData.uiType || 'unknown',
      source: {
        variantDir: aircraftData.dir,
        baseDir: aircraftData.baseDir || 'unknown',
        aircraftCfg: aircraftData.aircraftCfgPath
      }
    },
    title: displayName,
    icao: aircraftData.icao || 'unknown',
    manufacturer: aircraftData.manufacturer || 'unknown',
    uiType: aircraftData.uiType || 'unknown',
    panel: { gauges: [], aliasFollowed: false, panelDir: 'unknown' },
    autopilot: { available: 'unknown', fd: 'unknown', resolvedBy: 'unresolved' },
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
    const panelCfgPath = path.join(panelDir, 'panel.cfg');

    if (fs.existsSync(panelCfgPath)) {
      // Check for alias first
      const aliasDir = followPanelAlias(panelDir);
      if (aliasDir && aliasDir !== panelDir) {
        console.log('[profile] following panel alias to:', aliasDir);
        panelDir = aliasDir;
      }

      profile.identity.source.panelDir = panelDir;
      profile.panel = parsePanel(panelDir);
    } else {
      console.log('[profile] panel.cfg not found at:', panelCfgPath);
    }
  } else {
    console.log('[profile] panel directory not found at:', panelDir);
  }

  // Parse systems from base
  const systemsCfgPath = aircraftData.baseDir
    ? path.join(aircraftData.baseDir, 'systems.cfg')
    : path.join(aircraftData.dir, 'systems.cfg');

  if (fs.existsSync(systemsCfgPath)) {
    console.log('[profile] parsing systems at:', systemsCfgPath);
    profile.identity.source.systemsCfg = systemsCfgPath;
    const apResult = parseAutopilot(systemsCfgPath);
    profile.autopilot.available = apResult.available;
    profile.autopilot.fd = apResult.fd;
    profile.autopilot.resolvedBy = apResult.resolvedBy;
  } else {
    console.log('[profile] systems.cfg not found at:', systemsCfgPath);
  }

  return profile;
}

function followPanelAlias(panelDir) {
  try {
    const panelCfgPath = path.join(panelDir, 'panel.cfg');
    if (!fs.existsSync(panelCfgPath)) return null;

    const content = fs.readFileSync(panelCfgPath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const stripped = line.split(';')[0].trim();
      if (stripped.toLowerCase().startsWith('alias=')) {
        const aliasPath = stripped.substring(6).trim().replace(/^["']|["']$/g, '');
        const resolvedPath = path.join(panelDir, '..', aliasPath);
        if (fs.existsSync(resolvedPath)) {
          return resolvedPath;
        }
      }
    }
  } catch (err) {
    console.error('[profile] followPanelAlias error:', err);
  }
  return null;
}

function parsePanelCfg(text) {
  const sections = {};
  let cur = null;
  for (const lineRaw of text.split(/\r?\n/)) {
    const line = lineRaw.replace(/;.*$/, '').trim();
    if (!line) continue;
    const h = line.match(/^\[(.+?)\]$/);
    if (h) { cur = h[1]; sections[cur] = sections[cur] || []; continue; }
    if (!cur) continue;
    const m = line.match(/^\s*(?:gauge|htmlgauge|painting)(\d+)\s*=\s*([^,;]+)/i);
    if (m) sections[cur].push(m[2].trim());
    const a = line.match(/^\s*alias\s*=\s*(.+)$/i);
    if (a) sections[cur].push('ALIAS:' + a[1].trim());
  }
  return sections;
}

function normalizeGaugePath(p) {
  if (p.startsWith('ALIAS:')) return p;
  return p.replace(/\\/g, '/').toLowerCase();
}

function parsePanel(panelDir) {
  const panel = {
    gauges: [],
    aliasFollowed: false,
    panelDir: panelDir
  };

  try {
    const panelCfgPath = path.join(panelDir, 'panel.cfg');
    if (!fs.existsSync(panelCfgPath)) {
      console.log('[profile] UNRESOLVED: panel.cfg not found at:', panelCfgPath);
      return panel;
    }

    let sections = parsePanelCfg(fs.readFileSync(panelCfgPath, 'utf8'));

    // Check for alias and follow one hop
    const alias = Object.values(sections).flat().find(x => x.startsWith('ALIAS:'));
    if (alias) {
      const aliasPath = alias.slice(6);
      const aliasDir = path.resolve(panelDir, '..', aliasPath);
      const aliasCfgPath = path.join(aliasDir, 'panel.cfg');
      if (fs.existsSync(aliasCfgPath)) {
        console.log('[profile] following panel alias to:', aliasDir);
        sections = parsePanelCfg(fs.readFileSync(aliasCfgPath, 'utf8'));
        panelDir = aliasDir;
        panel.aliasFollowed = true;
        panel.panelDir = panelDir;
      }
    }

    // Extract all gauges from VCockpit sections
    for (const [sec, arr] of Object.entries(sections)) {
      if (!/^VCockpit/i.test(sec)) continue;
      for (const g of arr) {
        if (g.startsWith('ALIAS:')) continue;
        panel.gauges.push({ vc: sec, path: normalizeGaugePath(g) });
      }
    }

    console.log('[profile] PANEL INVENTORY:', panel.gauges.length, 'gauges');
    panel.gauges.forEach(g => console.log('  -', g.vc, ':', g.path));
  } catch (err) {
    console.error('[profile] parsePanel error:', err);
  }

  return panel;
}

function parseAutopilot(systemsCfgPath) {
  const ap = { available: 'unknown', fd: 'unknown', resolvedBy: 'unresolved' };

  try {
    const content = fs.readFileSync(systemsCfgPath, 'utf8');
    const lines = content.split('\n');

    let inAutopilot = false;
    let foundApAvailable = false;
    let foundFdAvailable = false;

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

        if (key === 'autopilot_available') {
          foundApAvailable = true;
          ap.available = value === '1' ? 'true' : 'false';
        }
        if (key === 'flight_director_available') {
          foundFdAvailable = true;
          ap.fd = value === '1' ? 'true' : 'false';
        }
      }
    }

    if (foundApAvailable || foundFdAvailable) {
      ap.resolvedBy = 'files';
      console.log('[profile] AUTOPILOT from systems.cfg:', ap);
    } else {
      console.log('[profile] UNRESOLVED: no autopilot_available or flight_director_available keys found');
    }
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
