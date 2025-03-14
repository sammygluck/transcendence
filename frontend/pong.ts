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

    move(canvasHeight: number): void 
    {
        if (this.y + this.dy >= 0 && this.y + this.height + this.dy <= canvasHeight)
        {
            this.y += this.dy;
        }
    }

    draw(ctx: CanvasRenderingContext2D): void
    {
        ctx.fillStyle = "white";
        ctx.fillRect(this.x, this.y, this.width, this.height)
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

    move(canvasWidth: number, canvasHeight: number): void
    {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.y - this.radius <= 0 || this.y + this.radius >= canvasHeight)
        {
            this.speedY *= -1;
        }
    }

    checkCollision(paddle: Paddle): void
    {
        if ( this.x - this.radius <= paddle.x + paddle.width && this.x + this.radius >= paddle.x &&
            this.y >= paddle.y && this.y <= paddle.y + paddle.height )
        {
            this.speedX *= -1;
        }
    }

    draw(ctx: CanvasRenderingContext2D): void
    {
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
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
        this.paddleLeft = new Paddle(10, canvas.height / 2 - 40, 10, 80, 5);
        this.paddleRight = new Paddle(canvas.width - 20, canvas.height / 2 - 40, 10, 80, 5);
        this.ball = new Ball(canvas.width / 2, canvas.height / 2, 8, 3);
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
            if (e.key === "w" || e.key === "s") this.paddleLeft.dy = 0;
            if (e.key === "ArrowUp" || e.key === "ArrowDown") this.paddleRight.dy = 0;
        })
    }

    private loop(): void {
        this.update();
        this.render();
        requestAnimationFrame(() => this.loop());
    }

    private update(): void {
        this.paddleLeft.move(this.canvas.height);
        this.paddleRight.move(this.canvas.height);
        this.ball.move(this.canvas.width, this.canvas.height);
        this.ball.checkCollision(this.paddleLeft);
        this.ball.checkCollision(this.paddleRight);

        if (this.ball.x < 0)
        {
            this.scoreRight++;
            this.resetBall();
        }
        else if (this.ball.x > this.canvas.width)
        {
            this.scoreLeft++;
            this.resetBall();
        }
    }

    private resetBall(): void
    {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        this.ball.speedX = -this.ball.speedX;
    }

    private render(): void
    {
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.paddleLeft.draw(this.ctx);
        this.paddleRight.draw(this.ctx);
        this.ball.draw(this.ctx);

        this.ctx.fillStyle = "white";
        this.ctx.font = "20px Arial";
        this.ctx.fillText(`${this.scoreLeft} - ${this.scoreRight}`, this.canvas.width / 2 - 20, 30);
    }
}

const canvas = document.getElementById("pongCanvas") as HTMLCanvasElement;
canvas.width = 800;
canvas.height = 400;
new Game(canvas);