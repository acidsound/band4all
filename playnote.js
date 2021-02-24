const midi2Freq = (midi) => Math.pow(2, (midi - 69) / 12) * 440;
const playNote = function (context, vel, freq) {
    const c = context.currentTime;

    const osc1 = context.createOscillator();
    osc1.type = "triangle";
    osc1.frequency.value = freq;
    osc1.start(0);

    const osc2 = context.createOscillator();
    osc2.start(0);
    osc2.type = "square";
    osc2.frequency.value = 3;

    const gain = context.createGain();

    osc1.connect(gain);
    osc2.connect(osc1.frequency);

    const comp = context.createDynamicsCompressor();
    comp.threshold.value = -50;
    comp.knee.value = 40;
    comp.ratio.value = 12;
    comp.reduction.value = -20;
    comp.attack.value = 0;
    comp.release.value = 0.25;

    gain.connect(comp);
    const delay = context.createDelay(1);
    delay.delayTime.value = 0.4;
    //    comp.connect delay
    //    gain.connect delay

    const panner = context.createStereoPanner();
    panner.pan.setValueAtTime(-1, c);
    panner.pan.linearRampToValueAtTime(1, c + 0.5);
    panner.pan.linearRampToValueAtTime(-1, c + 1);
    //     panner.pan.linearRampToValueAtTime 1, c + 0.75
    //     panner.pan.linearRampToValueAtTime -1, c + 1

    delay.connect(panner);
    panner.connect(context.destination);
    gain.connect(context.destination);

    gain.gain.setValueAtTime(0, c);
    gain.gain.linearRampToValueAtTime(vel, c + 0.02);
    gain.gain.linearRampToValueAtTime(0, c + 0.5);
    osc1.stop(context.currentTime + 1);
    osc2.stop(context.currentTime + 1);
};
