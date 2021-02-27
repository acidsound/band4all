/* inspired by @ggyshay/web-808 */
const playKick = function (context, vel = 1.0, { tone = 167.1, decay = 0.5 }) {
  const c = context.currentTime;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.connect(gain);
  gain.connect(context.destination);

  osc.frequency.setValueAtTime(tone, c + 0.001);
  gain.gain.linearRampToValueAtTime(vel, c + 0.1);

  osc.frequency.exponentialRampToValueAtTime(1, c + decay);
  gain.gain.exponentialRampToValueAtTime(0.01 * vel, c + decay);
  gain.gain.linearRampToValueAtTime(0, c + decay + 0.1);

  osc.start(c);

  osc.stop(c + decay + 0.1);
};

/* http://joesul.li/van/synthesizing-hi-hats/ */
const playHat = function (
  context,
  vel = 1.0,
  { bp = 10000, hp = 7000, decay = 0.3 }
) {
  const c = context.currentTime;
  fundamental = 40;
  var ratios = [2, 3, 4.16, 5.43, 6.79, 8.21];

  // Always useful
  var when = context.currentTime;

  var gain = context.createGain();

  // Bandpass
  var bandpass = context.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = bp;

  // Highpass
  var highpass = context.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = hp;

  // Connect the graph
  bandpass.connect(highpass);
  highpass.connect(gain);
  gain.connect(context.destination);

  // Create the oscillators
  ratios.forEach(function (ratio) {
    var osc = context.createOscillator();
    osc.type = "square";
    // Frequency is the fundamental * this oscillator's ratio
    osc.frequency.value = fundamental * ratio;
    osc.connect(bandpass);
    osc.start(when);
    osc.stop(when + 0.3);
  });

  // Define the volume envelope
  gain.gain.setValueAtTime(0.00001 * vel, when);
  gain.gain.exponentialRampToValueAtTime(1 * vel, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.3 * vel, when + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.00001 * vel, when + decay);
};

const noiseBuffer = (context) => {
  bufferSize = context.sampleRate;
  buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  output = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

const playClap = function (
  context,
  vel = 1.0,
  { tone = 430, decay = 0.2, pulseWidth = 0.0125 }
) {
  const c = context.currentTime;
  noise = context.createBufferSource();
  noise.buffer = noiseBuffer(context);
  filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = tone * 2;
  envelope = context.createGain();

  noise.connect(filter);
  filter.connect(envelope);

  envelope.connect(context.destination);

  envelope.gain.setValueAtTime(vel, c);
  envelope.gain.exponentialRampToValueAtTime(0.1, c + pulseWidth);

  envelope.gain.setValueAtTime(vel, c + pulseWidth);
  envelope.gain.exponentialRampToValueAtTime(0.1, c + 2 * pulseWidth);

  envelope.gain.setValueAtTime(vel, c + 2 * pulseWidth);
  envelope.gain.exponentialRampToValueAtTime(0.001, c + decay);

  noise.start(c);
  noise.stop(c + decay);
};

const playSnare = function (context, vel = 1.0, { tone = 180, decay = 0.2 }) {
  const c = context.currentTime;

  noise = context.createBufferSource();
  noise.buffer = noiseBuffer(context);

  var noiseFilter = context.createBiquadFilter();
  noiseFilter.type = "highpass";
  noiseFilter.frequency.value = 1000;
  noise.connect(noiseFilter);

  noiseEnvelope = context.createGain();
  noiseFilter.connect(noiseEnvelope);

  noiseEnvelope.connect(context.destination);

  osc = context.createOscillator();
  osc.type = "triangle";

  oscEnvelope = context.createGain();
  osc.connect(oscEnvelope);
  oscEnvelope.connect(context.destination);
  noiseEnvelope.gain.setValueAtTime(vel, c);
  noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, c + decay);
  noise.start(c);

  osc.frequency.setValueAtTime(tone, c);
  oscEnvelope.gain.setValueAtTime(0.7 * vel, c);
  oscEnvelope.gain.exponentialRampToValueAtTime(0.01 * vel, c + decay / 2);
  osc.start(c);

  osc.stop(c + decay);
  noise.stop(c + decay);
};

playDrum = function (vel, key, isLocal = true) {
  let elem = document.querySelector(`[data-note='${key}']`);
  if (!elem) return;
  if (vel > 0) {
    elem.classList.add("active");
    const drumMap = {
      60: () => playKick(context, vel, {}),
      62: () => playClap(context, vel, {}),
      64: () => playSnare(context, vel, {}),
      66: () => playHat(context, vel, {}),
      0: () => {},
    };
    (drumMap[key] || drumMap[0])();
  } else {
    elem.classList.remove("active");
  }
  if (isLocal) {
    broadCast({ destination: room, vel, key });
  }
};