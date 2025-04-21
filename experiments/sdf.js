const { KittyCADBridge, KittyCADBridgeClient } = require("../index");

const tolerance = 0.0001

const cube = (origin, size) => {
  const plane_id = make_plane({ clobber: false, hide: true, origin, size: 1, x_axis: { x: 1.0, y: 0.0, z: 0.0 }, y_axis: { x: 0.0, y: 1.0, z: 0.0 }})
  enable_sketch_mode({ adjust_camera: false, animated: false, ortho: false, entity_id: plane_id });  const path = start_path();
  move_path_pen({ path, to: { x: 0, y: 0, z: 0 } });
  const edge_id = extend_path({ path, segment: { type: "line", end: { x: 0.0, y: size, z: 0.0 }, relative: true } });
  extend_path({ path, segment: { type: "line", end: { x: size, y: 0.0, z: 0.0 }, relative: true } });
  extend_path({ path, segment: { type: "line", end: { x: 0.0, y: -size, z: 0.0 }, relative: true } });
  close_path({ path_id: path });
  sketch_mode_disable();

  extrude({ cap: false, distance: size, target: path });
  return path;
}

const sphere = (origin, diameter) => {
  const plane_id = make_plane({ clobber: false, hide: true, origin, size: 1, x_axis: { x: 1.0, y: 0.0, z: 0.0 }, y_axis: { x: 0.0, y: 1.0, z: 0.0 }})
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

const lengthOfSegment = (xyz) => {
  return Math.sqrt(xyz[0]**2 + xyz[1]**2 + xyz[2]**2);
};

function normalize(vec) {
  const length = Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
  return length > 0 ? [vec[0] / length, vec[1] / length, vec[2] / length] : [0, 0, 0];
}

const sdfEval = (whl, cb) => {

  const fract = (x) => {
    return x - Math.floor(x);
  };
  // const palette = (t) => {
  //   const a = [0.5, 0.5, 0.5];
  //   const b = [0.5, 0.5, 0.5];
  //   const c = [1.0, 1.0, 1.0];
  //   const d = [0.263, 0.416, 0.557];
  //   return [
  //     a[0] + b[0]*Math.cos(6.283185*(c[0]*t+d[0])),
  //     a[1] + b[1]*Math.cos(6.283185*(c[1]*t+d[1])),
  //     a[2] + b[2]*Math.cos(6.283185*(c[2]*t+d[2])),
  //   ];
  // }

  // const f = (xyz, time) => {
  //   let uv = [
  //     (xyz[0] * 2.0 - whl[0]) / whl[1],
  //     (xyz[1] * 2.0 - whl[1]) / whl[1],
  //   ]
  //   let finalColor = [0,0,0,0];
  //   for(let i = 0.0; i < 1.5; i++){
  //       uv = [
  //         fract(uv[0] * 1.5) - 0.5,
  //         fract(uv[1] * 1.5) - 0.5,
  //       ];
  //       const col = palette(lengthOfSegment([...uv, 0]) + time);
  //       let d = lengthOfSegment([...uv, 0]);
  //       d = Math.sin(d * 8.0 + time*0.4) / 1.0;
  //       d = Math.abs(d);
  //       d -= 0.05;
  //       d = 0.2/d;
  //       finalColor = [
  //         finalColor[0] + col[0] * d,
  //         finalColor[1] + col[1] * d,
  //         finalColor[2] + col[2] * d,
  //         1.0,
  //       ];
  //   }
  //   return finalColor;
  // };

  // Custom Lava Lamp Shader inspired by Shadertoy's shader of the week
  // This shader creates a mesmerizing lava lamp effect

  // SDF for a smooth blob shape using sine waves
  const blobShape = (p, time) => {
    // Use multiple frequencies of sine waves for organic blob-like shape
    const scale1 = 3.0 + 2.0 * Math.sin(time / 8.0);
    const scale2 = 5.0 + 3.0 * Math.cos(time / 12.0);
    
    const wave1 = Math.sin(p.x * scale1) * Math.sin(p.y * scale1) * Math.sin(p.z * scale1) * 0.25;
    const wave2 = Math.sin(p.x * scale2 + time) * Math.sin(p.y * scale2 + time) * Math.sin(p.z * scale2) * 0.15;
    
    // Base sphere plus wave deformation
    return lengthOfSegment([p.x, p.y, p.z]) - (0.6 + wave1 + wave2);
  };

  // Custom waveform for the lava effect
  const waveCrazy = (p, time) => {
    const wave = Math.sin(p.x * 3.0 + time) * Math.cos(p.y * 2.5 + time * 0.7) * Math.sin(p.z * 2.0 + time * 0.5);
    const wave2 = Math.cos(p.x * 4.0 + time * 0.6) * Math.sin(p.y * 3.5) * Math.sin(p.z * 3.0 + time * 0.8);
    return (wave + wave2) * 0.25;
  };

  function mix(x, y, a) {
    return x * (1 - a) + y * a;
  }

  // Main scene distance function
  const scene = (p, time) => {
    // Rotate the space
    const p1 = p;
    
    // Base shape modified by waves
    const scale = 4.0;
    // change the sphere radius you dummy
    const baseShape = lengthOfSegment([p1.x, p1.y, p1.z]) - 0.475;
    const waves = waveCrazy({
      x: p1.x * scale, y: p1.y * scale, z: p1.z * scale
    }, time) / scale;

    // Combine for final effect
    return mix(baseShape, waves, 0.5 + 0.5 * Math.sin(time / 5.0));
  };

  // Get normal for lighting calculations
  const getNormal = (p, time) => {
      const e = { x: 0.001, y: 0.0 };
      
      return normalize([
          scene({ x: p.x + e.x, y: p.y + e.y, z: p.z + e.y }, time)
        - scene({ x: p.x - e.x, y: p.y - e.y, z: p.z - e.y }, time),
          scene({ x: p.x + e.y, y: p.y + e.x, z: p.z + e.y }, time)
        - scene({ x: p.x - e.y, y: p.y - e.x, z: p.z - e.y }, time),
          scene({ x: p.x + e.y, y: p.y + e.y, z: p.z + e.x }, time)
        - scene({ x: p.x - e.y, y: p.y - e.y, z: p.z - e.x }, time)
      ]);
  }



  // Main shader function
  const f = (xyz, time) => {
    // Normalized coordinates
    let p = {
      x: (xyz[0] - 0.5 * whl[0]) / whl[0],
      y: (xyz[1] - 0.5 * whl[1]) / whl[1],
      z: (xyz[2] - 0.5 * whl[2]) / whl[2],
    };
   
    let hit = 0.0;
    
    // Get distance to the scene
    let d = scene(p, time);
    let norm = []

    if (d < 0.001) {
      hit = 1.0;
      norm = getNormal(p, time);
    }
    
    return { hit, norm };
  }

  let zs = [];
  let zs2 = [];
  for (let z = 0; z < whl[2]; z++) {
    let ys = [];
    let ys2 = [];
    zs.push(ys);
    zs2.push(ys2);
    for (let y = 0; y < whl[1]; y++) {
      let xs = []
      let xs2 = []
      ys.push(xs);
      ys2.push(xs2);
      for (let x = 0; x < whl[0]; x++) {
        const rgba_norm = f([x,y,z], 0);
        xs.push(rgba_norm.hit);
        xs2.push(rgba_norm.norm);

        cb({x,y,z}, rgba_norm);
      }
    }
  }
  return { hits: zs, norms: zs2 };
}


function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

// Note to Lee (themself): remember done() at the end these to fire the commands!
// This also means in callbacks, because the bridge won't know there are more
// commands to fire.
KittyCADBridge("api-65d79150-d400-448e-96f2-c0ac55edf144")
.then(() => KittyCADBridgeClient(4999))
.then((client) => {
  Object.assign(global, client);

  const { hits: fs, norms: ns } = sdfEval([80, 80, 80], (xyz, rgba) => {});


  let ps = [];
   for (let z = 1; z < 80 - 1; z++) {
     for (let y = 1; y < 80 - 1; y++) {
       for (let x = 1; x < 80 - 1; x++) {
         if (!(fs[z-0][y-0][x-1] == 1.0 && fs[z+0][y+0][x+1] == 1.0 
         &&  fs[z-0][y-1][x-0] == 1.0 && fs[z+0][y+1][x+0] == 1.0 
         &&  fs[z-1][y-0][x-0] == 1.0 && fs[z+1][y+0][x+0] == 1.0)
         && fs[z][y][x] == 1.0) {
           const axis = normalize(cross([0, 0, 1], ns[z][y][x]));
           const angleValue = Math.acos(dot([0, 0, 1], ns[z][y][x]));

           ps.push({
             translate: { x, y, z },
             rotation: {
               axis: { x: axis[0], y: axis[1], z: axis[2] },
               angle: {
                 unit: "radians",
                 value: angleValue,
               },
               origin: { type: "global" },
             }
           })
         }
       }
      }
  }

  const stamp = sphere({ x: 0, y: 0, z: 0 }, 1.0);
  done();

  entity_linear_pattern_transform({
    entity_id: stamp,
    transform: ps
  });
  done();

  zoom_to_fit({ animated: false, padding: 0, object_ids: [] });
  take_snapshot({ format: "png" });
  done();
});



