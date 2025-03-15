interface GoogleAuthResponse {
	credential: string;
  }


async function handleGoogleCredentialResponse(googleResponse: GoogleAuthResponse): Promise<void> {
	// Send the credential to the server
	try {
		const response = await fetch("/googleauth", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ credential: googleResponse.credential }),
		});
		if (!response.ok) {
			throw new Error("HTTP status: " + response.status);
		}
		const data = await response.json();
		console.log(data);
	} catch (error) {
		console.error("Error:", error);
	}
}
