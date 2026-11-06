// Records microphone audio as 16 kHz mono 16-bit WAV (a format Prisma accepts).
export async function startWavRecording(maxSeconds = 28) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  proc.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  src.connect(proc); proc.connect(ctx.destination);
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stop = async (): Promise<string> => {
    if (stopped) return "";
    stopped = true; clearTimeout(timer);
    proc.disconnect(); src.disconnect(); stream.getTracks().forEach((t) => t.stop());
    const rate = ctx.sampleRate; await ctx.close();
    return encodeWavBase64(chunks, rate, 16000);
  };
  const autoStop = new Promise<string>((resolve) => { timer = setTimeout(() => resolve(stop()), maxSeconds * 1000); });
  return { stop, autoStop };
}

function encodeWavBase64(chunks: Float32Array[], inRate: number, outRate: number) {
  const len = chunks.reduce((a, c) => a + c.length, 0);
  const all = new Float32Array(len); let o = 0;
  for (const c of chunks) { all.set(c, o); o += c.length; }
  const ratio = inRate / outRate; const n = Math.floor(len / ratio);
  const buf = new ArrayBuffer(44 + n * 2); const v = new DataView(buf);
  const w = (p: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(p + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, outRate, true); v.setUint32(28, outRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) { const s = Math.max(-1, Math.min(1, all[Math.floor(i * ratio)] ?? 0)); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
  const bytes = new Uint8Array(buf); let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
