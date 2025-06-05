const routes = {
    "/home": "home",
    "/login": "loginPage",
    "/tournament": "tournamentPage",
    "/game": "loading",
    "/": "loading",
    "/404": "notFound",
};
const showChat = [
    "home",
    "tournamentPage",
    "game"
];
function checkLoggedIn() {
    const userInfo = localStorage.getItem("userInfo");
    if (!userInfo) {
        return null;
    }
    try {
        const parsedUserInfo = JSON.parse(userInfo);
        if (parsedUserInfo && parsedUserInfo.token) {
            return parsedUserInfo;
        }
    }
    catch (error) {
        console.error("Error parsing user info:", error);
        return null;
    }
}
function showView(viewId) {
    document.querySelectorAll(".route-view").forEach((el) => {
        el.classList.add("hidden");
    });
    if (!viewId) {
        document.body.innerHTML = "<h1>404 - Not Found</h1>";
        return;
    }
    const view = document.getElementById(viewId);
    const chatWindow = document.getElementById("chat-block");
    if (view) {
        view.classList.remove("hidden");
    }
    else {
        document.body.innerHTML = "<h1>404 - Not Found</h1>";
    }
    if (chatWindow) {
        if (showChat.includes(viewId)) {
            chatWindow.classList.remove("hidden");
        }
        else {
            chatWindow.classList.add("hidden");
        }
    }
}
function handleRouteChange() {
    let path = window.location.pathname;
    const user = checkLoggedIn();
    const navBar = document.getElementById("navbar");
    if (!user) {
        navBar?.classList.add("hidden");
        path = "/login";
    }
    else {
        navBar?.classList.remove("hidden");
        document.getElementById("navUsername").textContent =
            user.username || "Guest";
        document
            .getElementById("navAvatar")
            .setAttribute("src", user.avatar || "default-avatar.svg");
    }
    const viewId = routes[path] || "notFound";
    showView(viewId);
}
document.addEventListener("click", (e) => {
    const target = e.target;
    const link = target.closest("[data-link]");
    if (link) {
        e.preventDefault();
        const href = link.getAttribute("href");
        if (href) {
            history.pushState({}, "", href);
            handleRouteChange();
        }
    }
});
window.addEventListener("popstate", handleRouteChange);
window.addEventListener("DOMContentLoaded", handleRouteChange);
export { handleRouteChange };
