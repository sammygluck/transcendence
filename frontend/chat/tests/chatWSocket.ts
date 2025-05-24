import { parse } from "path";
import {User, Friend, fetchUserData, updateCurrentUserData} from "./userdata.js";

const LChatContent = document.getElementById("live-chat-content") as HTMLElement;
const LmessageIn = document.getElementById("live-message-in") as HTMLInputElement;
const LsendButton = document.getElementById("live-send-button") as HTMLButtonElement;

const chatContent = document.getElementById("chat-content") as HTMLElement;
const messageIn = document.getElementById("message-in") as HTMLInputElement;
const sendButton = document.getElementById("send-button") as HTMLButtonElement;

const backButton = document.getElementById("back-button") as HTMLButtonElement;
const userHeader = document.getElementById("user-header") as HTMLElement;
const friends = document.getElementById("friends") as HTMLElement;
const searchBar = document.getElementById("search-bar") as HTMLInputElement;
const friendList = document.getElementById("friend-list") as HTMLElement;

const userInfoStr = localStorage.getItem("userInfo");
if (!userInfoStr) {
	window.location.href = "/login";
}
const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
if (!userInfo) {
	window.location.href = "/login";
}
let currentUserData: User;
let selectedFriend: number = 0;
initializeChat();

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
        message.onclick = () => openProfile(parsedData.sendId);
        LChatContent.appendChild(message);
    } else if (parsedData.type === "private") {
        currentUserData.friendlist.forEach((friend: Friend) => {
            if (friend.id === parsedData.sendId) {
                const messageContent = parsedData.message;
                friend.message_history?.push(messageContent);
            }
        });
    }
}

async function initializeChat(): Promise<void> {
    try {
        const fetchedData = await fetchUserData(userInfo.id);
        if (!fetchedData) {
            throw Error("Failed to fetch user data");
        }
        currentUserData = fetchedData;
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
    currentUserData.friendlist.forEach((friend: Friend) => {
        friend.message_history = [];
    });
    chatContent.style.display = "none";
    backButton.style.display = "none";
    friends.style.display = "block";
    updateCurrentUserData();
    updateChatHeader();
    displayFriendsList();
}

LsendButton.onclick = () => {
    const message = LmessageIn.value;
    if (message)
        ws.send(JSON.stringify({sendId: userInfo.id, message: message, destId: 0 }));
    LmessageIn.value = "";
}

LmessageIn.onkeydown = (event) => {
    if (event.key === "Enter") {
        const message = LmessageIn.value;
        if (message)
            ws.send(JSON.stringify({sendId: userInfo.id, message: message, destId: 0 }));
        LmessageIn.value = "";
    }
}

sendButton.onclick = () => {
    const message = messageIn.value;
    if (message)
        ws.send(JSON.stringify({sendId: userInfo.id, message: message, destId: selectedFriend }));
    messageIn.value = "";
}

messageIn.onkeydown = (event) => {
    if (event.key === "Enter") {
        const message = messageIn.value;
        if (message)
            ws.send(JSON.stringify({sendId: userInfo.id, message: message, destId: selectedFriend }));
        messageIn.value = "";
    }
}

backButton.onclick = function () {
    chatContent.style.display = "none";
    backButton.style.display = "none";
    friends.style.display = "block";

    selectedFriend = 0;
    updateChatHeader();
	displayFriendsList();
}

function updateChatHeader(userId: number = 0) {
    if (!userId) {
        userId = currentUserData.id;
        userHeader.textContent = currentUserData.username;
        userHeader.onclick = () => openProfile(userId);
    }  else {
        userHeader.textContent = currentUserData.friendlist.find(friend => friend.id === userId)?.username || "Unknown";
        userHeader.onclick = () => openProfile(userId);
    }
}

function displayFriendsList() {

	searchBar.oninput = () => {
		const query = searchBar.value.toLowerCase();
        if (query.length === 0){
            loadFriendList();
            return;
        }
		const matchingFriends = currentUserData.friendlist.filter(friend =>
			friend.username.toLowerCase().includes(query)
		);
		if (!matchingFriends.length) {
			displayDummy(query);
        } else {
			loadFriendList(matchingFriends);
		}
	}

	loadFriendList(); // Display all friends initially
}

function loadFriendList(friendsArray: Friend[] | null = null) {
	if (!friendsArray)
		friendsArray = currentUserData.friendlist;

	friendList.innerHTML = ""; // Clear the list
	friendsArray.forEach((friend) => {
		const friendItem = document.createElement("div");
		friendItem.className = "friend";
		friendItem.textContent = friend.username;
    	friendItem.onclick = () => openChat(friend.id);
    	friendList.appendChild(friendItem);
	});
}

function displayDummy(username: string) {
    friendList.innerHTML = "";
    const dummy = document.createElement("div");
    dummy.className = "friend";
    dummy.textContent = username;

    const sendReq = document.createElement("button");
    sendReq.textContent = "Send Friend Request";
    sendReq.onclick = () => sendFriendRequest(username);

    dummy.appendChild(sendReq);
    friendList.appendChild(dummy);
}

function openChat(friendId: number) {
    friends.style.display = "none";
    backButton.style.display = "block";
    chatContent.style.display = "block";

    selectedFriend = friendId;
    updateChatHeader(friendId);
    loadChatHistory(friendId);
}

function loadChatHistory(friendId: number) {
    chatContent.innerHTML = ""; // Clear previous chat content
    const chatHistory = currentUserData.friendlist.find(friend => friend.id === friendId)?.message_history;
    if (chatHistory) {
        chatHistory.forEach((message) => {
            const messageElement = document.createElement("div");
            messageElement.textContent = message;
            chatContent.appendChild(messageElement);
        });
    } else {
        chatContent.innerHTML = "<p>No chat history available</p>";
    }
}

/*
 * Temporary functions
 */

function openProfile(friendId: number) {
    alert("Open profile for friend ID: " + friendId);
    console.log("Open profile for friend ID:", friendId);
}

function sendFriendRequest(username: string) {
    alert("Send friend request to username: " + username);
    console.log("Send friend request to username:", username);
}