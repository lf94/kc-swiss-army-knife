// Derived from KCMA https://github.com/KittyCAD/modeling-app
const { WebSocket } = require("ws");
const { randomUUID: uuidv4 } = require('node:crypto');
const NodeDataChannelModule = import("node-datachannel");

NodeDataChannelModule.then((NodeDataChannel) => {
  NodeDataChannel.initLogger("Debug");

  const te = new TextEncoder();
  const send = (payload) => ws.send(JSON.stringify(payload));

  const commands = [ "make_axes_gizmo", "make_plane", ];
  for (const command of commands) {
    global[command] = (args) => {
      const payload = {
        cmd: {
          type: command,
          ...args
        },
        cmd_id: uuidv4(),
        type: "modeling_cmd_req"
      };
      send(payload);
    };
  };

  const toNodeDataChannelIceServers = (iceServers) => {
    const iceServer = iceServers[0];
    const username = iceServer.username;
    const password = iceServer.credential;
    return iceServer.urls.map((url_) => {
      // Create a fake URL to make URL class happy.
      const url = new URL("http://" + url_.slice(5));
      return {
        hostname: url.hostname,
        port: parseInt(url.port),
        username,
        password,
        relayType: "turnUdp",
      }
    });
  };

  let handlers = {};

  let pc;
  let dc;
  handlers["ice_server_info"] = (args) => {
    console.log(args);
    pc = new NodeDataChannel.PeerConnection("Peer1", {
      iceServers: toNodeDataChannelIceServers(args.ice_servers),
      iceTransportPolicy: 'relay',
    });
    pc.onLocalDescription((sdp, type) => {
      console.log("sdp_offer");
      const payload = {
        type: "sdp_offer",
        offer: { type: "offer", sdp, }
      };
      send(payload);
    });
    pc.onLocalCandidate((candidate, mid) => {
      pc.addRemoteCandidate(candidate, mid);
    });
    dc = pc.createDataChannel("unreliable_modeling_cmds");
    dc.onOpen(() => {
      console.log("unreliable_modeling_cmds open");
      main();
    });
    dc.onMessage(() => {
      console.log("unreliable_modeling_cmds message");
    });
  };
  handlers["trickle_ice"] = (args) => {
    console.log(args);
  };
  handlers["sdp_answer"] = (args) => {
    console.log(args);
    pc.setRemoteDescription(args.answer.sdp, args.answer.type);
  };

  const cookie = "__Secure-next-auth.session-token=69781ba1-482d-4108-b9a5-90b6ae03bf65";

  const url = "wss://api.kittycad.io/ws/modeling/commands?video_res_width=1084&video_res_height=888";
  const ws = new WebSocket(url, [], {
    protocolVersion: 13,
    origin: "https://api.kittycad.io",
    headers: {
      "Host": "api.kittycad.io",
      "Cookie": cookie
    },
  });
  ws.binaryType = "arraybuffer";

  ws.on("error", (e) => console.log("error", e));
  ws.on("upgrade", (e) => console.log("upgrade"));
  ws.on("open", () => console.log("open"));
  ws.on("close", (e) => console.log("close", e));

  const td = new TextDecoder();
  ws.on("message", (chunk) => {
    console.log("message");
    const obj = JSON.parse(td.decode(chunk));
    if (obj.success) {
      console.log(obj.resp.type);
      (handlers[obj.resp.type] || console.log)(obj.resp.data);
    } else console.log(obj);
  });

  setInterval(() => { console.log("ping"); ws.ping(); }, 10000);
  ws.on("pong", () => console.log("pong"));

  const main = async () => {
    make_axes_gizmo({ clobber: false, gizmo_mode: true });
    make_plane({
      clobber: false,
      hide: true,
      origin: {x: 0, y: 0, z: 0},
      size: 60,
      x_axis:  {x: 1, y: 0, z: 0},
      y_axis:  {x: 0, y: 1, z: 0}
    });
  };
});
