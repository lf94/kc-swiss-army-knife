const { KittyCADBridge, KittyCADBridgeClient } = require("../../index");

const cube = (args) => {
  enable_sketch_mode({ animated: false, disable_camera_with_plane: { x: 0.0, y: 0.0, z: 1.0 }, ortho: false, plane_id: args.plane_id });
  const path = start_path();
  move_path_pen({ path, to: { x: 0.0, y: 0.0, z: 0.0 } });
  const edge_id = extend_path({ path, segment: { type: "line", end: { x: 0.0, y: 10.0, z: 0.0 }, relative: true } });
  extend_path({ path, segment: { type: "line", end: { x: 10.0, y: 0.0, z: 0.0 }, relative: true } });
  extend_path({ path, segment: { type: "line", end: { x: 0.0, y: -10.0, z: 0.0 }, relative: true } });
  close_path({ path_id: path });
  sketch_mode_disable();
  return extrude({ cap: true, distance: 10.0, target: path });
}

// Note to Lee (themself): remember done() at the end these to fire the commands!
// This also means in callbacks, because the bridge won't know there are more
// commands to fire.
KittyCADBridge("api-65d79150-d400-448e-96f2-c0ac55edf144")
.then(() => KittyCADBridgeClient(4999))
.then((client) => {
  Object.assign(global, client);

  const extrude_id1 = cube(make_plane({ clobber: false, hide: true, origin: { x: 0.0, y: 0.0, z: 0.0 }, size: 10.0, x_axis: { x: 1.0, y: 0.0, z: 0.0 }, y_axis: { x: 0.0, y: 1.0, z: 0.0 } }))
  const extrude_id2 = cube(make_plane({ clobber: false, hide: true, origin: { x: 0.0, y: 10.0, z: 0.0 }, size: 10.0, x_axis: { x: 1.0, y: 0.0, z: 0.0 }, y_axis: { x: 0.0, y: 1.0, z: 0.0 } }))
  // const res = boolean_union({ solid_ids: [extrude_id1, extrude_id2], tolerance: 0.000001 })

  global["export"]({
    entity_ids: [extrude_id1, extrude_id2],
    source_unit: "mm",
    format: {
      type: "gltf",
      storage: "binary",
      presentation: "pretty"
    }
  });

  done();
});


