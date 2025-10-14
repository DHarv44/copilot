/**
 * Example integration of PopoutCapture into cockpit view
 * This file demonstrates how to use the popout capture system
 */

import React from 'react';
import { PopoutManager } from './PopoutManager';

/**
 * Example: G1000 PFD and MFD popouts
 */
export function G1000PopoutsExample() {
  return (
    <PopoutManager
      autoAttachEnabled={true}
      regions={[
        {
          key: 'PFD',
          titleRx: /G1000.*PFD/i,
          x: 50,
          y: 100,
          width: 600,
          height: 400
        },
        {
          key: 'MFD',
          titleRx: /G1000.*MFD/i,
          x: 700,
          y: 100,
          width: 600,
          height: 400
        }
      ]}
    />
  );
}

/**
 * Example: Individual PopoutCapture components
 */
export function IndividualPopoutsExample() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* PFD Region */}
      <PopoutCapture
        keyId="PFD"
        titleRxDefault={/G1000.*PFD/i}
        width={600}
        height={400}
        x={50}
        y={100}
        onCapture={(binding) => {
          console.log('PFD captured:', binding);
          // Optional: Move window offscreen
          window.winMove.moveOffscreen(binding.preferExact || '', 10000, 0, 600, 400);
        }}
        onRelease={() => {
          console.log('PFD released');
        }}
      />

      {/* MFD Region */}
      <PopoutCapture
        keyId="MFD"
        titleRxDefault={/G1000.*MFD/i}
        width={600}
        height={400}
        x={700}
        y={100}
        onCapture={(binding) => {
          console.log('MFD captured:', binding);
          window.winMove.moveOffscreen(binding.preferExact || '', 10000, 0, 600, 400);
        }}
        onRelease={() => {
          console.log('MFD released');
        }}
      />

      {/* COM Radio */}
      <PopoutCapture
        keyId="COM1"
        titleRxDefault={/COM.*Radio/i}
        width={300}
        height={200}
        x={1350}
        y={100}
      />
    </div>
  );
}

/**
 * Example: SVG overlay positioning
 * Positions popouts inside specific SVG regions
 */
export function SVGPopoutsExample() {
  return (
    <div style={{ position: 'relative' }}>
      {/* Assume SVG is loaded as background */}
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        {/* Your cockpit SVG content */}
        <rect x={50} y={100} width={600} height={400} fill="transparent" stroke="red" />
        <rect x={700} y={100} width={600} height={400} fill="transparent" stroke="red" />
      </svg>

      {/* Overlay popout captures on top of SVG regions */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        <PopoutCapture
          keyId="PFD"
          titleRxDefault={/G1000.*PFD/i}
          width={600}
          height={400}
          x={50}
          y={100}
        />

        <PopoutCapture
          keyId="MFD"
          titleRxDefault={/G1000.*MFD/i}
          width={600}
          height={400}
          x={700}
          y={100}
        />
      </div>
    </div>
  );
}

/**
 * Example: Custom title patterns for different aircraft
 */
export function CustomPatternsExample() {
  const [selectedAircraft, setSelectedAircraft] = React.useState<'g1000' | 'g3000' | 'fmc'>('g1000');

  const patterns = {
    g1000: {
      pfd: /G1000.*PFD/i,
      mfd: /G1000.*MFD/i
    },
    g3000: {
      pfd: /G3000.*PFD/i,
      mfd: /G3000.*MFD/i
    },
    fmc: {
      pfd: /FMC|CDU/i,
      mfd: /EICAS|ND/i
    }
  };

  return (
    <div>
      {/* Aircraft selector */}
      <div style={{ padding: 20 }}>
        <label>
          Select Aircraft:
          <select
            value={selectedAircraft}
            onChange={e => setSelectedAircraft(e.target.value as any)}
          >
            <option value="g1000">G1000 (C172, Baron, etc.)</option>
            <option value="g3000">G3000 (TBM 930, SR22, etc.)</option>
            <option value="fmc">Airliner FMC/EICAS</option>
          </select>
        </label>
      </div>

      {/* Popout regions with dynamic patterns */}
      <PopoutManager
        autoAttachEnabled={true}
        regions={[
          {
            key: 'PFD',
            titleRx: patterns[selectedAircraft].pfd,
            x: 50,
            y: 100,
            width: 600,
            height: 400
          },
          {
            key: 'MFD',
            titleRx: patterns[selectedAircraft].mfd,
            x: 700,
            y: 100,
            width: 600,
            height: 400
          }
        ]}
      />
    </div>
  );
}
