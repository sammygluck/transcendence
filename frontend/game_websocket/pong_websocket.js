// all numbers are in % of screen height, if the aspect ratio is fixed to 2, this means that the x axis goes to 200%
var userInput;
(function (userInput) {
    userInput[userInput["unknown"] = 0] = "unknown";
    userInput[userInput["moveUpStart"] = 1] = "moveUpStart";
    userInput[userInput["moveUpEnd"] = 2] = "moveUpEnd";
    userInput[userInput["moveDownStart"] = 3] = "moveDownStart";
    userInput[userInput["moveDownEnd"] = 4] = "moveDownEnd";
})(userInput || (userInput = {}));
var paddleSide;
(function (paddleSide) {
    paddleSide[paddleSide["unknown"] = 0] = "unknown";
    paddleSide[paddleSide["left"] = 1] = "left";
    paddleSide[paddleSide["right"] = 2] = "right";
})(paddleSide || (paddleSide = {}));
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
    constructor(x, y, radius, speed) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.speedX = speed;
        this.speedY = speed;
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
    ws;
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d"); //need explantion
        this.paddleLeft = new Paddle(1, 45, 2, 10, 30);
        this.paddleRight = new Paddle(197, 45, 2, 10, 30);
        this.ball = new Ball(100, 50, 1, 30);
        this.scoreLeft = 0;
        this.scoreRight = 0;
        this.ws = null;
        this.handleInput();
    }
    connectWebSocket() {
        const userInfoStr = localStorage.getItem("userInfo");
        if (!userInfoStr) {
            window.location.href = "/login";
        }
        const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
        if (!userInfo) {
            window.location.href = "/login";
        }
        const ws = new WebSocket(`ws://${window.location.host}/game?token=${userInfo.token}`);
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
            }
            else if (e.code === 4001) {
                console.log("Invalid token");
            }
            else {
                console.log("Disconnected from the server");
            }
        };
        this.ws = ws;
    }
    handleInput() {
        window.addEventListener("keydown", (e) => {
            let input = userInput.unknown;
            let paddle = paddleSide.unknown;
            if (e.key === "w") {
                input = userInput.moveUpStart;
                paddle = paddleSide.left;
            }
            if (e.key === "s") {
                input = userInput.moveDownStart;
                paddle = paddleSide.left;
            }
            if (e.key === "ArrowUp") {
                input = userInput.moveUpStart;
                paddle = paddleSide.right;
            }
            if (e.key === "ArrowDown") {
                input = userInput.moveDownStart;
                paddle = paddleSide.right;
            }
            // send the input to the server
            if (this.ws && this.ws.readyState === WebSocket.OPEN && input !== userInput.unknown) {
                this.ws.send(JSON.stringify({ cmd: input,
                    paddle: paddle,
                }));
            }
        });
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
            if (this.ws && this.ws.readyState === WebSocket.OPEN && input !== userInput.unknown) {
                this.ws.send(JSON.stringify({ cmd: input, paddle }));
            }
        });
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
const game = new Game(canvas);
game.connectWebSocket();
