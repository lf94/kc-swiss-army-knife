const { KittyCADBridge, KittyCADBridgeClient } = require("../../index");

KittyCADBridge("api-981c07ba-e800-4da9-bfa2-a194b7ce0f06")
.then(() => KittyCADBridgeClient(4999))
.then((client) => {
  Object.assign(global, client);

  const distance = (p1, p2) => Math.sqrt((p2.x - p1.x)**2 + (p2.y - p1.y)**2 + (p2.z - p1.z)**2);
  const normal = (p1, p2) => {
    const d = distance(p1, p2);
    return {
      x: (p2.x - p1.x) / d,
      y: (p2.y - p1.y) / d,
      z: (p2.z - p1.z) / d,
    }
  };

  const radius = 500
  const threadDiameter = 100;

  // Draw a cube to cut from
  const plane_id_cube = make_plane({
    clobber: false,
    hide: true,
    origin: { x: 0, y: 0, z: 0 },
    size:  60,
    x_axis: { x: 1, y: 0, z: 0 },
    y_axis: { x: 0, y: 0, z: 1 },
    z_axis: { x: 0, y: 1, z: 0 },
  });

  // enable_sketch_mode({ entity_id: plane_id_cube, ortho: true, animated: false, adjust_camera: false });
  // const path_s = start_path();

  // const l = (radius * 2) + threadDiameter * 2

  // move_path_pen({ path: path_s, to: { x: 0, y: -l/2, z: 0 } });
  // extend_path({ path: path_s, segment: { type: "line", end: { x: l/2, y: -l/2, z: 0 }, relative: false, } });
  // extend_path({ path: path_s, segment: { type: "line", end: { x: l/2, y: l/2, z: 0 }, relative: false, } });
  // extend_path({ path: path_s, segment: { type: "line", end: { x: -l/2, y: l/2, z: 0 }, relative: false, } });
  // extend_path({ path: path_s, segment: { type: "line", end: { x: -l/2, y: -l/2, z: 0 }, relative: false, } });

  // close_path({ path_id: path_s });
  // sketch_mode_disable();

  // extrude({ target: path_s, distance: -3000, cap: true });

  const sweep = ({ from, to }, sketchFn) => {
    const norm = normal(from, to)

    const z_axis = {
      x: norm.x,
      y: norm.y,
      z: norm.z,
    };

    const x_axis = {
      x: -z_axis.y,
      y: z_axis.x,
      z: 0
    };

    // Our new "up"
    const y_axis = {
      x: x_axis.y*z_axis.z - x_axis.z*z_axis.y,
      y: x_axis.z*z_axis.x - x_axis.x*z_axis.z,
      z: x_axis.x*z_axis.y - x_axis.y*z_axis.x,
    };

    const plane_id = make_plane({
      clobber: false,
      hide: true,
      origin: from,
      size:  60,
      x_axis,
      y_axis,
      z_axis,
    });

    const path = sketchFn(plane_id);

    const d = distance(from, to)
    extrude({ target: path, distance: -d, cap: true });
  };


  const segs = 30
  const radians = Math.PI*2 / segs


  const cylinder = ({ radius }) => (plane_id) => {
    enable_sketch_mode({ entity_id: plane_id, ortho: true, animated: false, adjust_camera: false });
    const path = start_path();

    extend_path({ path,  segment: { type: "arc", center: { x: 0, y: 0 }, end: { unit: 'degrees', value: 360 }, start: { unit: 'degrees', value: 0 }, radius, relative: false, } });

    close_path({ path_id: path });
    sketch_mode_disable();

    return path;
  };

  // Helix sweep
  const loops = 5

  const thickness = { y: 30, normal: 30 };
  const p = 60
  const slope = p / (radians * (segs / 2));

  let z1 = 0
  batch_start();
  for (let loop = 0; loop < loops; loop += 1) {
    for (let r = radians; r <= Math.PI*2 + radians; r += radians) {
      let z2 = z1 + slope

      const from = {
        x: Math.cos(r - radians)*radius, z: Math.sin(r - radians)*radius, y: z1
      }
      const to = {
        x: Math.cos(r)*radius, z: Math.sin(r)*radius, y: z2
      }

      sweep({ from, to }, cylinder({ radius: threadDiameter/2 }))

      z1 = z2
    }
  }

  const plane_id = make_plane({
    clobber: false,
    hide: true,
    origin: { x: 0, y: 0, z: 0 },
    size:  60,
    x_axis: { x: 1, y: 0, z: 0 },
    y_axis: { x: 0, y: 0, z: 1 },
    z_axis: { x: 0, y: 1, z: 0 },
  });

  const path = cylinder({ radius: radius - threadDiameter/2 })(plane_id); 
  extrude({ target: path, distance: -3000, cap: true });

  // export is a reserved keyword
  global["export"]({
    entity_ids: [],
    source_unit: "in",
    format: {
      type: "gltf",
      storage: "binary",
      presentation: "pretty"
    }
  });

  batch_end();
  done();
});
