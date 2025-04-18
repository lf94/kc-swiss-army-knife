const LSystem = require("lindenmayer");
const { KittyCADBridge, KittyCADBridgeClient } = require("../index");

const kcs = KittyCADBridge("api-a6ff4a02-e199-4cca-b949-ead64a63651e")
.then(() => KittyCADBridgeClient(4999))
.then((client) => {
  Object.assign(global, client);

  const production = 'F-F++F-F';

  const lsystem = new LSystem({
    axiom: 'F++F++F',
    productions: {
      'F': production,
    }
  });
  const result = lsystem.iterate(2);

  console.log(result);

  const plane_id = make_plane({
    clobber: false,
    hide: true,
    origin: { x: 0, y: 0, z: 0 },
    size:  60,
    x_axis: {x: 1, y: 0, z: 0},
    y_axis: {x: 0, y: 1, z: 0},
  });
  sketch_mode_enable({ plane_id, ortho: false, animated: false });

  const plane_id2 = make_plane({
    clobber: false,
    hide: true,
    origin: { x: 0, y: 0, z: 0 },
    size:  60,
    x_axis: {x: 1, y: 0, z: 0},
    y_axis: {x: 0, y: 1, z: 0},
  });
  sketch_mode_enable({ plane_id2, ortho: false, animated: false });

  batch_start();
  let path = start_path();
  move_path_pen({ path, to: { x: 0, y: 0, z: 0 }});
  extend_path({
    path,
    segment: { type: "line", end: { x: 10, y: 0, z: 0 }, relative: true, }
  });
  extend_path({
    path,
    segment: { type: "line", end: { x: 0, y: 10, z: 0 }, relative: true, }
  });
  close_path({ path_id: path });
  extrude({ target: path, distance: 1, cap: true });

  path = start_path();
  move_path_pen({ path, to: { x: 30, y: 0, z: 0 }});
  extend_path({
    path,
    segment: { type: "line", end: { x: 10, y: 0, z: 0 }, relative: true, }
  });
  extend_path({
    path,
    segment: { type: "line", end: { x: 0, y: 10, z: 0 }, relative: true, }
  });
  close_path({ path_id: path });
  extrude({ target: path, distance: 1, cap: true });

  zoom_to_fit({ animated: false, object_ids: [path], padding: 0.2 });
  batch_end();

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
  done();
});
