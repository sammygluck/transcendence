interface User {
	id: number;
	username: string;
	email: string;
	created_at: string;
	updated_at: string;
	blocked_users: string[] | null;	//Change to number[] later
	friends: string[] | null; 		//Change to number[] later
	avatar: string | null;
    online: boolean;
}

interface Friend {
	id: number;
	username: string;
	online: boolean;
	message_history: string[] | null;
}

let currentUser: User | null = null;
let friendsList: Friend[] = [];

/**
 * Fetches the current user's data and their friends' online status.
 */
export async function fetchCurrentUserData(): Promise<void> {
	try {
		// Fetch current user data
		const userResponse = await fetch("/currentuser", {
			method: "GET",
			headers: {
				Authorization: `Bearer ${localStorage.getItem("token")}`,
			},
		});
		if (!userResponse.ok) {
			throw new Error(`Error fetching current user: ${userResponse.statusText}`);
		}
		currentUser = await userResponse.json();

		// Fetch friends' data
		if (currentUser && currentUser.friends) {
			const friendsPromises = currentUser.friends.map(async (friendId) => {
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
			friendsList = await Promise.all(friendsPromises);
		} else {
			friendsList = [];
		}
		console.log("Current user data fetched:", currentUser);
		console.log("Friends list updated:", friendsList);
	} catch (error) {
		console.error("Error fetching current user data:", error);
	}
}

/**
 * Updates the friends list every 10 seconds to check for new friends and their online status.
 */
export function updateUserData(): void {
	setInterval(async () => {
		try {
			await fetchCurrentUserData();
		} catch (error) {
			console.error("Error updating friends list:", error);
		}
	}, 10000);
}