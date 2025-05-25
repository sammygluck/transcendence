import { openProfile } from "../profile.js";

let __CURRENT_USER_ID = null;
window.__CURRENT_USER_ID = null;
(async () => {
   /* Pull token from the userInfo blob and expose it */
   const buf = localStorage.getItem("userInfo");
   if (!buf) { window.location.href = "/login"; return; }
   const userInfo = JSON.parse(buf);
   localStorage.setItem("token", userInfo.token);          // <-- make profile.js happy

   const me = await fetch("/currentuser", {
     headers: { Authorization:`Bearer ${userInfo.token}` } // use the fresh token
   }).then(r=>r.json()).catch(()=>null);
   if (!me) { window.location.href = "/login"; return; }
   __CURRENT_USER_ID = window.__CURRENT_USER_ID = me.id;
})();

document.body.addEventListener("click", e => {
	const t = e.target.closest(".view-profile");
	if (!t) return;

	// parse & validate
	const raw = t.dataset.userid;
	const userId = parseInt(raw, 10);
	if (Number.isNaN(userId)) {
	console.warn("view-profile clicked but data-userid is invalid:", raw);
		return;
	}
	
		openProfile(userId);
	});

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
const messages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const userIdDestination = document.getElementById("userIdDestination");

ws.onopen = () => {
	console.log("Connected to the server");
};

ws.onmessage = (event) => {
	const message = document.createElement("div");
	message.textContent = JSON.parse(event.data).message;
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
	ws.send(
		JSON.stringify({ message: message, userId: userIdDestination.value })
	);
	messageInput.value = "";
};
messageInput.onkeydown = (event) => {
	if (event.key === "Enter") {
		const message = messageInput.value;
		ws.send(
			JSON.stringify({ message: message, userId: userIdDestination.value })
		);
		messageInput.value = "";
	}
};
