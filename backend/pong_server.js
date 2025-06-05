// all numbers are in % of screen height, if the aspect ratio is fixed to 2, this means that the x axis goes to 200%
var userInput;
(function (userInput) {
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
    move(duration) {
        this.y += this.dy * duration / 1000;
        if (this.y < 0) {
            this.y = 0;
        }
        else if (this.y + this.height > 100) {
            this.y = 100 - this.height;
        }
    }
    handleInput(command) {
        switch (command) {
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
    move(duration) {
        this.x += this.speedX * duration / 1000;
        this.y += this.speedY * duration / 1000;
        if ((this.y - this.radius <= 0 && this.speedY < 0) || (this.y + this.radius >= 100 && this.speedY > 0)) {
            this.speedY *= -1;
        }
    }
    checkCollision(paddle) {
        // side collisions (left/right of the paddle)
        if (this.y + this.radius >= paddle.y && this.y - this.radius <= paddle.y + paddle.height) {
            const speed = Math.sqrt(this.speedX * this.speedX + this.speedY * this.speedY);
            // collision with left paddle
            if (this.speedX < 0 && this.x - this.radius <= paddle.x + paddle.width && this.x > paddle.x) {
                const offset = (this.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
                const angle = offset * Math.PI / 3; // limit bounce angle
                this.speedX = speed * Math.cos(angle);
                this.speedY = speed * Math.sin(angle);
            }
            // collision with right paddle
            else if (this.speedX > 0 && this.x + this.radius >= paddle.x && this.x < paddle.x + paddle.width) {
                const offset = (this.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
                const angle = offset * Math.PI / 3;
                this.speedX = -speed * Math.cos(angle);
                this.speedY = speed * Math.sin(angle);
            }
        }
        // collisions from top or bottom of the paddle
        if (this.x + this.radius >= paddle.x && this.x - this.radius <= paddle.x + paddle.width) {
            if (this.speedY > 0 && this.y - this.radius <= paddle.y && this.y > paddle.y) {
                this.speedY *= -1;
            }
            else if (this.speedY < 0 && this.y + this.radius >= paddle.y + paddle.height && this.y < paddle.y + paddle.height) {
                this.speedY *= -1;
            }
        }
    }
    getPosition() {
        return { x: this.x, y: this.y };
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
    setIntervalId;
    websockets;
    constructor() {
        this.paddleLeft = new Paddle(1, 45, 2, 10, 30);
        this.paddleRight = new Paddle(197, 45, 2, 10, 30);
        this.ball = new Ball(100, 50, 1, 30);
        this.scoreLeft = 0;
        this.scoreRight = 0;
        this.prevTime = 0;
        this.setIntervalId = null;
        this.websockets = [];
        this.addSocket;
    }
    start() {
        // start the game loop
        this.setIntervalId = setInterval(() => this.loop(), 1000 / 60);
        this.prevTime = performance.now();
    }
    pause() {
        // stop the game loop
        if (this.setIntervalId !== null) {
            clearInterval(this.setIntervalId);
            this.setIntervalId = null;
        }
    }
    addSocket(ws) {
        this.websockets.push(ws);
        ws.onmessage = (event) => {
            const command = JSON.parse(event.data);
            //user should be verified to know which paddle to move -> this is done in the server code when connecting the websocket, user is added as socket.user
            if (ws.user.type === 'leftPaddle') {
                this.paddleLeft.handleInput(command.cmd);
            }
            else if (ws.user.type === 'rightPaddle') {
                this.paddleRight.handleInput(command.cmd);
            }
            else if (ws.user.type === 'both') {
                if (command.paddle === paddleSide.left)
                    this.paddleLeft.handleInput(command.cmd);
                else if (command.paddle === paddleSide.right)
                    this.paddleRight.handleInput(command.cmd);
            }
            else {
                console.log("Unknown user type:", ws.user.type);
            }
        };
        ws.onclose = () => {
            this.websockets = this.websockets.filter((w) => w !== ws);
            console.log("WebSocket closed:", ws.user.username);
        };
        ws.onerror = (event) => {
            console.error("WebSocket error observed:", event);
        };
        this.start();
    }
    loop() {
        const timestamp = performance.now();
        if (timestamp - this.prevTime < 1000)
            this.update(timestamp - this.prevTime);
        this.prevTime = timestamp;
        // send info over websocket
        this.send();
    }
    send() {
        if (this.websockets.length > 0) {
            const data = {
                paddleLeft: this.paddleLeft.y,
                paddleRight: this.paddleRight.y,
                ball: this.ball.getPosition(),
                scoreLeft: this.scoreLeft,
                scoreRight: this.scoreRight,
            };
            this.websockets.forEach((ws) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(data));
                }
            });
        }
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
}
const game = new Game();
module.exports = {
    game: game,
};
