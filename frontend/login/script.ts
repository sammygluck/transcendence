import { handleRouteChange } from "../router.js";
import {
	connectGameServer,
	disconnectGameServer,
} from "../tournament/script.js";

let isLogin: boolean = true;

function toggleForm(): void {
	isLogin = !isLogin;
	const formTitle = document.getElementById("auth-form-title");
	const authButton = document.getElementById("auth-button");
	const toggleText = document.querySelector(".toggle");
	const usernameField = document.getElementById("auth-username");

	if (formTitle) {
		formTitle.textContent = isLogin ? "Login" : "Sign Up";
	}
	if (authButton) {
		authButton.textContent = isLogin ? "Login" : "Sign Up";
	}
	if (toggleText) {
		toggleText.textContent = isLogin
			? "Don't have an account? Sign up"
			: "Already have an account? Login";
	}
	if (usernameField) {
		(usernameField as HTMLElement).style.display = isLogin ? "none" : "block";
	}
}

interface AuthResponse {
	token: string;
	message?: string;
	[key: string]: any;
}

async function authenticate(): Promise<void> {
	const usernameInput = document.getElementById(
		"auth-username"
	) as HTMLInputElement | null;
	const emailInput = document.getElementById(
		"auth-email"
	) as HTMLInputElement | null;
	const passwordInput = document.getElementById(
		"auth-password"
	) as HTMLInputElement | null;
	const messageElem = document.getElementById(
		"auth-message"
	) as HTMLElement | null;

	if (!emailInput || !passwordInput || !messageElem) {
		console.error("Missing required form elements");
		return;
	}

	const username = usernameInput?.value;
	const email = emailInput.value;
	const password = passwordInput.value;
	const endpoint = isLogin ? "/login" : "/user";
	const bodyData = isLogin
		? { email, password }
		: { email, username, password };

	try {
		const response = await fetch(endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(bodyData),
		});

		const data: AuthResponse = await response.json();

		if (response.ok) {
			messageElem.style.color = "green";
			messageElem.textContent = isLogin
				? "Login successful!"
				: "Signup successful!";
			if (isLogin && data.token) {
				localStorage.setItem("userInfo", JSON.stringify(data));
				localStorage.setItem("token", data.token);
				handleRouteChange(); // Update the view after successful auth
				connectGameServer(); // Connect to the game server after login
			}
		} else {
			messageElem.style.color = "red";
			messageElem.textContent =
				data.message || (isLogin ? "Login failed!" : "Signup failed!");
		}
	} catch (error) {
		console.error("Authentication error:", error);
		messageElem.style.color = "red";
		messageElem.textContent = "An error occurred during authentication.";
	}
}

function logout(): void {
	localStorage.removeItem("userInfo");
	localStorage.removeItem("token");
	disconnectGameServer(); // Disconnect from the game server
	handleRouteChange(); // Update the view after logout
}

let passwordField = document.getElementById("auth-password");
passwordField.addEventListener("keydown", (e) => {
	if (e.code === "Enter") {
		authenticate();
	}
});

document.getElementById("auth-button").addEventListener("click", () => {
	authenticate();
});

document.getElementById("auth-toggle").addEventListener("click", () => {
	toggleForm();
});

//logout button in navbar
document.getElementById("logoutBtn")?.addEventListener("click", () => {
	logout();
});

export { logout };
