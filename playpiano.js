const midi2Freq = (midi) => Math.pow(2, (midi - 69) / 12) * 440;
const playPiano = function (context, vel, freq) {
  const c = context.currentTime;

  const osc = context.createOscillator();
  osc.type = "square";
  osc.frequency.value = freq;
  const gain = context.createGain();

  osc.connect(gain);

  gain.connect(context.destination);

  osc.start(c);
  gain.gain.setValueAtTime(0, c);
  gain.gain.linearRampToValueAtTime(vel, c + 0.01);
  gain.gain.linearRampToValueAtTime(vel * 0.3, c + 0.2);
  gain.gain.linearRampToValueAtTime(0, c + 0.4);
  osc.stop(context.currentTime + 1);
};

playKey = function (vel, key, isLocal = true) {
  let elem = document.querySelector(`[data-note='${key}']`);
  if (vel > 0) {
    elem && elem.classList.add("active");
    playPiano(context, vel, midi2Freq(+key));
  } else {
    elem && elem.classList.remove("active");
  }
  if (isLocal) {
    broadCast({ destination: room, vel, key });
  }
};
