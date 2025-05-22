export interface User {
	id: number;
	username: string;
	email: string;
	created_at: string;
	updated_at: string;
	blocked_users: string[] | null;	//Change to number[] later
	friends: string[] | null; 		//Change to number[] later
	friendlist: Friend[];
	avatar: string | null;
    online: boolean;
}

export interface Friend {
	id: number;
	username: string;
	online: boolean;
	message_history?: string[];
}


/**
 * Fetches the user's data and their friends' username, chat history and online status.
 */
export async function fetchUserData(userID: number): Promise<User | null> {
	try {
		// Fetch current user data
		const userResponse = await fetch(`/user/${userID}`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${localStorage.getItem("token")}`,
			},
		});
		if (!userResponse.ok) {
			throw new Error(`Error fetching user: ${userResponse.statusText}`);
		}
		const userData : User = await userResponse.json();

		// Fetch friends' data
		if (userData && userData.friends) {
			const friendsPromises = userData.friends.map(async (friendId) => {
				const friendResponse = await fetch(`/user/${friendId}`, {
					method: "GET",
					headers: {
						Authorization: `Bearer ${localStorage.getItem("token")}`,
					},
				});
				if (!friendResponse.ok) {
					throw new Error(
						`Error fetching friend ${friendId}: ${friendResponse.statusText}`
					);
				}
				const friendData = await friendResponse.json();
				return {
					id: friendData.id,
					username: friendData.username,
					online: friendData.online,
				};
			});
			userData.friendlist = await Promise.all(friendsPromises);
		} else if (!userData.friends) {
			// If no friends, initialize friendlist as an empty array
			userData.friendlist = [];
		}
		console.log("UserID ",userID," data fetched:", userData);
		console.log("Friends list updated:", userData.friendlist);
		return userData;
	} catch (error) {
		console.error("Error fetching user data:", error);
		alert("Failed to load user data. Please try again later.");
	}
	return null; 
}


const userInfoStr = localStorage.getItem("userInfo");
if (!userInfoStr) {
	window.location.href = "/login";
}
const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
if (!userInfo) {
	window.location.href = "/login";
}

/**
 * Updates the friends list every 10 seconds to check for new friends and their online status.
 */
export function updateCurrentUserData(): void {
	setInterval(async () => {
		try {
			await fetchUserData(userInfo.id);
		} catch (error) {
			console.error("Error updating friends list:", error);
		}
	}, 10000);
}