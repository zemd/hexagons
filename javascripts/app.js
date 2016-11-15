const canvasEl = document.getElementById('canvas');
const ctx = canvasEl.getContext('2d');

function resetCanvas() {
  canvasEl.width = window.innerWidth;
  canvasEl.height = window.innerHeight;
}

window.onresize = function () {
  resetCanvas();
};

function drawHex({cx, cy, radius, color = '#fff', border = 1, angle=0}) {
  if (angle !== 0) {
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
  }
  
  // draw hexagon
  ctx.beginPath();
  
  let r = radius - border/2 - 1;
  
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
}

function nextColor(withAlpha = true) {
	let randomHue = _.random(190, 360);
  let randomSat = _.random(44 ,89);
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
      
      grid.push({
      	x: hexX,
        y: hexY,
        cx: hexX + radius,
        cy: hexY + radius,
        col: ci,
        row: ri,
        color: nextColor(true),
        radius: radius,
        border: _.random(1, radius / 4)
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
  
	for(let i = 0; i < grid.length; i += 1) {
    let hex = grid[i];
    
    let verticalOffset = radiusOffset * hex.row;

  	grid[i].cx = hex.cx - radius - (hex.col * (radius / 2));
    grid[i].cy = hex.cy - verticalOffset + r * (hex.col % 2);
    
    grid[i].clean = false;
    
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
      border: hex.border
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

function buildPath(grid = [], length = 0) {
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
    (x, y) => [x - 1, y-1]
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
  
	while(length-- > 0) {
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

function init() {
  resetCanvas();
  
  const HEX_RADIUS = 10;
  const HEX_ANGLE = 0;
  
  let grid = buildGrid(canvasEl.width, canvasEl.height, HEX_RADIUS);
  
  configureGrid(grid, HEX_RADIUS)
  drawGrid(grid, HEX_ANGLE);
  
  const hexs = [];
  let lastFadeTime = Date.now();
  let lastPick = Date.now();
  let hexPath = buildPath(grid, _.random(250, 300));
  createjs.Ticker.timingMode = createjs.Ticker.RAF;
  createjs.Ticker.on('tick', function (event) {
  	let curTime = Date.now();
    
    // process path
    for (let i = 0; i < hexPath.length; i += 1) {
    	if (!hexPath[i]) {continue;}
    	let hex = grid[hexPath[i]];
      if (hex.time < curTime) {
      	hex.clean = false;
        hexPath[i] = undefined;
      }
      if (i === hexPath.length - 1) {
      	lastPick = curTime + _.random(100, 150);
      }
    }
    
    // each 250ms fade canvas
    if (curTime > lastFadeTime) {
    	ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = createjs.Graphics.getHSL(0, 0, 100, 0.95);
      ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
      ctx.globalCompositeOperation = 'lighter';
    	lastFadeTime = curTime + 450;
    }
    
    // when last path was built, create new one
    if (curTime > lastPick) {
    	hexPath = buildPath(grid, _.random(250, 300));
			lastPick = curTime + hexPath.length * 50;
    }
    drawGrid(grid, HEX_ANGLE);
  });
}
init();

