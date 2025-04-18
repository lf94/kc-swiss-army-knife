const process = require("node:process");
const fs = require("node:fs");
const { KittyCADBridge, KittyCADBridgeClient } = require("../index");

const path = "bunny.obj";
const data = fs.readFileSync(path);

KittyCADBridge("api-65d79150-d400-448e-96f2-c0ac55edf144")
.then(() => KittyCADBridgeClient(4999))
.then((client) => {
  Object.assign(global, client);
  import_files({
    files: [{ data, path }],
    format: {
      type: "obj",
      units: "m",
      coords: {
        forward: { axis: "y", direction: "negative", },
        up: { axis: "z", direction: "positive", }
      }
    }
  });
  default_camera_zoom({ magnitude: 70 });
  default_camera_zoom({ magnitude: 70 });
  default_camera_zoom({ magnitude: 70 });
  default_camera_zoom({ magnitude: 70 });
  default_camera_zoom({ magnitude: 70 });
  default_camera_zoom({ magnitude: 70 });
  default_camera_zoom({ magnitude: 70 });
  default_camera_zoom({ magnitude: 70 });
  default_camera_zoom({ magnitude: 70 });
  done();
});
