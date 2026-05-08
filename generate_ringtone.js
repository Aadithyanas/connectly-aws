// This script generates a ringtone WAV file using Node.js
// It creates a standard phone ring tone (dual-tone multi-frequency)

const fs = require('fs');

function generateRingtone() {
  const sampleRate = 44100;
  const duration = 3; // 3 seconds total
  const totalSamples = sampleRate * duration;
  
  // Ring pattern: 0.8s ring, 0.4s silence, 0.8s ring, 1s silence
  const ringSegments = [
    { start: 0, end: 0.8, freq1: 440, freq2: 480 },     // Ring 1
    { start: 0.8, end: 1.2, freq1: 0, freq2: 0 },        // Silence
    { start: 1.2, end: 2.0, freq1: 440, freq2: 480 },     // Ring 2  
    { start: 2.0, end: 3.0, freq1: 0, freq2: 0 },         // Silence
  ];

  const buffer = Buffer.alloc(totalSamples * 2); // 16-bit = 2 bytes per sample

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    for (const seg of ringSegments) {
      if (t >= seg.start && t < seg.end && seg.freq1 > 0) {
        // Dual tone
        const tone1 = Math.sin(2 * Math.PI * seg.freq1 * t);
        const tone2 = Math.sin(2 * Math.PI * seg.freq2 * t);
        
        // Smooth fade in/out at segment boundaries
        const segDuration = seg.end - seg.start;
        const segPos = t - seg.start;
        const fadeIn = Math.min(segPos / 0.02, 1); // 20ms fade in
        const fadeOut = Math.min((segDuration - segPos) / 0.02, 1); // 20ms fade out
        const envelope = fadeIn * fadeOut;
        
        sample = (tone1 + tone2) * 0.3 * envelope; // 0.3 = volume
      }
    }

    const intSample = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    buffer.writeInt16LE(intSample, i * 2);
  }

  // WAV header
  const header = Buffer.alloc(44);
  const dataSize = buffer.length;
  const fileSize = dataSize + 36;

  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);      // PCM format chunk size
  header.writeUInt16LE(1, 20);       // PCM format
  header.writeUInt16LE(1, 22);       // Mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // Byte rate
  header.writeUInt16LE(2, 32);       // Block align
  header.writeUInt16LE(16, 34);      // Bits per sample
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  const wav = Buffer.concat([header, buffer]);
  fs.writeFileSync('./public/ringtone.wav', wav);
  console.log('✅ Generated ringtone.wav (' + wav.length + ' bytes)');
}

generateRingtone();
