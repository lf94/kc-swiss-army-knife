// Derived from KCMA https://github.com/KittyCAD/modeling-app
const { BSON, EJSON } = require("bson");
const { randomUUID: uuidv4 } = require('node:crypto');
const dgram = require("dgram");
const fs = require("node:fs");
const NodeDataChannelModule = import("node-datachannel");
const { WebSocket, WebSocketServer } = require("ws");

const clientVideo = dgram.createSocket("udp4");
let wss;

const prettyUnits = (g, us) => (n, d) => {
  if (n > 1024) return prettyBytes(n / g, d + 1);
  else return [ n, us[d] ];
};

const prettyBytes = prettyUnits(1024, ["B","KiB","MiB","GiB","TiB","PiB"]);

const KittyCADBridgeClient = (port) => {
  const obj = {};

   // Add more as needed or as they become available
  const commands = [ "make_axes_gizmo", "make_plane", "sketch_mode_enable",
  "start_path", "move_path_pen", "extend_path", "close_path", "sketch_mode_disable",
  "extrude", "export", "modeling_cmd_req", "reconfigure_stream",
  "import_files", "default_camera_zoom"];

  const ws = new WebSocket("ws://localhost:4999", []);

  return new Promise((resolve, reject) => {
    ws.on("open", () => {
      // Signals the server to send all the commands to KittyCAD.
      obj["done"] = () => ws.send("done");

      // Denotes batch start and ends
      obj["batch_start"] = () => ws.send("batch_start");
      obj["batch_end"] = () => ws.send("batch_end");

      for (const command of commands) {
        obj[command] = (args) => {
          const payload = {
            cmd: {
              type: command,
              ...args
            },
            cmd_id: uuidv4(),
            type: "modeling_cmd_req"
          };
          ws.send(JSON.stringify(payload));
          return payload.cmd_id;
        };
      };

      resolve(obj);
    });
  });
};
module.exports.KittyCADBridgeClient = KittyCADBridgeClient;

const KittyCADBridge = (sessionKey, fnCmds, isDebug = false) => new Promise((resolve, reject) => {
  let stats = { bytesSentPerSec: 0, bytesSentTotal: 0, guesstimateRam: 0, reqPerSeq: 0, shapes: 0 };

  if (isDebug) {
    setInterval(() => {
      const [ n, u1 ] = prettyBytes(stats.bytesSentPerSec, 0);
      console.log("Speed: " + n.toFixed(2) + u1 + "/s");
      const [ m, u2 ] = prettyBytes(stats.bytesSentTotal, 0);
      console.log("Total: " + m + u2);
      // const [ o, u3 ] = prettyBytes(stats.guesstimateRam, 0);
      // console.log("Guesstimate RAM: " + o + u3);
      console.log("Req/s: " + stats.reqPerSeq);
      stats.bytesSentPerSec = 0;
      stats.reqPerSeq = 0;
    }, 1000);
  }

  const queue = [];

  const modeling_cmd_batch_req = (args) => {
    let requests = [];
    let a;
    while ((a = queue.shift()) != "batch_end") {
      requests.push(a);
    }
    const payload = {
      requests,
      type: "modeling_cmd_batch_req"
    };
    return queue.push(payload);
  }

  NodeDataChannelModule.then((NodeDataChannel) => {
    NodeDataChannel.initLogger("Debug");

    const te = new TextEncoder();

    const send = (payload) => {
      let data;

      // Decode both to be re-encoded shortly.
      if (payload instanceof Buffer) {
        payload = JSON.parse(td.decode(payload));
        console.log(payload);
      }

      if (typeof payload === "string") {
        payload = JSON.parse(payload);
      }

      data = JSON.stringify(payload);

      if (payload.cmd && payload.cmd.type == "import_files") {
        payload.cmd.files.forEach((f) => {
          // Yep, .data.data was a pain to learn.
          // Caused by serializing from Buffer to JSON and back.
          f.data = Buffer.from(f.data.data);
        });
        data = BSON.serialize(payload);
      }

      ws.send(data);

      stats.bytesSentPerSec += data.length;
      stats.bytesSentTotal += data.length;
      stats.reqPerSeq += 1;
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

    let ws, pc, dc;
    let track;

    const close = () => {
      wss.close();
      dc.close();
      pc.close();
      ws.close();
    };

    process.once('SIGTERM', close);
    process.once('SIGINT', close);

    let handlers = {};
    handlers["ice_server_info"] = (args) => {
      console.log(args);
      pc = new NodeDataChannel.PeerConnection("Peer1", {
        iceServers: toNodeDataChannelIceServers(args.ice_servers),
        iceTransportPolicy: "relay",
        bundlePolicy: "max-bundle",
      });

      // Get a video stream (but overall not necessary)
      // You can quickly test this with:
      // gst-launch-1.0 udpsrc address=127.0.0.1 port=5000 caps="application/x-rtp" ! queue ! rtph264depay ! video/x-h264,stream-format=byte-stream ! queue ! avdec_h264 ! queue ! autovideosink
      // On ArchLinux you may need the gst-libav package.
      // This code was taken from the node-datachannel media example.
      let video = new NodeDataChannel.Video('video', 'RecvOnly');
      video.addH264Codec(102);

      track = pc.addTrack(video);
      track.onMessage((msg) => {
        clientVideo.send(msg, 5000, '127.0.0.1', (err, n) => {
          if (err) console.log(err, n);
        });
      });

      pc.onLocalDescription((sdp, type) => {
        console.log("sdp_offer");
        const payload = {
          type: "sdp_offer",
          offer: { type: "offer", sdp, }
        };
        pc.setLocalDescription(sdp);
        send(payload);
      });

      dc = pc.createDataChannel("unreliable_modeling_cmds");
      dc.onOpen(() => {
        console.log("unreliable_modeling_cmds open");

        if (fnCmds) {
          fnCmds();
          ignition();
        }

        // Open a stream listening for JSON commands.
        // This creates a bridge between our programs and
        // the KittyCAD service.
        wss = new WebSocketServer({ port: 4999 });
        wss.on("connection", (ws) => {
          console.log("Connected");
          ws.on("message", (data) => {
            const text = td.decode(data);
            if (data == "done") { ignition(); } else { queue.push(text); }
          });
        });
        wss.on("listening", () => {
          console.log("Listening");
          resolve();
        });
      });
      dc.onMessage(() => {
        console.log("unreliable_modeling_cmds message");
      });
    };
    handlers["trickle_ice"] = (args) => {
      console.log(args);
      // If we attach to the session too soon, it
      // gets cut off for some reason.
      let session = new NodeDataChannel.RtcpReceivingSession();
      track.setMediaHandler(session);
    };
    handlers["sdp_answer"] = (args) => {
      console.log(args);
      pc.setRemoteDescription(args.answer.sdp, args.answer.type);
      pc.onLocalCandidate((candidate, mid) => {
        pc.addRemoteCandidate(candidate, mid);
      });
    };
    handlers["modeling"] = (args) => {
      console.log(args);
      if (queue.length == 0) {
        console.log("No more commands");
        return;
      }

      // Continue to fire off commands in the queue.
      let cmd = queue.shift();

      // Unload the batch into the queue as a single command.
      if (cmd == "batch_start") {
        modeling_cmd_batch_req();
        cmd = queue.shift();
      }

      console.log(cmd);
      send(cmd);
    };
    handlers["export"] = (args) => {
      const file = args.files[0];
      fs.writeFileSync(file.name, file.contents.read(0, file.contents.length));
      console.log("Wrote " + file.name);
    };

    const cookie = `__Secure-next-auth.session-token=${sessionKey}`;

    const url = "wss://api.kittycad.io/ws/modeling/commands?video_res_width=640&video_res_height=480";
    ws = new WebSocket(url, [], {
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
        (handlers[obj.resp.type] || console.log)(obj.resp.data);
      } else {
        console.log(obj);
        // Reignite the queue command launcher on any failures.
        ignition();
      }
    });

    setInterval(() => { console.log("ping"); ws.ping(); }, 10000);
    ws.on("pong", () => console.log("pong"));

    // Kick off the requests.
    const ignition = () => {
      if (queue.length == 0) return;
      const cmd = queue.shift();
      //console.log(cmd);
      send(cmd);
    };
  });
});

module.exports.KittyCADBridge = KittyCADBridge;
