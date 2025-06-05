// all numbers are in % of screen height, if the aspect ratio is fixed to 2, this means that the x axis goes to 200%
const MAX_BOUNCE_ANGLE = 75 * Math.PI / 180;

enum userInput {
	unknown = 0,
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
    

    draw(ctx: CanvasRenderingContext2D, canvasHeight: number): void
    {
		let scaleFactor = canvasHeight / 100;
        ctx.fillStyle = "white";
        ctx.fillRect(this.x * scaleFactor, this.y * scaleFactor, this.width * scaleFactor, this.height * scaleFactor);
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

    checkCollision(paddle: Paddle): void
    {
        const verticalOverlap = this.y + this.radius >= paddle.y && this.y - this.radius <= paddle.y + paddle.height;
        const horizontalOverlap = this.x + this.radius >= paddle.x && this.x - this.radius <= paddle.x + paddle.width;

        if (verticalOverlap)
        {
            if ((this.speedX < 0 && paddle.x < 50 && this.x - this.radius <= paddle.x + paddle.width) ||
                (this.speedX > 0 && paddle.x > 50 && this.x + this.radius >= paddle.x))
            {
                const relativeIntersectY = this.y - (paddle.y + paddle.height / 2);
                const normalized = relativeIntersectY / (paddle.height / 2);
                const angle = normalized * MAX_BOUNCE_ANGLE;
                const speed = Math.hypot(this.speedX, this.speedY);
                const direction = paddle.x < 50 ? 1 : -1;
                this.speedX = speed * Math.cos(angle) * direction;
                this.speedY = speed * Math.sin(angle);
                return;
            }
        }

        if (horizontalOverlap)
        {
            if (this.speedY > 0 && this.y - this.radius <= paddle.y)
            {
                this.speedY *= -1;
            }
            else if (this.speedY < 0 && this.y + this.radius >= paddle.y + paddle.height)
            {
                this.speedY *= -1;
            }
        }
    }



    draw(ctx: CanvasRenderingContext2D, canvasHeight: number): void
    {
		let scaleFactor = canvasHeight / 100;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(this.x * scaleFactor, this.y * scaleFactor, this.radius * scaleFactor, 0, Math.PI * 2);
        ctx.fill();
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
	ws: WebSocket | null;

    constructor(canvas: HTMLCanvasElement)
    {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!; //need explantion
        this.paddleLeft = new Paddle(1, 45 , 2, 10, 30);
        this.paddleRight = new Paddle(197, 45, 2, 10, 30);
        this.ball = new Ball(100, 50, 1, 30);
        this.scoreLeft = 0;
        this.scoreRight = 0;
		this.ws = null;
        this.handleInput();
    }

	connectWebSocket(): void
	{
		const userInfoStr = localStorage.getItem("userInfo");
		if (!userInfoStr) {
			window.location.href = "/login";
		}
		const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
		if (!userInfo) {
			window.location.href = "/login";
		}
		const ws = new WebSocket(
			`ws://${window.location.host}/game?token=${userInfo.token}`
		);

		ws.onopen = () => {
			console.log("Connected to the server");
			this.render();
		};

		ws.onmessage = (event) => {
			const message = JSON.parse(event.data);
			this.paddleLeft.y = message.paddleLeft;
			this.paddleRight.y = message.paddleRight;
			this.ball.x = message.ball.x;
			this.ball.y = message.ball.y;
			this.scoreLeft = message.scoreLeft;
			this.scoreRight = message.scoreRight;
			this.render();
		};

		ws.onerror = (error) => {
			console.error("WebSocket error:", error);
		};

		ws.onclose = (e) => {
			if (e.code === 4000) {
				console.log("No token provided");
			} else if (e.code === 4001) {
				console.log("Invalid token");
			} else {
				console.log("Disconnected from the server");
			}
		};
		this.ws = ws;
	}

    private handleInput(): void {
        window.addEventListener("keydown", (e) => {
			let input = userInput.unknown;
			let paddle = paddleSide.unknown;
            if (e.key === "w"){
				input = userInput.moveUpStart;
				paddle = paddleSide.left;
			} 
			if (e.key === "s"){
				input = userInput.moveDownStart;
				paddle = paddleSide.left;
			}
            if (e.key === "ArrowUp"){
				input = userInput.moveUpStart;
				paddle = paddleSide.right;
			}
            if (e.key === "ArrowDown") {
				input = userInput.moveDownStart;
				paddle = paddleSide.right;
			}
			// send the input to the server
			if (this.ws && this.ws.readyState === WebSocket.OPEN && input !== userInput.unknown)
			{
				this.ws.send(JSON.stringify(
					{ cmd: input,
					paddle: paddle,
				 }));
			}
        })

        window.addEventListener("keyup", (e) => {
			let input = userInput.unknown;
			let paddle = paddleSide.unknown;
            if (e.key === "w") {
				input = userInput.moveUpEnd;
				paddle = paddleSide.left;
			}
			if (e.key === "s") {
				input = userInput.moveDownEnd;
				paddle = paddleSide.left;
			}
            if (e.key === "ArrowUp") {
				input = userInput.moveUpEnd;
				paddle = paddleSide.right;
			}
			if (e.key === "ArrowDown") {
				input = userInput.moveDownEnd;
				paddle = paddleSide.right;
			}
			// send the input to the server
			if (this.ws && this.ws.readyState === WebSocket.OPEN && input !== userInput.unknown)
			{
				this.ws.send(JSON.stringify({ cmd: input, paddle}));
			}
        })

    }

    private render(): void
    {
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.paddleLeft.draw(this.ctx, this.canvas.height);
        this.paddleRight.draw(this.ctx, this.canvas.height);
        this.ball.draw(this.ctx, this.canvas.height);

        this.ctx.fillStyle = "white";
        this.ctx.font = "20px Arial";
        this.ctx.fillText(`${this.scoreLeft} - ${this.scoreRight}`, this.canvas.width / 2 - 20, 30);
    }
}

const canvas = document.getElementById("pongCanvas") as HTMLCanvasElement;
canvas.width = 800;
canvas.height = 400;
const game = new Game(canvas);
game.connectWebSocket();