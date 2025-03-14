// all numbers are in % of screen height, if the aspect ratio is fixed to 2, this means that the x axis goes to 200%

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

    move(): void 
    {
        if (this.y + this.dy >= 0 && this.y + this.height + this.dy <= 100)
        {
            this.y += this.dy;
        }
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

    move(): void
    {
        this.x += this.speedX;
        this.y += this.speedY;

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

		// with the code below, the ball was sticking to the paddle sometimes
		/*
        if ( this.x - this.radius <= paddle.x + paddle.width && this.x + this.radius >= paddle.x &&
            this.y >= paddle.y && this.y <= paddle.y + paddle.height )
        {
            this.speedX *= -1;
        }
			*/
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

    constructor(canvas: HTMLCanvasElement)
    {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!; //need explantion
        this.paddleLeft = new Paddle(1, 45 , 2, 10, 1);
        this.paddleRight = new Paddle(197, 45, 2, 10, 1);
        this.ball = new Ball(100, 50, 1, 0.5);
        this.scoreLeft = 0;
        this.scoreRight = 0;

        this.handleInput();
        this.loop();
    }

    private handleInput(): void {
        window.addEventListener("keydown", (e) => {
            if (e.key === "w") this.paddleLeft.dy = -this.paddleLeft.speed;
            if (e.key === "s") this.paddleLeft.dy = this.paddleLeft.speed;
            if (e.key === "ArrowUp") this.paddleRight.dy = -this.paddleRight.speed;
            if (e.key === "ArrowDown") this.paddleRight.dy = this.paddleRight.speed;
        })

        window.addEventListener("keyup", (e) => {
            if (e.key === "w" && this.paddleLeft.dy < 0) this.paddleLeft.dy = 0;
            if (e.key === "s" && this.paddleLeft.dy > 0) this.paddleLeft.dy = 0;
            if (e.key === "ArrowUp" && this.paddleRight.dy < 0 ) this.paddleRight.dy = 0;
            if (e.key === "ArrowDown" && this.paddleRight.dy > 0 ) this.paddleRight.dy = 0;
        })
    }

    private loop(): void {
        this.update();
        this.render();
        requestAnimationFrame(() => this.loop());
    }

    private update(): void {
        this.paddleLeft.move();
        this.paddleRight.move();
        this.ball.move();
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
new Game(canvas);