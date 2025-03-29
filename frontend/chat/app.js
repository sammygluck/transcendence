const userInfo = JSON.parse(localStorage.getItem("userInfo"));
if (!userInfo) {
	window.location.href = "/login";
}
const ws = new WebSocket(
	`ws://${window.location.host}/chat?token=${userInfo.token}`
);
const messages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

ws.onopen = () => {
	console.log("Connected to the server");
};

ws.onmessage = (event) => {
	const message = document.createElement("div");
	message.textContent = event.data;
	messages.appendChild(message);
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

sendButton.onclick = () => {
	const message = messageInput.value;
	ws.send(message);
	messageInput.value = "";
};
