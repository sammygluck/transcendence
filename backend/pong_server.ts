// all numbers are in % of screen height, if the aspect ratio is fixed to 2, this means that the x axis goes to 200%

enum userInput {
	moveUpStart = 1,
	moveUpEnd = 2,
	moveDownStart = 3,
	moveDownEnd = 4,
}

enum paddleSide {
	unknown = 0,
	left = 1,
	right = 2,
}

interface user {
	type: string;
	username: string;
	email: string;
	id: string;
}

class Paddle {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    dy: number;

    constructor(x: number, y: number, width: number, height: number, speed: number){
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.dy = 0;
    }

    move(duration: number): void 
    {
        this.y += this.dy * duration / 1000;
		if (this.y < 0)
		{
			this.y = 0;
		}
		else if (this.y + this.height > 100)
		{
			this.y = 100 - this.height;
		}
    }

	handleInput(command: userInput): void
	{
		switch (command)
		{
			case userInput.moveUpStart:
				this.dy = -this.speed;
				break;
			case userInput.moveUpEnd:
				if (this.dy < 0)
					this.dy = 0;
				break;
			case userInput.moveDownEnd:
				if (this.dy > 0)
					this.dy = 0;
				break;
			case userInput.moveDownStart:
				this.dy = this.speed;
				break;
		}
	}
}

class Ball {
    x: number;
    y: number;
    radius: number;
    speedX: number;
    speedY: number;

    constructor(x: number, y: number, radius: number, speed: number)
    {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.speedX = speed;
        this.speedY = speed;
    }

    move(duration: number): void
    {
        this.x += this.speedX * duration / 1000;
        this.y += this.speedY * duration / 1000;

        if ((this.y - this.radius <= 0 && this.speedY < 0) || (this.y + this.radius >= 100 && this.speedY > 0))
        {
            this.speedY *= -1;
        }
    }

    checkCollision(paddle: Paddle): void
    {
		// we may have to add collision detection with the top and bottom of the paddle

		// y direction
		if (this.y >= paddle.y && this.y <= paddle.y + paddle.height)
		{
			// x direction left paddle
			if (this.speedX < 0 && paddle.x < 50 && this.x - this.radius <= paddle.x + paddle.width)
			{
				this.speedX *= -1;
			}
			// x direction right paddle
			else if (this.speedX > 0 && paddle.x > 50 && this.x + this.radius >= paddle.x)
			{
				this.speedX *= -1;
			}
		}
    }

	getPosition(): { x: number, y: number } {
		return { x: this.x, y: this.y };
	}
}

class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    paddleLeft: Paddle;
    paddleRight: Paddle;
    ball: Ball;
    scoreLeft: number;
    scoreRight: number;
	prevTime: number;
	setIntervalId: NodeJS.Timeout | null;
	websockets: ( WebSocket & {user: user})[];

    constructor()
    {
        this.paddleLeft = new Paddle(1, 45 , 2, 10, 30);
        this.paddleRight = new Paddle(197, 45, 2, 10, 30);
        this.ball = new Ball(100, 50, 1, 30);
        this.scoreLeft = 0;
        this.scoreRight = 0;
		this.prevTime = 0;
		this.setIntervalId = null;
		this.websockets = [];
		this.addSocket;
    }

	start(): void
	{
		// start the game loop
		this.setIntervalId = setInterval(() => this.loop(), 1000 / 60);
		this.prevTime = performance.now();
	}

	pause(): void
	{
		// stop the game loop
		if (this.setIntervalId !== null)
		{
			clearInterval(this.setIntervalId);
			this.setIntervalId = null;
		}
	}

	addSocket(ws: WebSocket & {user: user}): void
	{
		this.websockets.push(ws);
		ws.onmessage = (event) => {
			const command = JSON.parse(event.data);
			//user should be verified to know which paddle to move -> this is done in the server code when connecting the websocket, user is added as socket.user
			if (ws.user.type === 'leftPaddle')
			{
				this.paddleLeft.handleInput(command.cmd);
			}
			else if (ws.user.type === 'rightPaddle')
			{
				this.paddleRight.handleInput(command.cmd);
			}
			else if (ws.user.type === 'both')
			{
				if (command.paddle === paddleSide.left)
					this.paddleLeft.handleInput(command.cmd);
				else if (command.paddle === paddleSide.right)
					this.paddleRight.handleInput(command.cmd);
			}
			else
			{
				console.log("Unknown user type:", ws.user.type);
			}
		};
		ws.onclose = () => {
			this.websockets = this.websockets.filter((w) => w !== ws);
			console.log("WebSocket closed:", ws.user.username);
		}
		ws.onerror = (event) => {
			console.error("WebSocket error observed:", event);
		}
		this.start();
	}

    private loop(): void {
		const timestamp = performance.now();
		if (timestamp - this.prevTime < 1000)
        	this.update(timestamp - this.prevTime);
		this.prevTime = timestamp;
		// send info over websocket
		this.send();
    }

	private send(): void
	{
		if (this.websockets.length > 0)
		{
			const data = {
				paddleLeft: this.paddleLeft.y,
				paddleRight: this.paddleRight.y,
				ball: this.ball.getPosition(),
				scoreLeft: this.scoreLeft,
				scoreRight: this.scoreRight,
			};
			this.websockets.forEach((ws) => {
				if (ws.readyState === WebSocket.OPEN)
				{
					ws.send(JSON.stringify(data));
				}
			});
		}
	}


    private update(duration: number): void {
        this.paddleLeft.move(duration);
        this.paddleRight.move(duration);
        this.ball.move(duration);
        this.ball.checkCollision(this.paddleLeft);
        this.ball.checkCollision(this.paddleRight);

        if (this.ball.x < 0)
        {
            this.scoreRight++;
            this.resetBall();
        }
        else if (this.ball.x > 200)
        {
            this.scoreLeft++;
            this.resetBall();
        }
    }

    private resetBall(): void
    {
        this.ball.x = 100;
        this.ball.y = 50;
        this.ball.speedX = -this.ball.speedX;
    }
}

const game = new Game();

module.exports = {
	game: game,
};