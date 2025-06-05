class Paddle {
    x;
    y;
    width;
    height;
    speed;
    dy;
    constructor(x, y, width, height, speed) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.dy = 0;
    }
    move(duration) {
        this.y += this.dy * duration / 1000;
        if (this.y < 0) {
            this.y = 0;
        }
        else if (this.y + this.height > 100) {
            this.y = 100 - this.height;
        }
    }
    draw(ctx, canvasHeight) {
        let scaleFactor = canvasHeight / 100;
        ctx.fillStyle = "white";
        ctx.fillRect(this.x * scaleFactor, this.y * scaleFactor, this.width * scaleFactor, this.height * scaleFactor);
    }
}
class Ball {
    x;
    y;
    radius;
    speedX;
    speedY;
    prevX;
    constructor(x, y, radius, speed) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.speedX = speed;
        this.speedY = speed;
        this.prevX = x;
    }
    move(duration) {
        this.prevX = this.x;
        this.x += this.speedX * duration / 1000;
        this.y += this.speedY * duration / 1000;
        if ((this.y - this.radius <= 0 && this.speedY < 0) || (this.y + this.radius >= 100 && this.speedY > 0)) {
            this.speedY *= -1;
        }
    }
    checkCollision(paddle) {
        if (this.y < paddle.y || this.y > paddle.y + paddle.height)
            return;
        if (this.speedX < 0 && paddle.x < 50) {
            const edge = paddle.x + paddle.width;
            if (this.prevX - this.radius > edge && this.x - this.radius <= edge) {
                this.x = edge + this.radius;
                this.speedX *= -1;
            }
        }
        else if (this.speedX > 0 && paddle.x > 50) {
            const edge = paddle.x;
            if (this.prevX + this.radius < edge && this.x + this.radius >= edge) {
                this.x = edge - this.radius;
                this.speedX *= -1;
            }
        }
    }
    draw(ctx, canvasHeight) {
        let scaleFactor = canvasHeight / 100;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(this.x * scaleFactor, this.y * scaleFactor, this.radius * scaleFactor, 0, Math.PI * 2);
        ctx.fill();
    }
}
class Game {
    canvas;
    ctx;
    paddleLeft;
    paddleRight;
    ball;
    scoreLeft;
    scoreRight;
    prevTime;
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.paddleLeft = new Paddle(1, 45, 2, 10, 30);
        this.paddleRight = new Paddle(197, 45, 2, 10, 30);
        this.ball = new Ball(100, 50, 1, 30);
        this.scoreLeft = 0;
        this.scoreRight = 0;
        this.prevTime = 0;
        this.handleInput();
        this.loop(0);
    }
    handleInput() {
        window.addEventListener("keydown", (e) => {
            if (e.key === "w")
                this.paddleLeft.dy = -this.paddleLeft.speed;
            if (e.key === "s")
                this.paddleLeft.dy = this.paddleLeft.speed;
            if (e.key === "ArrowUp")
                this.paddleRight.dy = -this.paddleRight.speed;
            if (e.key === "ArrowDown")
                this.paddleRight.dy = this.paddleRight.speed;
        });
        window.addEventListener("keyup", (e) => {
            if (e.key === "w" && this.paddleLeft.dy < 0)
                this.paddleLeft.dy = 0;
            if (e.key === "s" && this.paddleLeft.dy > 0)
                this.paddleLeft.dy = 0;
            if (e.key === "ArrowUp" && this.paddleRight.dy < 0)
                this.paddleRight.dy = 0;
            if (e.key === "ArrowDown" && this.paddleRight.dy > 0)
                this.paddleRight.dy = 0;
        });
    }
    loop(timestamp) {
        if (timestamp - this.prevTime < 1000)
            this.update(timestamp - this.prevTime);
        this.render();
        this.prevTime = timestamp;
        requestAnimationFrame((timestamp) => this.loop(timestamp));
    }
    update(duration) {
        this.paddleLeft.move(duration);
        this.paddleRight.move(duration);
        this.ball.move(duration);
        this.ball.checkCollision(this.paddleLeft);
        this.ball.checkCollision(this.paddleRight);
        if (this.ball.x < 0) {
            this.scoreRight++;
            this.resetBall();
        }
        else if (this.ball.x > 200) {
            this.scoreLeft++;
            this.resetBall();
        }
    }
    resetBall() {
        this.ball.x = 100;
        this.ball.y = 50;
        this.ball.speedX = -this.ball.speedX;
    }
    render() {
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
const canvas = document.getElementById("pongCanvas");
canvas.width = 800;
canvas.height = 400;
new Game(canvas);
