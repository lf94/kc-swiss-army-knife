const process = require("node:process");
const { KittyCADBridge, KittyCADBridgeClient } = require("../../index");
const { toSlices } = require("./stitcher");

const slices = toSlices("pyramid.obj", 0.1);

KittyCADBridge("0fe6f258-42cd-4dae-be94-35babb0b2e17")
.then(() => KittyCADBridgeClient(4999))
.then((client) => {
  Object.assign(global, client);

  let p = 0;

  default_camera_zoom({ magnitude: 70 });

  for (let slice of slices.items.reverse()) {
    //sketch_mode_enable({ plane_id, ortho: false, animated: false });
    const path = start_path();
    move_path_pen({ path, to: { x: slice[0][0], y: slice[0][1], z: slices.lowest + p*slices.height }});
    // skip the first one
    for (let pt of slice.slice(1)) {
      extend_path({
        path,
        segment: { type: "line", end: { x: pt[0], y: pt[1], z: slices.lowest + p*slices.height }, relative: false, }
      });
    }
    close_path({ path_id: path });
    //sketch_mode_disable();
    p += 1;
    extrude({ target: path, distance: slices.lowest + p*slices.height, cap: true });
  }

  // Use the following to "watch"
  // gst-launch-1.0 udpsrc address=127.0.0.1 port=5000 caps="application/x-rtp" ! queue ! rtph264depay ! video/x-h264,stream-format=byte-stream ! queue ! avdec_h264 ! queue ! autovideosink

  global["export"]({
    entity_ids: [],
    source_unit: "in",
    format: {
      type: "gltf",
      storage: "binary",
      presentation: "pretty"
    }
  });

  //batch_end();
  done();
});
