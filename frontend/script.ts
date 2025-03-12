//TODO: add collision detection with players


//INFO:
//border does not matter if in pixels or % of screen, because it is not included in the y position of players and circle. What about player thickness, keep in pixels?


//interfaces
interface Player {
	x: number; // pixels (left side)
	y: number; // % of screen height (top of player)
	moving: number; // 1, 0 or -1
}

interface Circle {
	x: number; // % of screen
	y: number; // % of screen
	dx: number; //(dx, dy) = direction unit vector
	dy: number;
}

interface GameData {
	circleRadius: number, // % of screen height
	objectSpeed: number,
	playerSpeed: number, // % of screen height per sec
	circleSpeed: number, // % of screen per sec
	aspectRatio: number, // width/height
	borderThickness: number,
	playerHeight: number, // % of screen height
	playerWidth: number,  // pixels
	playerColor: string,
	circleColor: string,
	prevTime: number,
	player1: Player,
	player2: Player,
	circle: Circle,
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
}

//variables
// some variables need to be global for event listeners (resize, keydown, keyup) to work, also for requestAnimationFrame() -> everything global?
// point (0, 0) is top left corner of canvas
const playerWidth = 15; // pixels
const playerHeight = 15; // % of screen height
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const navbarHeight = 0; // document.getElementById("navbar").offsetHeight;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

const player1: Player = {
	x: 0, // pixels
	y: 50 - playerHeight / 2, // % of screen height
	moving: 0, // 1, 0 or -1
};

const player2: Player = {
	x: canvas.width - playerWidth, // pixels
	y: 50 - playerHeight / 2, // % of screen height
	moving: 0, // 1, 0 or -1
};

const circle: Circle = {
	x: 10, // % of screen
	y: 10, // % of screen
	dx: 0.5, //(dx, dy) = direction unit vector
	dy: 0.5,
};

const gameData: GameData = {
	circleRadius: 2, // % of screen height
	objectSpeed: 1,
	playerSpeed: 30, // % of screen height per sec
	circleSpeed: 15, // % of screen per sec
	aspectRatio: 2, // width/height
	borderThickness: 15, // pixels	
	playerHeight: playerHeight,	// % of screen height
	playerWidth: playerWidth, //pixels
	playerColor: "white",
	circleColor: "white",
	prevTime: 0,
	player1: player1,
	player2: player2,
	circle: circle,
	canvas: canvas,
	ctx: ctx,
};

//functions
function setCanvasSize(canvas: HTMLCanvasElement, window: Window, navbarHeight: number): void {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight - navbarHeight;
}

function movePlayer(player: Player, duration: number, gameData: GameData): void {
	// x and y coordinates are % of available screen space (top of player)
	player.y += ((gameData.playerSpeed * duration) / 1000) * player.moving;
	if (player.y < 0) 
		player.y = 0;
	else if (player.y > 100 - gameData.playerHeight)
		player.y = 100 - gameData.playerHeight; 
}

function moveCircle(circle: Circle, duration: number, gameData: GameData): void {
	// x and y coordinates are % of available screen space
	circle.x += ((gameData.circleSpeed * duration) / 1000) * circle.dx;
	circle.y += ((gameData.circleSpeed * duration) / 1000) * circle.dy;
	// add code here to detect borders or players, change direction of movement on collision
	 if ((circle.y - gameData.circleRadius < 0 && circle.dy < 0) || (circle.y + gameData.circleRadius > 100 && circle.dy > 0)) {
		circle.dy = -circle.dy;
	}
	if ((circle.x - gameData.circleRadius / gameData.aspectRatio < 0 && circle.dx < 0) || (circle.x + gameData.circleRadius / gameData.aspectRatio > 100 && circle.dx > 0)) {
		circle.dx = -circle.dx;
	}
}

function drawStaticElements(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, borderThickness: number): void {
	ctx.strokeStyle = "white";
	ctx.lineWidth = borderThickness;
	ctx.setLineDash([]);
	ctx.beginPath();
	ctx.moveTo(0, borderThickness / 2);
	ctx.lineTo(canvas.width, borderThickness / 2);
	ctx.moveTo(0, canvas.height - borderThickness / 2);
	ctx.lineTo(canvas.width, canvas.height - borderThickness / 2);
	ctx.stroke();
	ctx.lineWidth = 15;
	ctx.beginPath();
	ctx.setLineDash([5, 15]);
	ctx.moveTo(canvas.width / 2, 0);
	ctx.lineTo(canvas.width / 2, canvas.height);
	ctx.stroke();
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, gameData: GameData): void {
	// x and y input coordinates are % of available screen space
	ctx.fillStyle = gameData.playerColor;
	let totalHeight = gameData.canvas.height - 2 * gameData.borderThickness;
	let y = player.y / 100 * totalHeight; // percentage to pixels
	ctx.fillRect(player.x, y + gameData.borderThickness, gameData.playerWidth, gameData.playerHeight / 100 * totalHeight);
}

function drawCircle(ctx: CanvasRenderingContext2D, circle: Circle, gameData: GameData): void {
	// x and y input coordinates are % of available screen space
	let x = (circle.x / 100) * (gameData.canvas.width - 2 * gameData.playerWidth); // percentage to pixels
	let y = (circle.y / 100) * (gameData.canvas.height - 2 * gameData.borderThickness); // percentage to pixels
	ctx.fillStyle = gameData.circleColor;
	ctx.beginPath();
	ctx.arc(x + gameData.playerWidth, y + gameData.borderThickness, gameData.circleRadius / 100 * gameData.canvas.height, 0, 2 * Math.PI);
	ctx.fill();
}

//resize screen
function resizeGame(): void {
	setCanvasSize(canvas, window, navbarHeight);
	if (canvas.width / canvas.height < gameData.aspectRatio) {
		canvas.height = canvas.width / gameData.aspectRatio;
	} else {
		canvas.width = canvas.height * gameData.aspectRatio;
	}
	player2.x = gameData.canvas.width - gameData.playerWidth;
}

// speed depends on refresh rate with requestAnimationFrame -> use timestamp to calculate distance
//https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
function refreshGame(timestamp: number): void {
	if (gameData.prevTime == 0) {
		gameData.prevTime = timestamp;
	}
	movePlayer(player1, timestamp - gameData.prevTime, gameData);
	movePlayer(player2, timestamp - gameData.prevTime, gameData);
	moveCircle(circle, timestamp - gameData.prevTime, gameData);
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	drawStaticElements(ctx, canvas, gameData.borderThickness);
	drawPlayer(ctx, player1, gameData);
	drawPlayer(ctx, player2, gameData);
	drawCircle(ctx, circle, gameData);
	gameData.prevTime = timestamp;
	requestAnimationFrame(refreshGame);
}

//keyboard input: calculate distance inside refreshGame instead of here, increase pos as long as key is pressed
function keyDown(event: KeyboardEvent): void {
	if (event.key == "z") {
		player1.moving = -1; // negative y direction
	} else if (event.key == "s") {
		player1.moving = 1;
	} else if (event.key == "ArrowUp") {
		player2.moving = -1; // negative y direction
	} else if (event.key == "ArrowDown") {
		player2.moving = 1;
	}
}

function keyUp(event: KeyboardEvent): void {
	if (event.key == "z" && player1.moving < 0) {
		player1.moving = 0;
	} else if (event.key == "s" && player1.moving > 0) {
		player1.moving = 0;
	} else if (event.key == "ArrowUp" && player2.moving < 0) {
		player2.moving = 0;
	} else if (event.key == "ArrowDown" && player2.moving > 0) {
		player2.moving = 0;
	}
}


// main code
//execute functions
setCanvasSize(canvas, window, navbarHeight);
resizeGame();
//calculateLimits();
requestAnimationFrame(refreshGame);

// event listeners
window.addEventListener("resize", resizeGame);
document.addEventListener("keydown", keyDown); // any key on keyboard pressed
document.addEventListener("keyup", keyUp); // any key on keyboard released



