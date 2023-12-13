const fs = require("node:fs");
const { mat4, vec3 } = require("gl-matrix");
const hull = require("hull.js");

// Derived from
// Ax + By + Cz - D = 0 representing a 2d plane in 3d space
// and { x = x0 + at, y = y0 + bt, z = z0 + ct }
// t varies the point on the line.
// So what we're doing is finding a t, that gives us
// a point that lies on the plane, which would equal 0.
// If we find a t, then we just get calculate the point
// on the line as you normally would.
const linePlaneIntersection = (line, plane) => {
  const directionVector = [
    line.end[0] - line.start[0],
    line.end[1] - line.start[1],
    line.end[2] - line.start[2],
  ];

  const denominator = 
    (plane.normal[0] * directionVector[0]) +
    (plane.normal[1] * directionVector[1]) +
    (plane.normal[2] * directionVector[2]);

  if (denominator == 0) return undefined;

  const t = (
    -(plane.normal[0] * line.start[0]) +
    -(plane.normal[1] * line.start[1]) +
    -(plane.normal[2] * line.start[2]) +
    plane.offset
  ) / denominator;

  return [
    line.start[0] + directionVector[0] * t,
    line.start[1] + directionVector[1] * t,
    line.start[2] + directionVector[2] * t,
  ];
};

// Should equal [ 2.25, 2.625, 3 ]
// console.log(
//   linePlaneIntersection(
//     { start: [0, 0, 0], end: [6, 7, 8] },
//     { normal: [0, 0, 1], offset: 3 },
//   )
// );

const readObjFile = (filepath) => {
  const text = fs.readFileSync(filepath, "utf8");

  const lines = text.split("\n");

  const vs = [];
  const ts = [];

  for (let line of lines) {
    const fields = line.split(" ");
    switch(fields[0]) {
      case "#": continue;
      case "v": {
        vs.push(vec3.fromValues(parseFloat(fields[1]), parseFloat(fields[2]), parseFloat(fields[3])));
        break;
      }
      case "f": {
        // Obj file faces are indexed starting from 1. wowza
        ts.push([parseInt(fields[1]) - 1, parseInt(fields[2]) - 1, parseInt(fields[3]) - 1]);
        break;
      }
    }
  }

  return ({ vertices: vs, triangles: ts });
};
module.exports.readObjFile = readObjFile;

const inlineXYZForTri = (abc, verts) => {
  return [verts[abc[0]], verts[abc[1]], verts[abc[2]]];
};

module.exports.inlineXYZForTri = inlineXYZForTri;

const centroid = (abc) => {
  return vec3.fromValues(
    (abc[0][0] + abc[1][0] + abc[2][0]) / 3,
    (abc[0][1] + abc[1][1] + abc[2][1]) / 3,
    (abc[0][2] + abc[1][2] + abc[2][2]) / 3,
  );
};

const normalOfTri = (abc) => {
  const v1 = vec3.subtract(vec3.create(), abc[1], abc[0]);
  const v2 = vec3.subtract(vec3.create(), abc[2], abc[0]);
  const normal = vec3.create();
  vec3.cross(normal, v1, v2);
  vec3.normalize(normal, normal);
  return normal;
};

// Stuff needed to recreate the model in KittyCAD space
// { centroid, normal, abcIn2d }

// Originally I tried to do this with nothing but plain js, but it was eating
// a lot of the spare time I had. I also don't intuitively understand every
// single calculation / transform yet, which doesn't help :'). I'm in the
// middle of studying linear alg. again so soon enough I will!
// 
// Thank you ChatGPT for the help and saving me a lot of time
const angleBetweenVectors = (v1, v2) => {
  return Math.acos(vec3.dot(v1, v2) / (vec3.length(v1) * vec3.length(v2)));
};

const toPlanes = (filepath) => {
  const model = readObjFile(filepath);
  const modelAsPlanes = model.triangles.map((t) => {
     // console.log(t);
     let ti_ = inlineXYZForTri(t, model.vertices);
     // console.log(ti);
    //const ti = t;

    // Just to keep track of the normal before everything.
    const n = normalOfTri(ti_);

    const c = centroid(ti_);
    // Center triangle to origin
    let ti = ti_.map((p) => vec3.sub(vec3.create(), p, c));

    // We need to rotate points one axis at a time.
    // I'm just starting with Y because of how I was testing earlier in dev.
    let m4;

    const n1 = normalOfTri(ti);
    const up1 = vec3.cross(vec3.create(), n1, [0, 1, 0]);
    const angleY = angleBetweenVectors(up1, [1, 0, 0]);
    m4 = mat4.create();
    mat4.fromYRotation(m4, angleY);
    ti = ti.map((p) => vec3.transformMat4(vec3.create(), p, m4));

    const n2 = normalOfTri(ti);
    const up2 = vec3.cross(vec3.create(), n2, [1, 0, 0]);
    const angleX = angleBetweenVectors(up2, [0, 1, 0]);
    m4 = mat4.create();
    mat4.fromXRotation(m4, angleX);
    ti = ti.map((p) => vec3.transformMat4(vec3.create(), p, m4));
    
    //console.log((angleX / (Math.PI * 2)) * 360, (angleY / (Math.PI * 2)) * 360);

    // rotateXY(ti, angleX, angleY);

    //console.log(ti);

    const abcIn2d = [
      [ti[0][0], ti[0][1]],
      [ti[1][0], ti[1][1]],
      [ti[2][0], ti[2][1]],
    ];

    return {
      centroid: c,
      angles: [angleX, angleY],
      tri: ti_,
      normal: n,
      up: up1,
      abcIn2d
    };
  });

  return modelAsPlanes;
};

module.exports.toPlanes = toPlanes;

const distance = (p1, p2) => Math.sqrt(
  (p1[0] - p2[0])**2 + 
  (p1[1] - p2[1])**2 + 
  (p1[2] - p2[2])**2
);

const nearestNeighbor = (pc, ps) => {
  let minDist = null;
  let nearest = null;
  let idx = 0;
  for (let i = 0; i < ps.length; i+=1) {
    const p = ps[i];
    const d = distance(pc, p);
    if (minDist == null) { minDist = d; nearest = p; idx = i;}
    else if (d < minDist) { minDist = d; nearest = p; idx = i;}
  }
  return [nearest, idx];
};

const toSlices = (filepath, height) => {
  const model = readObjFile(filepath);
  const slices = [];

  // get the highest, lowest points of model
  const lowest = model.triangles.reduce((h, t) => {
    const ti = inlineXYZForTri(t, model.vertices);

    // find the lowest z of the 3 points
    const a = ti[0][2];
    const b = ti[1][2];
    const c = ti[2][2];

    const l = a < b ? a : b;
    const l2 = l < c ? l : c;
    return h == null
      ? l2
      : l2 < h ? l2 : h;
  }, null);

  const highest = model.triangles.reduce((h, t) => {
    const ti = inlineXYZForTri(t, model.vertices);

    // find the lowest z of the 3 points
    const a = ti[0][2];
    const b = ti[1][2];
    const c = ti[2][2];

    const l = a > b ? a : b;
    const l2 = l > c ? l : c;
    return h == null
      ? l2
      : l2 > h ? l2 : h;
  }, null);

  // start plane at lowest
  // increase plane until at highest
  for (let z = lowest; z < highest; z += height) {
    // at each plane, try to intersect all triangles
    let ints = [];
    model.triangles.forEach((t) => {
      const ti = inlineXYZForTri(t, model.vertices);
      const pt1 = linePlaneIntersection(
       { start: ti[0], end: ti[1] },
       { normal: [0, 0, 1], offset: z },
      );
      if (pt1) { if (pt1.length > 1) { ints.push([pt1[0], pt1[1]]); }}
      const pt2 = linePlaneIntersection(
       { start: ti[1], end: ti[2] },
       { normal: [0, 0, 1], offset: z },
      );
      if (pt2) { if (pt2.length > 1) {  ints.push([pt2[0], pt2[1]]);} }
      const pt3 = linePlaneIntersection(
       { start: ti[0], end: ti[2] },
       { normal: [0, 0, 1], offset: z },
      );
      if (pt3) { if (pt3.length > 1) {  ints.push([pt3[0], pt3[1]]); } }
    });

    // sort by convex hull
    const ich = hull(ints);
   
    // collect all intersection points at each plane
    slices.push(ich);
  }

  return {
    items: slices,
    height,
    lowest,
    highest,
  };
};

module.exports.toSlices = toSlices;

