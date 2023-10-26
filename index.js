// Derived from KCMA https://github.com/KittyCAD/modeling-app
const { BSON, EJSON } = require("bson");
const { randomUUID: uuidv4 } = require('node:crypto');
const fs = require("node:fs");
const NodeDataChannelModule = import("node-datachannel");
const { WebSocket } = require("ws");

let stats = { bytesSentPerSec: 0, bytesSentTotal: 0, reqPerSeq: 0 };

NodeDataChannelModule.then((NodeDataChannel) => {
  NodeDataChannel.initLogger("Debug");

  const prettyBytes = (n, d) => {
    if (n > 1024) return prettyBytes(n / 1024, d + 1);
    else return [ n, d ];
  };

  setInterval(() => {
    const [ n, d ] = prettyBytes(stats.bytesSentPerSec, 0);
    console.log("Speed: " + n.toFixed(2) + ["B","KiB","MiB","GiB"][d] + "/s");
    const [ m, e ] = prettyBytes(stats.bytesSentTotal, 0);
    console.log("Total: " + m + ["B","KiB","MiB","GiB"][e]);
    console.log("Req/s: " + stats.reqPerSeq);
    stats.bytesSentPerSec = 0;
    stats.reqPerSeq = 0;
  }, 1000);

  const te = new TextEncoder();
  const send = (payload) => {
    const str = JSON.stringify(payload);
    stats.bytesSentPerSec += str.length;
    stats.bytesSentTotal += str.length;
    stats.reqPerSeq += 1;
    ws.send(str);
  };

  let queue = [];

  const commands = [ "make_axes_gizmo", "make_plane", "sketch_mode_enable",
  "start_path", "move_path_pen", "extend_path", "close_path", "sketch_mode_disable",
  "extrude", "export"];
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
      queue.push(payload);
      return payload.cmd_id;
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
  handlers["modeling"] = (args) => {
    if (queue.length == 0) {
      console.log("No more commands");
      return;
    }
    // Continue to fire off commands in the queue.
    const cmd = queue.shift();
    // console.log(cmd);
    send(cmd);
  };
  handlers["export"] = (args) => {
    const file = args.files[0];
    fs.writeFileSync(file.name, file.contents.read(0, file.contents.length));
    console.log("Wrote " + file.name);
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
    // console.log("message");
    let obj;
    if (chunk instanceof Buffer) {
      // console.log("Buffer");
      obj = JSON.parse(td.decode(chunk));
    }
    if (chunk instanceof ArrayBuffer) {
      // console.log("ArrayBuffer");
      obj = BSON.deserialize(chunk);
    }
    if (obj.success) {
      // console.log(obj.resp.type);
      (handlers[obj.resp.type] || console.log)(obj.resp.data);
    } else console.log(obj);
  });

  setInterval(() => { console.log("ping"); ws.ping(); }, 10000);
  ws.on("pong", () => console.log("pong"));

  // Kick off the requests.
  const ignition = () => {
    const cmd = queue.shift();
    // console.log(cmd);
    send(cmd);
  };

  const createSpicyCylinder = (plane_id, position) => {
    sketch_mode_enable({ plane_id, ortho: false, animated: false });
    const path = start_path();
    move_path_pen({ path, to: position });
    extend_path({
      path,
      segment: {
        type: "tangential_arc",
        offset: { unit: "degrees", value: 359 },
        radius: 1000,
      }
    });
    extend_path({
      path,
      segment: {
        type: "line",
        end: { x: 0.1, y: 0, z: 0},
        relative: true,
      }
    });
    extend_path({
      path,
      segment: {
        type: "tangential_arc",
        offset: { unit: "degrees", value: 359 },
        radius: 1000,
      }
    });
    extend_path({
      path,
      segment: {
        type: "tangential_arc",
        offset: { unit: "degrees", value: 359 },
        radius: 1000,
      }
    });
    close_path({ path_id: path });
    sketch_mode_disable();
    extrude({ target: path, distance: 1, cap: true });
  };

  const main = async () => {
    const plane_id = make_plane({
      clobber: false,
      hide: true,
      origin: { x: 0, y: 0, z: 0 },
      size:  60,
      x_axis: {x: 1, y: 0, z: 0},
      y_axis: {x: 0, y: 1, z: 0},
    });

    for (let i = 0; i < 300000; i++)  {
      createSpicyCylinder(plane_id, { x: 0.1 * i, y: 0, z: 0 });
    }

    // export is a reserved keyword
    // global["export"]({
    //   entity_ids: [],
    //   source_unit: "in",
    //   format: {
    //     type: "gltf",
    //     storage: "binary",
    //     presentation: "pretty"
    //   }
    // });

    ignition();
  };
});
