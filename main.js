/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
this.keyMap = {
  90: 60,
  83: 61,
  88: 62,
  68: 63,
  67: 64,
  86: 65,
  71: 66,
  66: 67,
  72: 68,
  78: 69,
  74: 70,
  77: 71,
  188: 72,
  76: 73,
  190: 74,
  186: 75,
  191: 76,
  81: 72,
  50: 73,
  87: 74,
  51: 75,
  69: 76,
  82: 77,
  53: 78,
  84: 79,
  54: 80,
  89: 81,
  55: 82,
  85: 83,
  73: 84,
  57: 85,
  79: 86,
  48: 87,
  80: 88,
  219: 89,
  187: 90,
  221: 91,
};
document.addEventListener("DOMContentLoaded", function () {
  let userId = localStorage.getItem("userId");
  if (!userId?.length) {
    userId = UUID.generate();
    localStorage.setItem("userId", userId);
  }
  console.log("init", userId);
  const context = new AudioContext();

  const midi2Freq = (midi) => Math.pow(2, (midi - 69) / 12) * 440;
  const playNote = function (vel, freq) {
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

  // network stuff
  let peers = {};
  let room = new URLSearchParams(location.search).get("room") || "lobby";
  const sendMessage = (dstName, msg) => {
    console.log(dstName);
    const message = Object.assign(
      new Paho.MQTT.Message(
        JSON.stringify({
          id: userId,
          ...msg,
        })
      ),
      {
        destinationName: dstName,
      }
    );
    client.send(message);
  };
  const onConnect = function () {
    client.subscribe(`${room}/join`);
    client.subscribe(`${room}/leave`);
    client.subscribe(`${room}/signal/${userId}`);
    sendMessage(`${room}/join`);
  };
  const onConnectionLost = function (responseObject) {
    if (responseObject.errorCode !== 0) {
      console.log("onConnectionLost:", responseObject.errorMessage);
    }
  };
  const createPeerFactory = ({ peerId, initiator }) => {
    const peer = new SimplePeer({ initiator });
    peer.on("signal", (signal) => {
      console.log("peer:onSignal", signal);
      sendMessage(`${room}/signal/${peerId}`, { signal });
    });
    peer.on("connect", () => {
      console.log("peer:establish datachannel");
    });
    peer.on("data", (data) => {
      const msg = data.toString();
      if (msg[0] === "@") {
        const [key, vel, senderId] = msg.slice(1).split("/");
        if (senderId !== userId) {
          playKey(vel, key, false);
        }
      }
    });
    peer.on("close", () => {
      console.log("peer:close peer. peerId:", peerId);
    });
    peer.on("error", (err) => {
      console.log("peer:err:", err);
    });
    return (peers[peerId] = peer);
  };
  const onMessageArrived = function (message, topic) {
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message.payloadString);
    } catch (e) {
      return;
    }
    if (parsedMessage.id === userId) {
      return;
    }
    console.log("onMessageArrived", parsedMessage);
    ({
      [`${room}/join`]: ({ id }) =>
        createPeerFactory({ peerId: id, initiator: true }),
      [`${room}/leave`]: ({ id }) => peers[id]?.destroy() || delete peers[id],
      [`${room}/signal/${userId}`]: ({ id, signal }) =>
        (
          peers[id] || createPeerFactory({ peerId: id, initiator: false })
        ).signal(signal),
    }[message.destinationName](parsedMessage));
  };

  var client = new Paho.MQTT.Client(
    "mqtt.sheepal.ga",
    Number(443),
    `band4all_${userId}`
  );
  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;

  const willMessage = Object.assign(
    new Paho.MQTT.Message(JSON.stringify({ id: userId })),
    {
      destinationName: `${room}/leave`,
      qos: 0,
      retained: false,
    }
  );

  client.connect({ onSuccess: onConnect, useSSL: true, willMessage });

  const broadCast = function ({ destination, vel, key }) {
    Object.values(peers).forEach((peer) => {
      if (peer.connected) {
        peer.send(`@${key}/${vel}/${userId}`);
      }
    });
  };

  playKey = function (vel, key, isLocal = true) {
    let elem = document.querySelector(`[data-note='${key}']`);
    if (!elem) return;
    if (vel > 0) {
      elem.classList.add("active");
      playNote(vel, midi2Freq(+key));
    } else {
      elem.classList.remove("active");
    }
    if (isLocal) {
      broadCast({ destination: room, vel, key });
    }
  };

  navigator.requestMIDIAccess &&
    navigator.requestMIDIAccess().then((ma) =>
      Array.from(ma.inputs).forEach(
        (input) =>
          (input[1].onmidimessage = function ({ data }) {
            const [msg, key, val] = data;
            if (msg === 144) {
              playKey(val / 127.0, key);
            }
          })
      )
    );
  for (let downEvent of ["keydown"]) {
    //, 'mousedown', 'touchstart']
    window.addEventListener(downEvent, function (e) {
      const key = keyMap[e.which] || e.target.getAttribute("data-note");
      playKey(1, key);
    });
  }
  ["keyup"].map((
    upEvent //, 'mouseup', 'touchend']
  ) =>
    window.addEventListener(upEvent, function (e) {
      const key = keyMap[e.which] || e.target.getAttribute("data-note");
      playKey(0, key);
    })
  );
});
