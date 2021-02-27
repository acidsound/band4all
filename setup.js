userId = UUID.generate();
console.log("init", userId);
client = new Paho.MQTT.Client(
  "mqtt.sheepal.ga",
  Number(443),
  `band4all_${userId}`
);
room = new URLSearchParams(location.search).get("room") || "lobby";
sendMessage = (dstName, msg) => {
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

peers = {};

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
onMessageArrived = function (message, topic) {
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

createPeerFactory = ({ peerId, initiator }) => {
  const peer = new SimplePeer({
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478?transport=udp" },
        {
          urls: "turn:turn.sheepal.ga:3478",
          username: "band4all",
          credential: "band4all1234",
        },
      ],
    },
    initiator,
  });
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
          drum: () => playDrum(vel, key, false),
          piano: () => playKey(vel, key, false),
          none: () => {},
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
