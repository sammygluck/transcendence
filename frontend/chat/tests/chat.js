document.addEventListener("DOMContentLoaded", async () => {
  const chatHeader = document.getElementById("chat-header");
  const chatContent = document.getElementById("chat-content");
  const userProfile = document.getElementById("user-profile");

  // Fetch user data from the server
  let userData;
  try {
    const response = await fetch("/currentuser", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch user data");
    }
    userData = await response.json();

    if (userData.friends) {
      const friendDetails = await Promise.all(
        JSON.parse(userData.friends).map(async (id) => {
          const friendResponse = await fetch(`/user/${id}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${localStorage.getItem("token")}`,
            },
          });
          if (!friendResponse.ok) {
            console.error(`Failed to fetch data for friend ID: ${friend.id}`);
            return { id: friend.id, username: "Unknown" };
          }
          return await friendResponse.json();
        })
      );
      userData.friends = friendDetails;
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    alert("Failed to load user data. Please try again later.");
    return;
  }

  // Initialize chat block
  function initializeChat() {
    userProfile.textContent = userData.username;
    userProfile.href = "#";
    userProfile.onclick = (e) => {
      e.preventDefault();
      loadProfile(userData.id, userData.username);
    };
    displayFriendsList();
  }

  // Reset header with optional back button, title, and link
  function resetHeader(backAction, username = userData.username, isLink = true) {
    chatHeader.innerHTML = "";
    if (backAction) {
      const backButton = document.createElement("button");
      backButton.textContent = "<";
      backButton.style.position = "absolute";
      backButton.style.left = "10px";
      backButton.onclick = backAction;
      chatHeader.appendChild(backButton);
    }
    const headerElement = createHeaderElement(username, isLink);
    chatHeader.appendChild(headerElement);
  }

  // Create a header element (link or plain text)
  function createHeaderElement(username, isLink) {
    if (isLink) {
      const link = document.createElement("a");
      link.href = "#";
      link.textContent = username;
      link.onclick = (e) => {
        e.preventDefault();
        loadProfile(userData.id, username);
      };
      return link;
    } else {
      const span = document.createElement("span");
      span.textContent = username;
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
    const searchBar = document.getElementById("search-bar");
    const friendList = document.getElementById("friend-list");

    searchBar.oninput = () => {
      const query = searchBar.value.toLowerCase();
      const matchingFriends = userData.friends.filter((friend) =>
        friend.username.toLowerCase().includes(query)
      );
      if (matchingFriends.length > 0) {
        updateFriendList(matchingFriends, friendList);
      } else {
        displayDummyFriend(searchBar.value, friendList);
      }
    };

    updateFriendList(userData.friends, friendList);
  }

  // Update the friend list dynamically
  function updateFriendList(friendsArray, friendListElement) {
    friendListElement.innerHTML = ""; // Clear the list

    friendsArray.forEach((friend) => {
      const friendElement = document.createElement("div");
      friendElement.className = "friend";
      friendElement.textContent = friend.username;
      friendElement.addEventListener("click", () => openChat(friend.username));
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
  function openChat(username) {
    resetHeader(displayFriendsList, username, true); // Update header with friend's username and profile link
    chatContent.textContent = `Chat with ${username}...`;
  }

  // Load profile into the chat container
  function loadProfile(userid, username) {
    resetHeader(displayFriendsList, username, false); // Update header with friend's username (no link)
    chatContent.textContent = `Loading profile for ${username}...`;

    // Fetch profile data from the server
    fetch(`/user/${userid}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch profile data");
        }
        return response.json();
      })
      .then((profileData) => {
        // Display profile data
        chatContent.innerHTML = `
          <h2>${profileData.username}</h2>
          <img src="${profileData.avatar || 'default-avatar.png'}" alt="Avatar" style="width: 100px; height: 100px; border-radius: 50%;">
          <p>Email: ${profileData.email}</p>
          <p>Friends: ${profileData.friends ? JSON.parse(profileData.friends).map(f => f).join(', ') : 'No friends yet'}</p>
          <p>Blocked Users: ${profileData.blocked_users ? JSON.parse(profileData.blocked_users).map(b => b).join(', ') : 'None'}</p>
        `;
      })
      .catch((error) => {
        console.error("Error loading profile:", error);
        chatContent.textContent = "Failed to load profile. Please try again later.";
      });
  }

  // Send friend request
  function sendFriendRequest(username) {
    fetch("/friend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ friendId: username }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to send friend request");
        }
        return response.json();
      })
      .then((data) => {
        alert(`Friend request sent to ${username}`);
      })
      .catch((error) => {
        console.error("Error sending friend request:", error);
        alert("Failed to send friend request. Please try again later.");
      });
  }

  initializeChat();
});


/*=== Live Chat ===*/
/*
 * Not yet tested or functional, just some mock code to show how it might look.
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize live chat functionality
  function initializeLiveChat() {
    const messageInput = document.getElementById("message-in");
    const sendButton = document.getElementById("send-button");
    const liveChatContent = document.getElementById("live-chat-content");
    // Function to send a message
    async function sendMessage() {
      const message = messageInput.value.trim();
      if (!message) return;
      try {
        const response = await fetch("/livechat/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ message }),
        });
        if (!response.ok) {
          throw new Error("Failed to send message");
        }
        const sentMessage = await response.json();
        displayMessage(sentMessage, "outgoing");
        messageInput.value = ""; // Clear input field
      } catch (error) {
        console.error("Error sending message:", error);
        alert("Failed to send message. Please try again.");
      }
    }
    // Function to display a message in the live chat
    function displayMessage(messageData, type) {
      const messageElement = document.createElement("div");
      messageElement.className = `message ${type}`;
      messageElement.textContent = `${type === "incoming" ? messageData.sender : "You"}: ${messageData.message}`;
      liveChatContent.insertBefore(messageElement, liveChatContent.firstChild);
    }
    // Function to fetch and display incoming messages
    async function fetchMessages() {
      try {
        const response = await fetch("/livechat/messages", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }
        const messages = await response.json();
        messages.forEach((msg) => displayMessage(msg, "incoming"));
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    }
    // Event listener for the send button
    sendButton.addEventListener("click", sendMessage);
    // Event listener for pressing Enter in the input field
    messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
      }
    });
    // Poll for new messages every 5 seconds
    setInterval(fetchMessages, 5000);
    // Initial fetch of messages
    fetchMessages();
  };

  initializeLiveChat();
});