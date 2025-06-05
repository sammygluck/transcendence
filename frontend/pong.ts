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
        // side collisions (left/right of the paddle)
        if (this.y + this.radius >= paddle.y && this.y - this.radius <= paddle.y + paddle.height)
        {
            const speed = Math.sqrt(this.speedX * this.speedX + this.speedY * this.speedY);

            // collision with left paddle
            if (this.speedX < 0 && this.x - this.radius <= paddle.x + paddle.width && this.x > paddle.x)
            {
                const offset = (this.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
                const angle = offset * Math.PI / 3;
                this.speedX = speed * Math.cos(angle);
                this.speedY = speed * Math.sin(angle);
            }
            // collision with right paddle
            else if (this.speedX > 0 && this.x + this.radius >= paddle.x && this.x < paddle.x + paddle.width)
            {
                const offset = (this.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
                const angle = offset * Math.PI / 3;
                this.speedX = -speed * Math.cos(angle);
                this.speedY = speed * Math.sin(angle);
            }
        }

        // collisions from top or bottom of the paddle
        if (this.x + this.radius >= paddle.x && this.x - this.radius <= paddle.x + paddle.width)
        {
            if (this.speedY > 0 && this.y - this.radius <= paddle.y && this.y > paddle.y)
            {
                this.speedY *= -1;
            }
            else if (this.speedY < 0 && this.y + this.radius >= paddle.y + paddle.height && this.y < paddle.y + paddle.height)
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
	prevTime: number;

    constructor(canvas: HTMLCanvasElement)
    {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!; //need explantion
        this.paddleLeft = new Paddle(1, 45 , 2, 10, 30);
        this.paddleRight = new Paddle(197, 45, 2, 10, 30);
        this.ball = new Ball(100, 50, 1, 30);
        this.scoreLeft = 0;
        this.scoreRight = 0;
		this.prevTime = 0;

        this.handleInput();
        this.loop(0);
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

    private loop(timestamp: number): void {
		if (timestamp - this.prevTime < 1000)
        	this.update(timestamp - this.prevTime);
        this.render();
		this.prevTime = timestamp;
        requestAnimationFrame((timestamp) => this.loop(timestamp));
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