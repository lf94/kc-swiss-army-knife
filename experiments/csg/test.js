const { KittyCADBridge, KittyCADBridgeClient } = require("../../index");

const epsilon = 0.0001
const tolerance = epsilon

const cube = (origin, size) => {
  const plane_id = make_plane({ clobber: false, hide: true, origin, size, x_axis: { x: 1.0, y: 0.0, z: 0.0 }, y_axis: { x: 0.0, y: 1.0, z: 0.0 }})
  enable_sketch_mode({ adjust_camera: false, animated: false, ortho: false, entity_id: plane_id });
  const path = start_path();

  move_path_pen({ path, to: { x: 0.0, y: 0.0, z: 0.0 } });
  const edge_id = extend_path({ path, segment: { type: "line", end: { x: 0.0, y: size, z: 0.0 }, relative: true } });
  extend_path({ path, segment: { type: "line", end: { x: size, y: 0.0, z: 0.0 }, relative: true } });
  extend_path({ path, segment: { type: "line", end: { x: 0.0, y: -size, z: 0.0 }, relative: true } });
  close_path({ path_id: path });
  sketch_mode_disable();

  extrude({ cap: true, distance: size, target: path });

  return path;
}

const sphere = (origin, diameter) => {
  const plane_id = make_plane({ clobber: false, hide: true, origin, size: diameter, x_axis: { x: 1.0, y: 0.0, z: 0.0 }, y_axis: { x: 0.0, y: 1.0, z: 0.0 }})
  enable_sketch_mode({ adjust_camera: false, animated: false, ortho: false, entity_id: plane_id });
  const path = start_path();

  move_path_pen({ path, to: { x: tolerance, y: 0.0, z: 0.0 } });
  const edge_id = extend_path({ path, segment: { type: "line", end: { x: tolerance, y: diameter, z: 0.0 }, relative: false } });
  extend_path({ path, segment: { type: "arc_to", relative: false, end: { x: tolerance, y: 0.0, z: 0.0 }, interior: { x: (diameter / 2) + tolerance, y: diameter / 2, z: 0 } } });
  close_path({ path_id: path });
  sketch_mode_disable();

  revolve({ angle: { value: Math.PI * 2.0, unit: "radians" }, axis: { x: 0, y: 1, z: 0 }, axis_is_2d: false, origin, tolerance, target: path });

  return path;
}

// Note to Lee (themself): remember done() at the end these to fire the commands!
// This also means in callbacks, because the bridge won't know there are more
// commands to fire.
KittyCADBridge("api-65d79150-d400-448e-96f2-c0ac55edf144")
.then(() => KittyCADBridgeClient(4999))
.then((client) => {
  Object.assign(global, client);

  const a = sphere({ x: 0.0, y: 0.0, z: 0.0 }, 10)
  const b = sphere({ x: 0.0, y: 0.0, z: 5.0 }, 10)
  // const ab_union = boolean_union({ solid_ids: [a, b], tolerance: 0.00000001 })
  // const ab_sub = boolean_subtract({ target_ids: [a], tool_ids: [b], tolerance: 0.00000001 })
  // const ab_inter = boolean_intersection({ solid_ids: [a, b], tolerance: 0.00000001 })

  zoom_to_fit({ animated: false, padding: 0, object_ids: [] });
  take_snapshot({ format: "png" });

  // global["export"]({
  //   entity_ids: [],
  //   source_unit: "mm",
  //   format: {
  //     type: "gltf",
  //     storage: "binary",
  //     presentation: "pretty"
  //   }
  // });

  done();
});


