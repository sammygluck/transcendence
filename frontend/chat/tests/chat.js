document.addEventListener("DOMContentLoaded", () => {
  const chatHeader = document.getElementById("chat-header");
  const chatContent = document.getElementById("chat-content");
  const userProfile = document.getElementById("user-profile");

  // Mock data
  const userData = {
    username: "YourUsername",
    profileLink: "/profile/yourusername",
    friends: [
      { username: "Friend1", profileLink: "/profile/friend1" },
      { username: "Friend2", profileLink: "/profile/friend2" },
    ],
  };

  // Initialize chat block
  function initializeChat() {
    userProfile.textContent = userData.username;
    userProfile.href = "#";
    userProfile.onclick = (e) => {
      e.preventDefault();
      loadProfile(userData.profileLink, userData.username);
    };
    displayFriendsList();
  }

  // Reset header with optional back button, title, and link
  function resetHeader(backAction, title = userData.username, link = userData.profileLink, isLink = true) {
    chatHeader.innerHTML = "";
    if (backAction) {
      const backButton = document.createElement("button");
      backButton.textContent = "<";
      backButton.style.position = "absolute";
      backButton.style.left = "10px";
      backButton.onclick = backAction;
      chatHeader.appendChild(backButton);
    }
    const headerElement = createHeaderElement(title, link, isLink);
    chatHeader.appendChild(headerElement);
  }

  // Create a header element (link or plain text)
  function createHeaderElement(text, href, isLink) {
    if (isLink) {
      const link = document.createElement("a");
      link.href = "#";
      link.textContent = text;
      link.onclick = (e) => {
        e.preventDefault();
        loadProfile(href, text);
      };
      return link;
    } else {
      const span = document.createElement("span");
      span.textContent = text;
      return span;
    }
  }

  // Display the friends list
  function displayFriendsList() {
    resetHeader(); // Reset header without back button
    chatContent.innerHTML = `
      <input id="search-bar" type="text" placeholder="Search friends..." style="width: 100%; margin-bottom: 10px;" />
      <div id="friend-list"></div>
    `;
    const newSearchBar = document.getElementById("search-bar");
    const newFriendList = document.getElementById("friend-list");

    newSearchBar.oninput = () => {
      const query = newSearchBar.value.toLowerCase();
      const matchingFriends = userData.friends.filter((friend) =>
        friend.username.toLowerCase().includes(query)
      );
      if (matchingFriends.length > 0) {
        updateFriendList(matchingFriends, newFriendList);
      } else {
        displayDummyFriend(newSearchBar.value, newFriendList);
      }
    };

    updateFriendList(userData.friends, newFriendList);
  }

  // Update the friend list dynamically
  function updateFriendList(friends, friendListElement) {
    friendListElement.innerHTML = ""; // Clear the list

    friends.forEach((friend) => {
      const friendElement = document.createElement("div");
      friendElement.className = "friend";
      friendElement.textContent = friend.username;
      friendElement.addEventListener("click", () => openChat(friend.username, friend.profileLink));
      friendListElement.appendChild(friendElement);
    });
  }

  // Display a dummy friend with a "Send Friend Request" button
  function displayDummyFriend(username, friendListElement) {
    friendListElement.innerHTML = `
      <div class="friend" style="position: relative;">
        ${username}
        <button style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%);" onclick="sendFriendRequest('${username}')">
          Send Friend Request
        </button>
      </div>
    `;
  }

  // Open chat with a friend
  function openChat(username, profileLink) {
    resetHeader(displayFriendsList, username, profileLink, true); // Update header with friend's username and profile link
    chatContent.innerHTML = `<p>Chat with ${username}...</p>`;
  }

  // Load profile into the chat container
  function loadProfile(profileLink, username) {
    resetHeader(displayFriendsList, username, null, false); // Update header with friend's username (no link)
    chatContent.innerHTML = `<p>Loading profile from ${profileLink}...</p>`;
    setTimeout(() => {
      chatContent.innerHTML = `<p>Profile content for ${username}</p>`;
    }, 1000);
  }

  // Send friend request (mock function)
  function sendFriendRequest(username) {
    alert(`Friend request sent to ${username}`);
  }

  initializeChat();
});