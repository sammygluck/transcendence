import {userData, friendsList, fetchUserData} from "userdata.js";

const liveChatContent = document.getElementById("live-chat-content");
const LmessageIn = document.getElementById("live-message-in");
const LsendButton = document.getElementById("live-send-button");
const chatContent = document.getElementById("chat-content");
const messageIn = document.getElementById("message-in");
const sendButton = document.getElementById("send-button");

const userInfoStr = localStorage.getItem("userInfo");
if (!userInfoStr) {
	window.location.href = "/login";
}
const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
if (!userInfo) {
	window.location.href = "/login";
}
const ws = new WebSocket(
	`ws://${window.location.host}/chat?token=${userInfo.token}`
);

ws.onopen = () => {
    console.log("Connected to the server");
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

ws.onmessage = (event) => {
    const message = document.createElement("div");
    const parsedData = JSON.parse(event.data);
    if (parsedData.type === "public") {
        message.textContent = parsedData.message;
        liveChatContent.appendChild(message);
    } else if (parsedData.type === "private") {
        friendsList.forEach((friend) => {
            if (friend.id === parsedData.sendId) {
                const messageContent = parsedData.message;
                friend.message_history.push(messageContent);
            }
        });
    }
}

LsendButton.onclick = () => {
    const message = LmessageIn.value;
    ws.send(
        JSON.stringify({sendId: userInfo.id, message: message, destId: 0 })
    );
    LmessageIn.value = "";
}

LmessageIn.onkeydown = (event) => {
    if (event.key === "Enter") {
        const message = LmessageIn.value;
        ws.send(
            JSON.stringify({sendId: userInfo.id, message: message, destId: 0 })
        );
        LmessageIn.value = "";
    }
}