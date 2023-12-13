const LSystem = require("lindenmayer");
const KittyCAD = require("./index");

const kcs = KittyCAD("69781ba1-482d-4108-b9a5-90b6ae03bf65", () => {
  const lsystem = new LSystem({
        axiom: 'F+F+F+F',
        productions: {
          'F': 'FF+F+F+F+F+F-F',
        }
  });
  const result = lsystem.iterate(3);

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

  //batch_start();
  const path = start_path();
  move_path_pen({ path, to: { x: 0, y: 0, z: 0 }});

  let x = 0;
  let y = 0;
  let angle = 0;
  let length = 1.0;
  const factor = 1.36
  let stack = [];
  const deg = Math.PI*2 / 360;
  result.split("").forEach((c) => {
    switch (c) {
      case "[": {
        stack.push({ angle, length, x, y });
        break;
      }
      case "]": {
        const last = stack.pop();
        angle = last.angle;
        length = last.length;
        x = last.x;
        y = last.y;
        break;
      }
      case ">": length *= factor; break;
      case "<": length /= factor; break;
      case "+": angle = (angle - 90) % 360; break;
      case "-": angle = (angle + 90) % 360; break;
      case "F":
        x += Math.cos(angle*deg) * length,
        y += Math.sin(angle*deg) * length,
        extend_path({
          path,
          segment: {
            type: "line",
            end: { x, y, z: 0 },
            relative: false,
          }
        });
        break;
    }
  });

  close_path({ path_id: path });
  sketch_mode_disable();
  extrude({ target: path, distance: 1, cap: true });

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
  //batch_end();
});
