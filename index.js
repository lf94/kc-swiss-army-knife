// In the past this code supported video streaming.
// I've come to learn, video streaming is only worth it if the whole stack
// you use supports it very well.
// Geometry data is king.

// Derived from KCMA https://github.com/KittyCAD/modeling-app
const { BSON, EJSON } = require("bson");
const { randomUUID: uuidv4 } = require('node:crypto');
const dgram = require("dgram");
const fs = require("node:fs");
const { WebSocket, WebSocketServer } = require("ws");

const URL_API_ZOO_DEV = process.env.URL_API_ZOO_DEV ?? "wss://api.zoo.dev";

const cbs = {};

const KittyCADBridgeClient = (port) => {
  const obj = {};
  // User registered callbacks for commands that return data

   // Add more as needed or as they become available
  const commands = [ "make_axes_gizmo", "make_plane", "enable_sketch_mode",
  "sketch_mode_enable",
  "start_path", "move_path_pen", "extend_path", "close_path", "sketch_mode_disable",
  "extrude", "export", "modeling_cmd_req", "reconfigure_stream",
  "import_files", "default_camera_zoom", "object_bring_to_front",
  "zoom_to_fit",
  "solid3d_fillet_edge", "solid3d_get_extrusion_face_info",
  "solid3d_get_opposite_edge", "default_camera_focus_on", "default_camera_look_at",
  "revolve", "boolean_union", "boolean_intersection", "boolean_subtract",
  "take_snapshot", "object_set_material_params_pbr", "entity_linear_pattern_transform"];

  const ws = new WebSocket("ws://localhost:" + port, []);

  return new Promise((resolve, reject) => {
    ws.on("open", () => {
      console.log("Client connected to bridge");

      // Signals the server to send all the commands to KittyCAD.
      obj["done"] = () => ws.send("done");

      // Denotes batch start and ends
      obj["batch_start"] = () => ws.send(JSON.stringify({
        cmd: "batch_start",
        type: "fake",
      }));
      obj["batch_end"] = () => ws.send(JSON.stringify({
        cmd: "batch_end",
        type: "fake",
      }));

      for (const command of commands) {
        obj[command] = (args, cb) => {
          const payload = {
            cmd: {
              type: command,
              ...args
            },
            cmd_id: uuidv4(),
            type: "modeling_cmd_req"
          };

          // Call this callback when the server responds with the same cmd_id
          if (cb) cbs[payload.cmd_id] = cb;

          ws.send(JSON.stringify(payload));
          return payload.cmd_id;
        };
      };

      resolve(obj);
    });
  });
};
module.exports.KittyCADBridgeClient = KittyCADBridgeClient;

const KittyCADBridge = (sessionKey, fnCmds) => new Promise((resolve, reject) => {
  const noop = () => {};
  const queue = [];

  const modeling_cmd_batch_req = (args) => {
    let requests = [];
    let a;
    while (!(a = queue.shift()).includes("batch_end")) {
      requests.push(a);
    }
    const payload = `{
      "batch_id": "${uuidv4()}",
      "requests": [${requests.join(",")}],
      "type": "modeling_cmd_batch_req"
    }`;
    return queue.push(payload);
  }

  const te = new TextEncoder();

  const send = (payload) => {
    let data;
    let bufferParsed = false

    // Decode both to be re-encoded shortly.
    if (payload instanceof Buffer) {
      payload = JSON.parse(td.decode(payload));
      bufferParsed = true
    }

    if (bufferParsed) {
      payload = JSON.parse(payload);
    }

    if (typeof payload === "string" && payload.includes("modeling_cmd_batch_req")) {
      ws.send(payload)
      return
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
  };

  let ws, wss;

  const close = () => {
    ws.close();
  };

  process.once('SIGTERM', close);
  process.once('SIGINT', close);

  let handlers = {};

  handlers["modeling_session_data"] = (args) => {
    // Open a stream listening for JSON commands.
    // This creates a bridge between our programs and
    // the KittyCAD service.
    console.log("Creating bridge");
    wss = new WebSocketServer({ port: 4999 });
    wss.on("connection", (ws) => {
      console.log("Bridge received connection");
      ws.on("message", (data) => {
        console.log("< message");
        const text = td.decode(data);
        console.log(text);
        if (data == "done") { ignition(); } else { queue.push(text); }
      });
    });

    wss.on("listening", () => {
      console.log("Bridge listening for clients");
      resolve();
    });

    // if (fnCmds) {
    //   fnCmds();
    //   ignition();
    // }
  };

  handlers["modeling"] = (args) => {
    if (args.modeling_response.type === "take_snapshot") {
      const contents = Buffer.from(args.modeling_response.data.contents, 'base64url')
      fs.writeFileSync("out.png", contents);
      console.log("Wrote " + "out.png");
    }

    if (queue.length == 0) {
      console.log("No more commands");
      return;
    }

    // Continue to fire off commands in the queue.
    let cmd = queue.shift();

    // Unload the batch into the queue as a single command.
    if (cmd.includes("batch_start")) {
      modeling_cmd_batch_req();
      cmd = queue.shift();
    }

    // console.log(cmd);
    send(cmd);
  };

  handlers["export"] = (args) => {
    const file = args.files[0];
    fs.writeFileSync(file.name, file.contents.read(0, file.contents.length));
    console.log("Wrote " + file.name);
  };

  console.log(`Connecting to ${URL_API_ZOO_DEV}`);
  const url = `${URL_API_ZOO_DEV}/ws/modeling/commands?webrtc=false`;
  ws = new WebSocket(url, [], {
    protocolVersion: 13,
    // Fake it to make the remote end happy.
    origin: "https://app.zoo.dev",
  });
  ws.binaryType = "arraybuffer";

  ws.on("error", (e) => console.log("error", e));
  ws.on("upgrade", (e) => console.log("Websocket upgraded protocol"));
  ws.on("open", () => {
    console.log("Websocket opened with session key", sessionKey);
    ws.send(JSON.stringify({ type: "headers", headers: { Authorization: `Bearer ${sessionKey}` } }));
  });
  ws.on("close", (...args) => console.log("KittyCAD API closed", args));

  const td = new TextDecoder();
  ws.on("message", (chunk) => {
    console.log("> message");
    let obj;
    if (chunk instanceof Buffer) {
      // console.log("Buffer");
      obj = JSON.parse(td.decode(chunk));
      console.log(JSON.stringify(obj));
    }
    // These are usually massive, don't print them.
    // WARNING: YOU MAY MISS AN ERROR!
    if (chunk instanceof ArrayBuffer) {
      // console.log("ArrayBuffer");
      obj = BSON.deserialize(chunk);
    }

    if (obj.success) {
      (handlers[obj.resp.type] || console.log)(obj.resp.data);

      // Run any callbacks associated with this request_id (cmd_id)
      (cbs[obj.request_id] || noop)(obj);
    } else {
      // console.log(obj);
      // Reignite the queue command launcher on any failures.
      ignition();
    }
  });

  setInterval(() => { console.log("ping"); ws.ping(); }, 10000);
  ws.on("pong", () => console.log("pong"));

  // Kick off the requests.
  const ignition = () => {
    if (queue.length == 0) return;
    let cmd = queue.shift()
    if (cmd.includes("batch_start")) {
      modeling_cmd_batch_req();
      cmd = queue.shift();
    }
    send(cmd);
  };
});

module.exports.KittyCADBridge = KittyCADBridge;
