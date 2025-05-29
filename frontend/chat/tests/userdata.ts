export interface User {
	id: number;
	username: string;
	email: string;
	created_at: string;
	updated_at: string;
	blocked_users: string | null;	//Change to number[] later
	friends: string | null; 		//Change to number[] later
	friendlist: Friend[];
	avatar: string | null;
    online: boolean;
}

export interface Friend {
	id: number;
	username: string;
	online: boolean;
	new_message: boolean| false;
	chat_history?: string[];
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
		if (!userData.blocked_users) userData.blocked_users = '[]';
		// Fetch friends' data
		if (userData.friends) {
			const friendDetails: Friend[] = await Promise.all(
				// Remove the JSON.parse if friends is changed to number[]
				JSON.parse(userData.friends).map(async (friendId: number) => {
				const friendResponse = await fetch(`/user/${friendId}`, {
					method: "GET",
					headers: {
						Authorization: `Bearer ${localStorage.getItem("token")}`,
					},
				});
				if (!friendResponse.ok) {
					throw new Error(`Error fetching friend ${friendId}: ${friendResponse.statusText}`);
				}
				const friendData = await friendResponse.json();
				return {
					id: friendData.id,
					username: friendData.username,
					online: friendData.online,
				} as Friend;
			}));
			userData.friendlist = friendDetails
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