/* inspired by @ggyshay/web-808 */
const playKick = function (context, vel = 1.0, { tone = 167.1, decay = 0.5 }) {
    const c = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.connect(gain);
    gain.connect(context.destination);

    osc.frequency.setValueAtTime(tone, c + 0.001);
    gain.gain.linearRampToValueAtTime(vel, c + 0.1)

    osc.frequency.exponentialRampToValueAtTime(1, c + decay);
    gain.gain.exponentialRampToValueAtTime(0.01 * vel, c + decay);
    gain.gain.linearRampToValueAtTime(0, c + decay + 0.1)

    osc.start(c);

    osc.stop(c + decay + 0.1);
};

const playHat = function (context, vel = 1.0, { tone = 130.81, decay = 0.5 }) {
    const c = context.currentTime;
    oscEnvelope = context.createGain();
    bndPass = context.createBiquadFilter();
    bndPass.type = 'bandpass';
    bndPass.frequency.value = 20000;
    bndPass.Q.value = 0.2;
    hipass = context.createBiquadFilter();
    hipass.type = "highpass";
    hipass.frequency.value = 5000;

    bndPass.connect(hipass);
    hipass.connect(oscEnvelope);
    oscEnvelope.connect(context.destination);
    const ratios = [1, 1.3420, 1.2312, 1.6532, 1.9523, 2.1523];
    ratios.forEach((ratio) => {
        var osc = context.createOscillator();
        osc.type = "square";
        osc.frequency.value = tone * ratio;
        osc.connect(bndPass);
        osc.start(c);
        osc.stop(c + decay);
    });
    oscEnvelope.gain.setValueAtTime(0.00001 * vel, c);
    oscEnvelope.gain.exponentialRampToValueAtTime(1 * vel, c + 0.067 * decay);
    oscEnvelope.gain.exponentialRampToValueAtTime(0.3 * vel, c + 0.1 * decay);
    oscEnvelope.gain.exponentialRampToValueAtTime(0.00001 * vel, c + decay);
};

const noiseBuffer = (context) => {
    bufferSize = context.sampleRate;
    buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    return buffer;
}

const playClap = function (context, vel = 1.0, { tone = 430, decay = 0.2, pulseWidth = 0.0125 }) {
    const c = context.currentTime;
    noise = context.createBufferSource();
    noise.buffer = noiseBuffer(context);
    filter = context.createBiquadFilter();
    filter.type = 'bandpass';
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

    noise.start(c)
    noise.stop(c + decay);
}

const playSnare = function (context, vel = 1.0, { tone = 180, decay = 0.2 }) {
    const c = context.currentTime;

    noise = context.createBufferSource();
    noise.buffer = noiseBuffer(context);

    var noiseFilter = context.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    noise.connect(noiseFilter);

    noiseEnvelope = context.createGain();
    noiseFilter.connect(noiseEnvelope);

    noiseEnvelope.connect(context.destination);

    osc = context.createOscillator();
    osc.type = 'triangle';

    oscEnvelope = context.createGain();
    osc.connect(oscEnvelope);
    oscEnvelope.connect(context.destination);
    noiseEnvelope.gain.setValueAtTime(vel, c);
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, c + decay);
    noise.start(c)

    osc.frequency.setValueAtTime(tone, c);
    oscEnvelope.gain.setValueAtTime(0.7 * vel, c);
    oscEnvelope.gain.exponentialRampToValueAtTime(0.01 * vel, c + decay / 2);
    osc.start(c)

    osc.stop(c + decay);
    noise.stop(c + decay);
}