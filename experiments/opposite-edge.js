const { KittyCADBridge, KittyCADBridgeClient } = require("../index");

// Note to Lee (themself): remember done() at the end these to fire the commands!
// This also means in callbacks, because the bridge won't know there are more
// commands to fire.
KittyCADBridge("018df0e5-95e2-70c6-9573-6d10437924b1")
.then(() => KittyCADBridgeClient(4999))
.then((client) => {
  Object.assign(global, client);

  const plane_id = make_plane({ clobber: false, hide: true, origin: { x: 0.0, y: 0.0, z: 0.0 }, size: 60.0, x_axis: { x: 1.0, y: 0.0, z: 0.0 }, y_axis: { x: 0.0, y: 1.0, z: 0.0 } });
  sketch_mode_enable({ animated: false, disable_camera_with_plane: { x: 0.0, y: 0.0, z: 1.0 }, ortho: false, plane_id });
  const path = start_path();
  move_path_pen({ path, to: { x: 0.0, y: 0.0, z: 0.0 } });
  const edge_id = extend_path({ path, segment: { type: "line", end: { x: 0.0, y: 10.0, z: 0.0 }, relative: true } });
  extend_path({ path, segment: { type: "line", end: { x: 10.0, y: 0.0, z: 0.0 }, relative: true } });
  extend_path({ path, segment: { type: "line", end: { x: 0.0, y: -10.0, z: 0.0 }, relative: true } });
  close_path({ path_id: path });
  sketch_mode_disable();
  const extrude_id = extrude({ cap: true, distance: 10.0, target: path });
  console.log(extrude_id);
  default_camera_focus_on({ uuid: path });
  object_bring_to_front({ object_id: path });
  solid3d_get_extrusion_face_info({ edge_id, object_id: path }, (data) => {
    for (let face of data.resp.data.modeling_response.data.faces) {
      console.log(face);

      // Fillet all opposite edges
      solid3d_get_opposite_edge({ edge_id, face_id: face.face_id, object_id: path }, (data) => {
         let edge_id_to_fillet = data.resp.data.modeling_response.data.edge;
          solid3d_fillet_edge({ edge_id: edge_id_to_fillet, object_id: path, radius: 2.0, tolerance: 1e-7 });
          done();
      });

      done();
    }
  })
  done();
});


