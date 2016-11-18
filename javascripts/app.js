'use strict';

const canvasEl = document.getElementById('canvas');
const ctx = canvasEl.getContext('2d');

function resetCanvas() {
  canvasEl.width = window.innerWidth;
  canvasEl.height = window.innerHeight;
}

window.onresize = function () {
  resetCanvas();
};

function drawHex({cx, cy, radius, color = '#fff', border = 1, angle = 0, hex = {}}) {
  if (angle !== 0) {
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
  }

  // draw hexagon
  ctx.beginPath();

  let r = radius - border / 2 - 1;

  // point A
  ctx.moveTo(cx + r, cy);
  let outerAngle = Math.PI;

  for (let i = 0; i < 5; i += 1) {
    outerAngle -= Math.PI / 3;

    let x = cx + (-1 * r * Math.cos(outerAngle));
    let y = cy + (r * Math.sin(outerAngle));
    ctx.lineTo(x, y);
  }

  ctx.closePath();

  ctx.strokeStyle = color;
  ctx.lineWidth = border;
  ctx.stroke();

  // let textToFill = `[x:${hex.cubeX},z:${hex.cubeZ},y:${hex.cubeY}]`;
  // let text = ctx.measureText(textToFill);
  // ctx.fillText(textToFill, cx - text.width / 2, cy);
  //
  // let text2ToFill = `${hex.index}`;
  // let text2 = ctx.measureText(text2ToFill);
  // ctx.fillText(text2ToFill, cx - text2.width / 2, cy+3);
}

function nextColor(withAlpha = true) {
  let randomHue = _.random(190, 360);
  let randomSat = _.random(44, 89);
  let randomLgt = _.random(19, 69);

  let alpha = 1;
  if (withAlpha) {
    alpha = _.random(0.01, 0.03, true)
  }

  return createjs.Graphics.getHSL(randomHue, randomSat, randomLgt, alpha);
}

function buildGrid(width, height, radius) {
  let d = 2 * radius;

  let rows = Math.floor(height / d) + 1;

  let cols = Math.floor(width / d) + 1;
  cols += Math.ceil(cols * radius / d);

  const grid = [];

  for (let ri = 0; ri < rows; ri += 1) {
    let hexY = ri * d;

    for (let ci = 0; ci < cols; ci += 1) {
      let hexX = ci * d;
      let cubeCoordinates = toCubeCoordinates(ci, ri);
      grid.push({
        x: hexX,
        y: hexY,
        cx: hexX + radius,
        cy: hexY + radius,
        col: ci,
        row: ri,
        cubeX: cubeCoordinates[0],
        cubeZ: cubeCoordinates[1],
        cubeY: cubeCoordinates[2],
        color: nextColor(true),
        radius: radius,
        border: _.random(1, radius / 4),
        cols: cols,
        rows: rows
      });
    }
  }

  return grid;
}

function configureGrid(grid = [], radius) {
  let r = Math.cos(Math.PI / 6) * radius;
  let radiusOffset = (radius - r) * 2;

  let step = Math.PI / 2;
  let curStep = 0;

  for (let i = 0; i < grid.length; i += 1) {
    let hex = grid[i];

    let verticalOffset = radiusOffset * hex.row;

    grid[i].cx = hex.cx - radius - (hex.col * (radius / 2));
    grid[i].cy = hex.cy - verticalOffset + r * (hex.col % 2);

    grid[i].clean = false;
    grid[i].index = i;

    curStep += step;
  }
  return grid;
}

function drawGrid(grid = [], angle) {
  for (let i = 0; i < grid.length; i += 1) {
    let hex = grid[i];
    //
    if (hex.clean) {
      continue;
    }
    // main hexagon
    drawHex({
      cx: hex.cx,
      cy: hex.cy,
      radius: hex.radius,
      color: hex.color,
      angle: angle,
      border: hex.border,
      hex
    });

    // nested hexagon
    drawHex({
      cx: hex.cx,
      cy: hex.cy,
      radius: _.random(3, hex.radius - 2),
      color: hex.color,
      angle: angle,
      border: _.random(1, hex.radius / 6)
    });

    hex.clean = true;
  }
}

function buildRandomPath(grid = [], length = 0) {
  let hexs = [_.random(0, grid.length - 1)];
  let root = grid[hexs[0]];
  let curTime = Date.now() + _.random(10, 20);

  root.time = curTime;
  root.color = nextColor(false);
  root.clean = false;

  let neighbour = root;
  let nsearches = [
    (x, y) => [x, y - 1],
    (x, y) => [x + 1, y - 1],
    (x, y) => [x + 1, y],
    (x, y) => [x, y + 1],
    (x, y) => [x - 1, y],
    (x, y) => [x - 1, y - 1]
  ];
  let getNeighbour = (hex) => {
    let next;
    let nextId;
    let tries = 0;
    while (true) {
      tries++;
      let [nextX, nextY] = nsearches[_.random(0, 5)](hex.col, hex.row);
      nextId = _.findIndex(grid, {row: nextY, col: nextX});
      if (nextId !== -1 && hexs.indexOf(nextId) === -1) {
        next = _.find(grid, {row: nextY, col: nextX});
        hexs.push(nextId);
        break;
      }
      if (tries === 6) {
        break;
      }
    }
    return next;
  };

  while (length-- > 0) {
    curTime += _.random(15, 25);

    neighbour = getNeighbour(neighbour);
    if (!neighbour) {
      break;
    }
    neighbour.time = curTime;
    neighbour.color = root.color;
  }
  return hexs;
}

function toCubeCoordinates(col, row) {
  // convert odd-q offset to cube
  let x = col;
  let z = row - (col - (col & 1)) / 2;
  let y = -x - z;
  return [x, z, y];
  // convert even-q offset to cube
  //let x = col;
  //let z = row - (col + (col & 1)) / 2;
  //let y = -x - z;
  //return [x, z, y];
}

function toOffsetCoordinates(x, z, y) {
  // convert cube to odd-q offset
  return [x, z + (x - (x & 1)) / 2];
  // convert cube to even-q offset
  // return [x, z + (x + (x & 1)) / 2];
}

function roundCubeCoordinates(x, z, y) {
  let rx = Math.round(x);
  let rz = Math.round(z);
  let ry = Math.round(y);

  let x_diff = Math.abs(rx - x);
  let z_diff = Math.abs(rz - z);
  let y_diff = Math.abs(ry - y);

  if (x_diff > y_diff && x_diff > z_diff) {
    rx = -ry - rz;
  } else if (y_diff > z_diff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return [rx, rz, ry];
}

function getPos(val) {
  if (val <= 33.34) {
    return 0;
  } else if (val > 33.34 && val < 66.67) {
    return 1;
  } else {
    return 2;
  }
}

function buildTreePath(grid = [], length = 10, timeDelta = Date.now()) {
  let curTime = timeDelta + _.random(10, 20);

  // let hexs = [{index: _.findIndex(grid, {col: 32, row: 0}), color: nextColor(false), time: curTime}];
  let hexColor = nextColor(false);
  let hexs = [{index: _.random(0, grid.length - 1), color: hexColor, time: curTime}];
  let root = grid[hexs[0].index];

  let posX = getPos(Math.ceil(root.col * 100 / root.cols));
  let posY = getPos(Math.ceil(root.row * 100 / root.rows));

  let posMatrix = [
    [[2], [2, 3, 4], [4]],
    [[0, 1, 2], [0, 1, 2, 3, 4, 5, 6, 7], [4, 5, 6]],
    [[0], [0, 7, 6], [6]]
  ];

  let directionsMap = posMatrix[posY][posX];

  let directions = [
    (x, z, y, distance) => [x + Math.floor(distance / 2), z - distance, y + Math.floor(distance / 2)],  // 0 right top direction
    (x, z, y, distance) => [x + distance, z - Math.floor(distance / 2), y - Math.floor(distance / 2)],  // 1 right
    (x, z, y, distance) => [x + Math.floor(distance / 2), z + Math.floor(distance / 2), y - distance],  // 2 right bottom direction
    (x, z, y, distance) => [x, z + distance, y - distance],                                             // 3 bottom direction
    (x, z, y, distance) => [x - Math.floor(distance / 2), z + distance, y - Math.floor(distance / 2)],  // 4 left bottom direction
    (x, z, y, distance) => [x - distance, z + Math.floor(distance / 2), y + Math.floor(distance / 2)],  // 5 left
    (x, z, y, distance) => [x - Math.floor(distance / 2), z - Math.floor(distance / 2), y + distance],  // 6 left top direction
    (x, z, y, distance) => [x, z - distance, y + distance]                                              // 7 top direction
  ];

  // let directionsNames = ['right top', 'right', 'right bottom', 'bottom', 'left bottom',  'left', 'left top', 'top'];

  function tree({rootHex, distance, time, direction, children = 2}) {
    // end building the tree
    if (distance <= 0 || !rootHex) {
      return;
    }

    let targetDistance = distance;
    let includeTarget = distance % 2 === 0;
    if (!includeTarget) {
      targetDistance += 1;
    }

    // calculate hex coordinates that is placed on `distance` from the root hex
    let directionFn = directions[direction];
    let [x, z, y] = directionFn(rootHex.cubeX, rootHex.cubeZ, rootHex.cubeY, targetDistance);

    // searching main target
    let targetHexIndex = _.findIndex(grid, {cubeX: x, cubeZ: z, cubeY: y});
    if (targetHexIndex === -1) {
      // console.warn('No such target found');
      return tree({rootHex: rootHex, distance: distance - 1, time, direction, children});
    }

    let targetHex;
    let curTime = time;

    for (let i = 1; i < distance + 1; i += 1) {
      curTime += _.random(25, 45);

      let t = 1.0 / targetDistance * i;
      let hx = rootHex.cubeX + (x - rootHex.cubeX) * t;
      let hz = rootHex.cubeZ + (z - rootHex.cubeZ) * t;
      let hy = rootHex.cubeY + (y - rootHex.cubeY) * t;

      [hx, hz, hy] = roundCubeCoordinates(hx, hz, hy);
      let hexIndex = _.findIndex(grid, {cubeX: hx, cubeZ: hz, cubeY: hy});
      if (hexIndex === -1) {
        //console.error('Alert! Possible bug', {cubeX: hx, cubeZ: hz, cubeY: hy});
        continue;
      }

      hexs.push({index: hexIndex, time: curTime, color: hexColor});

      // if distance is even number we need to get last hex in the line to make children branches
      if (i === distance && !includeTarget) {
        targetHex = grid[hexIndex];
      }
    }

    // if distance is odd number we should include last hex in results
    if (includeTarget) {
      targetHex = grid[targetHexIndex];
      hexs.push({index: targetHexIndex, color: hexColor, time: curTime + _.random(25, 45)});
    }

    let childDistance = Math.floor(distance - 2);
    if (childDistance <= 0) {
      // no need to traverse if no children to draw
      return;
    }
    for (let i = 0; i < children; i += 1) {
      let delta = Math.floor(i / 2);
      if (delta === 0) {
        delta = 1;
      }

      let dir = direction + delta >= directions.length ? (delta - (directions.length - direction)) % directions.length : direction + delta;
      if (i % 2 === 0) {
        dir = direction - delta < 0 ? (delta - (directions.length - direction)) % directions.length : direction - delta;
      }
      dir = Math.abs(dir);
      // if (dir === direction) {
      //   dir =+ 1;
      // }
      tree({
        rootHex: targetHex,
        distance: childDistance,
        direction: dir,
        time: curTime,
        children: 2
      });
    }
  }

  tree({
    rootHex: root,
    distance: length,
    time: curTime,
    direction: directionsMap[_.random(0, directionsMap.length - 1)],
    children: 2
  });

  return hexs;
}

function processTreePath(grid = [], hexPath = [], curTime) {
  for (let i = hexPath.length - 1; i >= 0; i -= 1) {
    let hexInfo = hexPath[i];
    let hex = grid[hexInfo.index];

    if (hexInfo.time < curTime) {
      hex.clean = false;
      hex.color = hexInfo.color;
      hexPath.splice(i, 1);
    }
  }
}

function init() {
  resetCanvas();

  const HEX_RADIUS = 10;
  const HEX_ANGLE = 0;

  let grid = buildGrid(canvasEl.width, canvasEl.height, HEX_RADIUS);
  window.grid = grid;
  configureGrid(grid, HEX_RADIUS);
  drawGrid(grid, HEX_ANGLE);

  let lastFadeTime = Date.now();
  let lastPick = Date.now();

  //let hexPath = buildRandomPath(grid, _.random(250, 300));
  let hexPath = buildTreePath(grid, _.random(10, 20), Date.now());

  createjs.Ticker.timingMode = createjs.Ticker.RAF;
  createjs.Ticker.on('tick', function (event) {
    let curTime = Date.now();

    // process path
    processTreePath(grid, hexPath, curTime);

    // each 450ms fade canvas
    if (curTime > lastFadeTime) {
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = createjs.Graphics.getHSL(0, 0, 100, 0.95);
      ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
      ctx.globalCompositeOperation = 'lighter';
      lastFadeTime = curTime + 250;
    }

    // when last path was built, create new one
    if (curTime > lastPick || !hexPath.length) {
      hexPath = buildTreePath(grid, _.random(6, 20), Date.now());
      lastPick = curTime + hexPath.length * 50;
    }
    drawGrid(grid, HEX_ANGLE);
  });
}
init();

