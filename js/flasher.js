// Rubberless-Ducky WebFlasher
// Minimal Atmel AVR32 DFU flasher over WebUSB.
// Protocol reference: dfu-programmer (src/atmel.c). Targets AT32UC3B parts.
// WebUSB access requires no other driver has claimed the DFU device
// (WinUSB via Zadig on Windows, udev rule for VID 03EB on Linux).

const $ = id => document.getElementById(id);

// ---- Console log ----
const pad2 = n => String(n).padStart(2, '0');
function tsNow() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function log(msg, cls) {
  const el = $('console');
  const line = document.createElement('div');
  const t = document.createElement('span'); t.className = 'ts'; t.textContent = `[${tsNow()}] `;
  const b = document.createElement('span'); if (cls) b.className = cls; b.textContent = msg;
  line.appendChild(t); line.appendChild(b);
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}
function bar(pct, label) {
  $('bar').style.width = Math.max(0, Math.min(100, pct)) + '%';
  if (label !== undefined) $('barLabel').textContent = label;
}

// ---- Step accordion / state ----
const stepOrder = ['s1', 's2', 's3'];
function setStepState(id, state) {
  const el = document.getElementById(id);
  el.classList.remove('active', 'done', 'error');
  if (state) el.classList.add(state);
}
function openStep(id) {
  stepOrder.forEach(s => document.getElementById(s).classList.remove('open'));
  document.getElementById(id).classList.add('open');
}
document.querySelectorAll('.step-header').forEach(h => {
  h.addEventListener('click', e => {
    const step = h.parentElement;
    step.classList.toggle('open');
  });
});

// Toggle console visibility
$('btnConsole').addEventListener('click', () => {
  $('console').classList.toggle('hidden');
});

// ---- Atmel AVR32 DFU protocol ----
const VID = 0x03EB;
const DFU_PIDS = [0x2FF6, 0x2FF7, 0x2FF8, 0x2FF1, 0x2FFA, 0x2FFB];
const DFU_DNLOAD    = 0x01;
const DFU_GETSTATUS = 0x03;
const DFU_CLRSTATUS = 0x04;

let device = null;
let iface  = 0;
let hexBytes = null;
let hexBase  = null;

function parseHex(text) {
  const lines = text.split(/\r?\n/);
  let ext = 0, seg = 0;
  const map = new Map();
  for (const raw of lines) {
    if (!raw || raw[0] !== ':') continue;
    const len = parseInt(raw.substr(1, 2), 16);
    const addr = parseInt(raw.substr(3, 4), 16);
    const type = parseInt(raw.substr(7, 2), 16);
    const data = [];
    for (let i = 0; i < len; i++) data.push(parseInt(raw.substr(9 + i*2, 2), 16));
    if (type === 0x00) {
      const base = (ext << 16) + seg;
      for (let i = 0; i < len; i++) map.set(base + addr + i, data[i]);
    } else if (type === 0x04) {
      ext = (data[0] << 8) | data[1];
    } else if (type === 0x02) {
      seg = ((data[0] << 8) | data[1]) << 4;
    } else if (type === 0x01) {
      break;
    }
  }
  if (map.size === 0) throw new Error("hex file contains no data");
  const addrs = [...map.keys()].sort((a,b)=>a-b);
  const base = addrs[0];
  const end  = addrs[addrs.length - 1];
  const bytes = new Uint8Array(end - base + 1).fill(0xFF);
  for (const [a, b] of map) bytes[a - base] = b;
  return { base, bytes };
}

async function ctrl(setup, data) {
  const req = { requestType: 'class', recipient: 'interface',
                request: setup.bRequest, value: setup.wValue, index: iface };
  if (data) return device.controlTransferOut(req, data);
  return device.controlTransferIn(req, setup.wLength);
}
async function dfuStatus() {
  const r = await ctrl({ bRequest: DFU_GETSTATUS, wValue: 0, wLength: 6 });
  const v = new Uint8Array(r.data.buffer);
  return { status: v[0], pollTimeout: v[1] | (v[2] << 8) | (v[3] << 16), state: v[4] };
}
async function dfuClrStatus() { await ctrl({ bRequest: DFU_CLRSTATUS, wValue: 0 }, new Uint8Array()); }
async function waitIdle() {
  for (let i = 0; i < 100; i++) {
    const s = await dfuStatus();
    if (s.status !== 0) throw new Error("DFU error status " + s.status);
    if (s.state === 2 || s.state === 5) return s;
    await new Promise(r => setTimeout(r, Math.max(5, s.pollTimeout)));
  }
  throw new Error("DFU did not reach idle state");
}
async function atmelWrite(bytes) {
  await ctrl({ bRequest: DFU_DNLOAD, wValue: 0 }, bytes);
  await waitIdle();
}
async function chipErase() {
  log("erase: whole chip");
  await atmelWrite(new Uint8Array([0x04, 0x00, 0xFF]));
  log("erase: done", "ok");
}
async function selectRegion(region) { await atmelWrite(new Uint8Array([0x06, 0x03, region])); }
async function setBasePage(page16k) {
  await atmelWrite(new Uint8Array([0x06, 0x03, (page16k >> 8) & 0xFF, page16k & 0xFF]));
}
async function programBlock(startOffset, payload) {
  const end = startOffset + payload.length - 1;
  const header = new Uint8Array([0x01, 0x00,
    (startOffset >> 8) & 0xFF, startOffset & 0xFF,
    (end >> 8) & 0xFF,          end & 0xFF ]);
  const buf = new Uint8Array(header.length + payload.length);
  buf.set(header, 0); buf.set(payload, header.length);
  await atmelWrite(buf);
}
async function programAll(bytes, base) {
  await selectRegion(0x00);
  const PAGE = 512;
  const total = bytes.length;
  let done = 0;
  const flashBase = base - 0x80000000;
  let curPage16k = -1;
  bar(0, 'programming');
  for (let off = 0; off < total; off += PAGE) {
    const abs = flashBase + off;
    const page16k = abs >> 16;
    if (page16k !== curPage16k) { await setBasePage(page16k); curPage16k = page16k; }
    const chunk = bytes.subarray(off, Math.min(off + PAGE, total));
    const inPage = abs & 0xFFFF;
    await programBlock(inPage, chunk);
    done += chunk.length;
    bar(100 * done / total);
    if ((off / PAGE) % 8 === 0) log(`program: ${done}/${total} bytes`);
  }
  log(`program: ${total} bytes done`, "ok");
}
async function launchDevice() {
  await ctrl({ bRequest: DFU_DNLOAD, wValue: 0 }, new Uint8Array());
  log("launch: reset sent", "ok");
}
async function loadBundled() {
  const r = await fetch('./firmware.hex');
  if (!r.ok) throw new Error("HTTP " + r.status);
  const text = await r.text();
  const parsed = parseHex(text);
  hexBytes = parsed.bytes; hexBase = parsed.base;
  log(`firmware: bundled, ${hexBytes.length} bytes at 0x${hexBase.toString(16)}`, "ok");
}

// ---- UI ----
openStep('s1');
setStepState('s1', 'active');

$('btnConfirmPlug').onclick = () => {
  setStepState('s1', 'done');
  setStepState('s2', 'active');
  openStep('s2');
};

$('btnConnect').onclick = async () => {
  try {
    setStepState('s2', 'active');
    device = await navigator.usb.requestDevice({
      filters: DFU_PIDS.map(p => ({ vendorId: VID, productId: p }))
    });
    await device.open();
    if (device.configuration === null) await device.selectConfiguration(1);
    for (const c of device.configurations) {
      for (const i of c.interfaces) {
        for (const a of i.alternates) {
          if (a.interfaceClass === 0xFE && a.interfaceSubclass === 0x01) { iface = i.interfaceNumber; }
        }
      }
    }
    await device.claimInterface(iface);
    log(`connect: VID 0x${device.vendorId.toString(16)} PID 0x${device.productId.toString(16)}`, "ok");
    try { const s = await dfuStatus(); if (s.status !== 0) await dfuClrStatus(); } catch(e){}
    setStepState('s2', 'done');
    setStepState('s3', 'active');
    openStep('s3');
    $('btnFlash').disabled = false;
    $('btnConnect').disabled = true;
    if (!hexBytes) { try { await loadBundled(); } catch(e){ log("bundled firmware: " + e.message, "err"); } }
  } catch (e) {
    log("connect: " + e.message, "err");
    setStepState('s2', 'error');
  }
};

$('fileHex').onchange = async ev => {
  const f = ev.target.files[0]; if (!f) return;
  const text = await f.text();
  try {
    const parsed = parseHex(text);
    hexBytes = parsed.bytes; hexBase = parsed.base;
    log(`firmware: ${f.name}, ${hexBytes.length} bytes at 0x${hexBase.toString(16)}`, "ok");
  } catch (e) { log("parse: " + e.message, "err"); }
};

$('btnFlash').onclick = async () => {
  if (!device) { log("flash: connect first", "err"); return; }
  if (!hexBytes) { try { await loadBundled(); } catch(e){ log("bundled firmware: " + e.message, "err"); return; } }
  try {
    $('btnFlash').disabled = true;
    setStepState('s3', 'active');
    await chipErase();
    await programAll(hexBytes, hexBase);
    await launchDevice();
    setStepState('s3', 'done');
    bar(100, 'done');
    log("done. device will re-enumerate as HID keyboard.", "ok");
  } catch (e) {
    log("flash: " + e.message, "err");
    setStepState('s3', 'error');
    $('btnFlash').disabled = false;
  }
};

if (!('usb' in navigator)) {
  log("no WebUSB in this browser. use Chrome/Edge, or the manual dfu-programmer path.", "err");
  $('btnConnect').disabled = true;
  setStepState('s2', 'error');
}
