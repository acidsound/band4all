/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * DS208: Avoid top-level this
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
document.addEventListener("DOMContentLoaded", function () {
  let userId = UUID.generate();
  console.log("init", userId);
  const context = new AudioContext();

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

  /* webRTC datachannel stuff */
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
        const [prg, key, vel, senderId] = msg.slice(1).split("/");
        if (senderId !== userId) {
          const programMap = {
            "drum": ()=> playDrum(vel, key, false),
            "piano": ()=> playKey(vel, key, false),
            "none": ()=> {}
          };
          (programMap[prg] || programMap["none"])();
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
        peer.send(`@drum/${key}/${vel}/${userId}`);
      }
    });
  };

  playDrum = function (vel, key, isLocal = true) {
    let elem = document.querySelector(`[data-note='${key}']`);
    if (!elem) return;
    if (vel > 0) {
      elem.classList.add("active");
      const drumMap = {
        60: ()=>playKick(context, vel, {}),
        62: ()=>playClap(context, vel, {}),
        64: ()=>playSnare(context, vel, {}),
        66: ()=>playHat(context, vel, {}),
        0: ()=>{},
      };
      (drumMap[key] || drumMap[0])();
    } else {
      elem.classList.remove("active");
    }
    if (isLocal) {
      broadCast({ destination: room, vel, key });
    }
  };

  playKey = function (vel, key, isLocal = true) {
    let elem = document.querySelector(`[data-note='${key}']`);
    if (!elem) return;
    if (vel > 0) {
      elem.classList.add("active");
      playNote(context, vel, midi2Freq(+key));
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
              playDrum(val / 127.0, key);
            }
          })
      )
    );
  for (let downEvent of ["keydown"]) {
    //, 'mousedown', 'touchstart']
    window.addEventListener(downEvent, function (e) {
      const key = keyMap[e.which] || e.target.getAttribute("data-note");
      playDrum(1, key);
    });
  }
  ["keyup"].map((
    upEvent //, 'mouseup', 'touchend']
  ) =>
    window.addEventListener(upEvent, function (e) {
      const key = keyMap[e.which] || e.target.getAttribute("data-note");
      playDrum(0, key);
    })
  );
});
