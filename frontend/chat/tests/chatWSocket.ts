import {User, Friend, fetchUserData, addFriend} from "./userdata.js";

const LChatContent = document.getElementById("live-chat-content") as HTMLElement;
const LmessageIn = document.getElementById("live-message-in") as HTMLInputElement;
const LsendButton = document.getElementById("live-send-button") as HTMLButtonElement;

const friendChat = document.getElementById("friend-chat") as HTMLElement;
const chatContent = document.getElementById("chat-content") as HTMLElement;
const messageIn = document.getElementById("message-in") as HTMLInputElement;
const sendButton = document.getElementById("send-button") as HTMLButtonElement;

const backButton = document.getElementById("back-button") as HTMLButtonElement;
const userHeader = document.getElementById("user-header") as HTMLElement;
const friends = document.getElementById("friends") as HTMLElement;
const searchBar = document.getElementById("search-bar") as HTMLInputElement;
const friendList = document.getElementById("friend-list") as HTMLElement;

const contextMenu = document.getElementById("context-menu") as HTMLElement;
const viewProfile = document.getElementById("view-profile") as HTMLElement;
const inviteUser = document.getElementById("invite-user") as HTMLElement;

const userInfoStr = localStorage.getItem("userInfo");
if (!userInfoStr) {
	window.location.href = "/login";
}
const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
if (!userInfo) {
	window.location.href = "/login";
}
let currentUserData: User;
let selectedFriend: number = 0; // 0 means no friend selected, -1 is system
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
    if (JSON.parse(currentUserData.blocked_users).find(userId => userId === parsedData.sendId)) return;
    if (parsedData.type === "public") {
        message.textContent = parsedData.message;
        message.onclick = () => openProfile(parsedData.sendId);
        LChatContent.prepend(message);
    } else if (parsedData.type === "private") {
        const friend = currentUserData.friendlist.find(friend => friend.id === parsedData.sendId);
        if (friend) {
            const messageContent = parsedData.message;
            friend.chat_history?.push(messageContent);
            if (selectedFriend === friend.id) {
                loadChatHistory(friend.id);
            } else {
                friend.new_message = true;
                loadFriendList();
            }
        } else if (!friend) {
            const friend = currentUserData.friendlist.find(friend => friend.id === -1);
            console.log("UserId ", parsedData.sendId);
            friend.chat_history?.push(`${parsedData.sendId}` + "::" + parsedData.message);
            if (selectedFriend === friend.id) {
                loadSystemChat();
            } else {
                friend.new_message = true;
                loadFriendList();
            }
        }
    }
    else if (parsedData.type === "error"){
        const friend = currentUserData.friendlist.find(friend => friend.id === selectedFriend);
        if (friend){
            const messageContent = parsedData.message;
            friend.chat_history?.push(messageContent);
            if (selectedFriend === friend.id) {
                loadChatHistory(friend.id);
            }
        }
        else {
        message.textContent = parsedData.message;
        LChatContent.appendChild(message);
        }
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
        friend.chat_history = [];
    });
    currentUserData.friendlist.unshift({
        id: -1, // System ID
        username: "System",
        online: false,
        new_message: false,
        chat_history: []
    } as Friend); // Add system as first friend

    friendChat.style.display = "none";
    backButton.style.display = "none";
    friends.style.display = "block";
    updateCurrentUserData();
    updateChatHeader();
    displayFriendsList();
}

document.onclick = () => {
    contextMenu.style.display = "none";
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

backButton.onclick = () => {
    friendChat.style.display = "none";
    backButton.style.display = "none";
    friends.style.display = "block";

    selectedFriend = 0;
    updateChatHeader();
	displayFriendsList();
}

function updateChatHeader(userId: number = 0) {
    if (!userId) {
        userHeader.textContent = "Friends";
    }  else {
        userHeader.textContent = currentUserData.friendlist.find(friend => friend.id === userId)?.username || "Unknown";
        userHeader.onclick = () => openProfile(userId);
    }
}

function displayFriendsList() {

	searchBar.oninput = () => {
		const query = searchBar.value;
        if (query.length === 0){
            loadFriendList();
            return;
        }
		const matchingFriends = currentUserData.friendlist.filter(friend =>
			friend.username.includes(query)
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
        if (friend.id === -1) {
            const sysItem = document.createElement("div");
            sysItem.className = "friend";
            sysItem.textContent = "System";
            sysItem.style.fontWeight = friend.new_message ? "bold" : "normal";
            sysItem.onclick = () => openChat(friend.id);
            friendList.appendChild(sysItem);
        } else {
		    const friendItem = document.createElement("div");
            const statusIcon = document.createElement("span");
            statusIcon.classList.add(friend.online ? "online" : "offline");
		    friendItem.className = "friend";
		    friendItem.textContent = friend.username;
            friendItem.style.fontWeight = friend.new_message? "bold": "normal";
            friendItem.appendChild(statusIcon);
    	    friendItem.onclick = () => openChat(friend.id);
            friendItem.oncontextmenu = (event) => rclickMenu(event, friend.id);
    	    friendList.appendChild(friendItem);
        }
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

async function sendFriendRequest(username: string) {
    try {
        const response = await fetch(`/search/${username}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${userInfo.token}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Error searching for user: ${response.statusText}`);
        }
        const friendData = await response.json();
        addFriend(friendData[0].id);
    } catch (error) {
        alert("Failed to send friend request. Please try again later.");
    }
}

function rclickMenu(e, userId: number)
{
    e.preventDefault();
    contextMenu.style.display = "block";
    contextMenu.style.left = e.offsetX  + "px";
    contextMenu.style.top = (e.offsetY + 128) + "px";
    viewProfile.onclick = () => {
        openProfile(userId);
    }
    inviteUser.onclick = async () => {
        try {
            const response = await fetch(`/invitetournament`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${userInfo.token}`,
                    "Content-Type": "application/JSON",
                },
                body: JSON.stringify({id: userId}),
            });
            if (!response.ok)
                throw new Error(`Error invinting user: ${response.statusText}`);
        } catch (error){
            alert("Failed to send game invite. Please try again later.")
        }
    }
}

function openChat(friendId: number) {
    friends.style.display = "none";
    backButton.style.display = "block";
    friendChat.style.display = "flex";

    selectedFriend = friendId;
    updateChatHeader(friendId);
    if (friendId === -1) {
        messageIn.style.display = "none";
        sendButton.style.display = "none";
        loadSystemChat();
    } else {
        messageIn.style.display = "block";
        sendButton.style.display = "block";
        loadChatHistory(friendId);
    }
}

function loadChatHistory(friendId: number) {
    chatContent.innerHTML = ""; // Clear previous chat content
    chatContent.className = "chat-window";
    const friendData = currentUserData.friendlist.find(friend => friend.id === friendId);
    friendData.new_message = false;
    if (friendData.chat_history) {
        friendData.chat_history.forEach((message) => {
            const messageElement = document.createElement("div");
            messageElement.textContent = message;
            chatContent.prepend(messageElement);
        });
    } else {
        chatContent.textContent = "No chat history available";
    }
}

function loadSystemChat() {
    chatContent.innerHTML = ""; // Clear previous chat content
    chatContent.className = "chat-window";
    const systemData = currentUserData.friendlist.find(friend => friend.id === -1);
    systemData.new_message = false;
    if (systemData.chat_history) {
        systemData.chat_history.forEach((element) => {
            console.log("Element: ", element);
            const messageElement = document.createElement("div");
            const sendId = element.split("::")[0];
            const message = element.split("::")[1];
            messageElement.textContent = message;
            messageElement.onclick = () => openProfile(parseInt(sendId));
            chatContent.prepend(messageElement);
        });
    }
    else {
        chatContent.textContent = "No system messages available";
    }
}

/**
 * Updates the friends list every 30 seconds to check for new friends and their online status.
 * Updates UI if not in chat mode.
 */
function updateCurrentUserData(): void {
	setInterval(async () => {
		try {
			const updatedData = await fetchUserData(userInfo.id);
            updatedData.friendlist.unshift({id: -1, username: "System", online: false, new_message: false, chat_history: []} as Friend);
            updatedData.friendlist.forEach((friend: Friend) => {
                const existingFriend = currentUserData.friendlist.find(userId => userId.id === friend.id);
                if (existingFriend && existingFriend.chat_history)
                    friend.chat_history = existingFriend.chat_history;
            });
            currentUserData = updatedData;
		} catch (error) {
			console.error("Error updating friends list:", error);
		}
        if (selectedFriend === 0)
            displayFriendsList();
	}, 30000);
}

/*
 * Temporary functions
 */

function openProfile(friendId: number) {
    alert("Open profile for friend ID: " + friendId);
    console.log("Open profile for friend ID:", friendId);
}