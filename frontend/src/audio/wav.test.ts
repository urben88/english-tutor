import { encodeWav, resample } from "./wav";

const ascii = (v: DataView, off: number, n: number) =>
  Array.from({ length: n }, (_, i) => String.fromCharCode(v.getUint8(off + i))).join("");

describe("encodeWav", () => {
  it("writes a 16 kHz mono 16-bit RIFF header and the right data length", () => {
    const input = new Float32Array(48000).fill(0.5); // 1 s at 48 kHz
    const buf = encodeWav(input, 48000);
    const v = new DataView(buf);
    expect(ascii(v, 0, 4)).toBe("RIFF");
    expect(ascii(v, 8, 4)).toBe("WAVE");
    expect(ascii(v, 12, 4)).toBe("fmt ");
    expect(v.getUint16(20, true)).toBe(1); // PCM
    expect(v.getUint16(22, true)).toBe(1); // mono
    expect(v.getUint32(24, true)).toBe(16000);
    expect(v.getUint16(34, true)).toBe(16);
    expect(ascii(v, 36, 4)).toBe("data");
    const dataLen = v.getUint32(40, true);
    expect(dataLen).toBe(16000 * 2); // 1 s resampled to 16 kHz, 2 bytes/sample
    expect(buf.byteLength).toBe(44 + dataLen);
    expect(v.getUint32(4, true)).toBe(36 + dataLen);
  });

  it("converts float samples to signed 16-bit and clamps", () => {
    const v = new DataView(encodeWav(new Float32Array([0, 1, -1, 2]), 16000));
    expect(v.getInt16(44, true)).toBe(0);
    expect(v.getInt16(46, true)).toBe(32767);
    expect(v.getInt16(48, true)).toBe(-32768);
    expect(v.getInt16(50, true)).toBe(32767);
  });

  it("resamples by the rate ratio", () => {
    expect(resample(new Float32Array(441), 44100, 16000).length).toBe(160);
  });
});
