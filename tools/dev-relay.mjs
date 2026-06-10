#!/usr/bin/env node
/**
 * Newton Touch — DEV ONLY LAN-transfer relay.
 *
 * Lets the LCD app and the mobile app pair + deploy WHEN BOTH RUN IN A BROWSER
 * on the same machine (different ports = different origins, so they can't talk
 * directly). On real Android devices you do NOT need this — NSD + TCP handle it.
 *
 * Pure Node, no dependencies. Minimal RFC6455 WebSocket server (text frames,
 * masked client frames, extended lengths for large layout.json payloads).
 *
 *   npm run relay          # or: node tools/dev-relay.mjs   → ws://localhost:8090
 *
 * Run ONE relay per machine — both the mobile and the LCD app connect to it.
 *
 * Protocol (JSON text frames):
 *   receiver → { type:'register', id, deviceName, code }
 *   sender   → { type:'list' }                         ← relay replies { type:'devices', devices:[...] }
 *   sender   → { type:'deploy', to:<id>, payload:<string> }
 *   relay→rx → { type:'layout', payload }
 *   rx→relay → { type:'deploy_ack', from:<id> }  → relayed to senders as { type:'deploy_ack', from }
 */
import http from 'node:http';
import crypto from 'node:crypto';

const PORT = 8090;
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const clients = new Set();        // { socket, role, id, deviceName, code }

const server = http.createServer((_req, res) => { res.writeHead(200); res.end('Newton Touch dev relay'); });

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );
  const client = { socket, role: 'unknown', id: '', deviceName: '', code: '' };
  clients.add(client);

  let buf = Buffer.alloc(0);
  let frags = [];                  // continuation-frame reassembly (browsers fragment large sends)
  socket.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    let frame;
    while ((frame = decodeFrame(buf))) {
      buf = frame.rest;
      if (frame.opcode === 0x8) { socket.end(); return; }      // close
      if (frame.opcode === 0x9) { sendPong(socket, frame.payload); continue; } // ping → pong
      if (frame.opcode === 0xa) continue;                      // pong — ignore
      if (frame.opcode === 0x1 || frame.opcode === 0x2) {
        if (frame.fin) { handle(client, frame.payload.toString('utf8')); }
        else { frags = [frame.payload]; }                      // start of fragmented message
      } else if (frame.opcode === 0x0) {                       // continuation
        frags.push(frame.payload);
        if (frame.fin) { handle(client, Buffer.concat(frags).toString('utf8')); frags = []; }
      }
    }
  });
  socket.on('close', () => { clients.delete(client); if (client.role === 'receiver') broadcastDevices(); });
  socket.on('error', () => { clients.delete(client); });
});

function handle(client, text) {
  let msg; try { msg = JSON.parse(text); } catch { return; }
  switch (msg.type) {
    case 'register':
      client.role = 'receiver';
      client.id = msg.id || ('lcd-' + Math.random().toString(36).slice(2, 7));
      client.deviceName = msg.deviceName || client.id;
      client.code = msg.code || '';
      broadcastDevices();
      break;
    case 'hello':
      client.role = msg.role || 'sender';
      if (client.role === 'sender') sendJson(client.socket, devicesMsg());
      break;
    case 'list':
      sendJson(client.socket, devicesMsg());
      break;
    case 'deploy': {
      const target = [...clients].find((c) => c.role === 'receiver' && c.id === msg.to);
      if (target) sendJson(target.socket, { type: 'layout', payload: msg.payload });
      else sendJson(client.socket, { type: 'error', message: 'Display not connected to relay' });
      break;
    }
    case 'deploy_ack':
      for (const c of clients) if (c.role === 'sender') sendJson(c.socket, { type: 'deploy_ack', from: client.id });
      break;
  }
}

function devicesMsg() {
  return {
    type: 'devices',
    devices: [...clients].filter((c) => c.role === 'receiver').map((c) => ({ id: c.id, deviceName: c.deviceName, code: c.code })),
  };
}
function broadcastDevices() {
  const m = devicesMsg();
  for (const c of clients) if (c.role === 'sender') sendJson(c.socket, m);
}
function sendJson(socket, obj) { try { socket.write(encodeFrame(JSON.stringify(obj))); } catch { /* */ } }

/* ---- minimal frame codec ---- */
function decodeFrame(b) {
  if (b.length < 2) return null;
  const opcode = b[0] & 0x0f;
  const masked = (b[1] & 0x80) !== 0;
  let len = b[1] & 0x7f;
  let off = 2;
  if (len === 126) { if (b.length < 4) return null; len = b.readUInt16BE(2); off = 4; }
  else if (len === 127) { if (b.length < 10) return null; len = Number(b.readBigUInt64BE(2)); off = 10; }
  let mask;
  if (masked) { if (b.length < off + 4) return null; mask = b.slice(off, off + 4); off += 4; }
  if (b.length < off + len) return null;
  const payload = b.slice(off, off + len);
  if (masked) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
  const fin = (b[0] & 0x80) !== 0;
  return { opcode, fin, payload, rest: b.slice(off + len) };
}
function sendPong(socket, payload) {
  try {
    const n = payload.length;
    let header;
    if (n < 126) header = Buffer.from([0x8a, n]);
    else { header = Buffer.alloc(4); header[0] = 0x8a; header[1] = 126; header.writeUInt16BE(n, 2); }
    socket.write(Buffer.concat([header, payload]));
  } catch { /* */ }
}
function encodeFrame(str) {
  const payload = Buffer.from(str, 'utf8');
  const n = payload.length;
  let header;
  if (n < 126) { header = Buffer.from([0x81, n]); }
  else if (n < 65536) { header = Buffer.alloc(4); header[0] = 0x81; header[1] = 126; header.writeUInt16BE(n, 2); }
  else { header = Buffer.alloc(10); header[0] = 0x81; header[1] = 127; header.writeBigUInt64BE(BigInt(n), 2); }
  return Buffer.concat([header, payload]);
}

// Run only ONE relay per machine. If 8090 is already taken, a relay is already
// running (likely started from the other app) — reuse it instead of crashing.
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log(`A Newton Touch dev relay is already running on :${PORT} — reuse it (run only one). Nothing to do.`);
    process.exit(0);
  }
  throw e;
});

server.listen(PORT, () => console.log(`Newton Touch dev relay → ws://localhost:${PORT}  (Ctrl+C to stop)`));
