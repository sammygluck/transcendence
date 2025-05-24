let isLogin = true;
function toggleForm() {
    isLogin = !isLogin;
    const formTitle = document.getElementById("form-title");
    const authButton = document.getElementById("auth-button");
    const toggleText = document.querySelector(".toggle");
    const usernameField = document.getElementById("username");
    if (formTitle) {
        formTitle.textContent = isLogin ? "Login" : "Sign Up";
    }
    if (authButton) {
        authButton.textContent = isLogin ? "Login" : "Sign Up";
    }
    if (toggleText) {
        toggleText.textContent = isLogin ? "Don't have an account? Sign up" : "Already have an account? Login";
    }
    if (usernameField) {
        usernameField.style.display = isLogin ? "none" : "block";
    }
}
async function authenticate() {
    const usernameInput = document.getElementById("username");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const messageElem = document.getElementById("message");
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
        const data = await response.json();
        if (response.ok) {
            messageElem.style.color = "green";
            messageElem.textContent = isLogin ? "Login successful!" : "Signup successful!";
            localStorage.setItem("userInfo", JSON.stringify(data));
            localStorage.setItem("token", data.token);
        }
        else {
            messageElem.style.color = "red";
            messageElem.textContent = data.message || (isLogin ? "Login failed!" : "Signup failed!");
        }
    }
    catch (error) {
        console.error("Authentication error:", error);
        messageElem.style.color = "red";
        messageElem.textContent = "An error occurred during authentication.";
    }
}
function logout() {
    localStorage.removeItem("userInfo");
    localStorage.removeItem("token");
}
