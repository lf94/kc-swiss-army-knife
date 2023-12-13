const process = require("node:process");
const fs = require("node:fs");
const { KittyCADBridge, KittyCADBridgeClient } = require("../index");

const path = "bunny.obj";
const data = fs.readFileSync(path);

KittyCADBridge("0fe6f258-42cd-4dae-be94-35babb0b2e17")
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
