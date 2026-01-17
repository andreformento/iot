import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';

@Controller()
export class AppController {
  @Get()
  getRoot(@Res() res: Response) {
    const html = `<!doctype html>
<html lang='en'>
<head>
  <meta charset='utf-8'/>
  <meta name='viewport' content='width=device-width,initial-scale=1'/>
  <title>IoT Control Panel</title>
  <style>
    body{font-family:Arial,sans-serif;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#0b1220;color:#e6eefc}
    .card{background:#121a2b;border:1px solid #22304d;border-radius:16px;padding:22px;max-width:420px;width:92%;box-shadow:0 10px 30px rgba(0,0,0,.35)}
    h1{font-size:20px;margin:0 0 10px}
    .input-group{margin:10px 0}
    label{display:block;font-size:14px;margin-bottom:5px;opacity:0.8}
    input{width:100%;padding:10px;border-radius:8px;border:1px solid #22304d;background:#0b1220;color:#e6eefc;font-size:14px;box-sizing:border-box}
    .state{font-size:16px;margin:10px 0 18px}
    .btn{padding:12px 16px;border-radius:12px;background:#2b6cff;color:#fff;border:0;font-weight:700;cursor:pointer;margin:5px}
    .btn:active{transform:scale(.99)}
    .btn:disabled{opacity:0.5;cursor:not-allowed}
    .hint{opacity:.8;font-size:12px;margin-top:14px}
    .error{color:#ff6b6b;font-size:12px;margin-top:5px}
  </style>
</head>
<body>
  <div class='card'>
    <h1>IoT Control Panel</h1>
    <div class='input-group'>
      <label for='deviceIp'>Device IP Address</label>
      <input type='text' id='deviceIp' placeholder='192.168.0.15' value='192.168.0.15'/>
      <div id='ipError' class='error'></div>
    </div>
    <div id='state' class='state'>Status: <b>Unknown</b></div>
    <div>
      <button id='btnOn' class='btn' type='button'>Turn On</button>
      <button id='btnOff' class='btn' type='button'>Turn Off</button>
      <button id='btnToggle' class='btn' type='button'>Toggle</button>
    </div>
    <div class='hint'>Enter your IoT agent's IP address and control the LED remotely.</div>
    <script>
      const ipInput = document.getElementById('deviceIp');
      const ipError = document.getElementById('ipError');
      const stateDiv = document.getElementById('state');
      const btnOn = document.getElementById('btnOn');
      const btnOff = document.getElementById('btnOff');
      const btnToggle = document.getElementById('btnToggle');

      function validateIp(ip) {
        const pattern = /^(\\d{1,3}\\.){3}\\d{1,3}$/;
        return pattern.test(ip);
      }

      function getDeviceIp() {
        const ip = ipInput.value.trim();
        if (!validateIp(ip)) {
          ipError.textContent = 'Invalid IP address format';
          return null;
        }
        ipError.textContent = '';
        return ip;
      }

      async function refresh() {
        const ip = getDeviceIp();
        if (!ip) return;

        try {
          const r = await fetch(\`/devices/\${ip}/state\`);
          if (!r.ok) throw new Error('Failed to fetch');
          const j = await r.json();
          stateDiv.innerHTML = 'Status: <b>' + (j.on ? 'ON' : 'OFF') + '</b> (Pin: ' + j.pin + ')';
        } catch (e) {
          stateDiv.innerHTML = 'Status: <b>Error - Device unreachable</b>';
        }
      }

      async function sendCommand(action) {
        const ip = getDeviceIp();
        if (!ip) return;

        const buttons = [btnOn, btnOff, btnToggle];
        buttons.forEach(btn => btn.disabled = true);

        try {
          const r = await fetch(\`/devices/\${ip}/\${action}\`, { method: 'POST' });
          if (!r.ok) throw new Error('Failed to send command');
          await refresh();
        } catch (e) {
          stateDiv.innerHTML = 'Status: <b>Error - ' + e.message + '</b>';
        } finally {
          buttons.forEach(btn => btn.disabled = false);
        }
      }

      btnOn.addEventListener('click', () => sendCommand('on'));
      btnOff.addEventListener('click', () => sendCommand('off'));
      btnToggle.addEventListener('click', () => sendCommand('toggle'));
      ipInput.addEventListener('change', refresh);

      // Initial refresh
      refresh();
    </script>
  </div>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'iot-api',
    };
  }
}
