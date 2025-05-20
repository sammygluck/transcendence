const liveChatContent = document.getElementById("live-chat-content");
const chatContent = document.getElementById("chat-content");
const messageIn = document.getElementById("message-in");
const sendBtn = document.getElementById("send-button");

const backButton = document.getElementById("back-button");
const searchBar = document.getElementById("search-bar");

const friendList = document.getElementById("friend-list");

backButton.onclick = function () {
	displayFriendsList();
}


function displayFriendsList() {
	backButton.style.display = "none";

	searchBar.oninput = () => {
		const query = searchBar.value.toLowerCase();
		const matchingFriends = updateUserData.friends.filter(friend =>
			friend.username.toLowerCase().includes(query)
		);
		if (!matchingFriends.length) {
			friendList.innerHTML = "<p>No friends found</p>"; // Change later to display dummy friend with option to send friend request
		} else {
			updateFriendList(matchingFriends);
		}
	}

	updateFriendList(); // Display all friends initially
}

function updateFriendList(friendsArray = NULL) {
	if (!friendsArray) {
		friendsArray = userData.friends;
	}
	friendList.innerHTML = ""; // Clear the list
	friendsArray.forEach((friend) => {
		const friendItem = document.createElement("div");
		friendItem.className = "friend";
		friendItem.textContent = friend.username;
    	friendItem.onclick = () => openChat(friend.id);
    	friendList.appendChild(friendItem);
	});
}