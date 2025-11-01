const { spawn } = require('child_process');

// First get window list
const proc = spawn('bin/Release/wgc-helper.exe', ['--list']);
let data = '';
proc.stdout.on('data', d => data += d);
proc.on('close', () => {
  const windows = JSON.parse(data);
  const msfsWin = windows.find(w => /Flight.*Simulator/i.test(w.title));

  if (!msfsWin) {
    console.log('No MSFS window found');
    return;
  }

  console.log('Testing thumbnail for:', msfsWin.title);
  console.log('HWND:', msfsWin.hwnd);

  const start = Date.now();
  const thumbProc = spawn('bin/Release/wgc-helper.exe', ['--thumb', msfsWin.hwnd.toString(), '200', '150']);
  const chunks = [];
  let stderr = '';

  thumbProc.stdout.on('data', d => chunks.push(d));
  thumbProc.stderr.on('data', d => stderr += d);

  thumbProc.on('close', code => {
    const elapsed = Date.now() - start;
    if (code === 0) {
      const png = Buffer.concat(chunks);
      console.log('✓ Success! Took', elapsed + 'ms');
      console.log('  PNG size:', png.length, 'bytes');
    } else {
      console.log('✗ Failed after', elapsed + 'ms');
      console.log('  Error:', stderr);
    }
  });
});
