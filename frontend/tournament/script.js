const tournamentList = document.getElementById("tournamentList");
const createTournamentForm = document.getElementById("createTournamentForm");
const tournamentNameInput = document.getElementById("tournamentName");
const selectedTitle = document.getElementById("selectedTournamentTitle");
const playerList = document.getElementById("playerList");
const subscribeBtn = document.getElementById("subscribeBtn");
const startBtn = document.getElementById("startBtn");
const statusMessage = document.getElementById("statusMessage");
let tournaments = [];
let selectedTournament = null;
let userInfo = null;
let ws = null;
function connectGameServer() {
    const userInfoStr = localStorage.getItem("userInfo");
    if (!userInfoStr) {
        return;
    }
    userInfo = JSON.parse(userInfoStr);
    if (!userInfo || !userInfo.token) {
        return;
    }
    ws = new WebSocket(`ws://${window.location.host}/game?token=${userInfo.token}`);
    ws.addEventListener("error", (error) => {
        console.error("WebSocket error:", error);
    });
    ws.addEventListener("close", (e) => {
        switch (e.code) {
            case 4000:
                console.log("No token provided");
                break;
            case 4001:
                console.log("Invalid token");
                break;
            default:
                console.log("Disconnected from the server");
        }
        disconnectGameServer();
    });
    ws.addEventListener("open", () => {
        const msg = { type: "list_tournaments" };
        ws.send(JSON.stringify(msg));
    });
    ws.addEventListener("message", (event) => {
        const msg = JSON.parse(event.data);
        console.log(msg);
        if (msg.type === "tournaments") {
            tournaments = msg.data;
            renderTournamentList();
            if (selectedTournament !== null) {
                selectTournament(selectedTournament);
            }
        }
    });
    createTournamentForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = tournamentNameInput.value.trim();
        if (!name)
            return;
        const msg = { type: "create_tournament", name };
        ws.send(JSON.stringify(msg));
        tournamentNameInput.value = "";
    });
    subscribeBtn.addEventListener("click", subscribeBtnClick);
    startBtn.addEventListener("click", startBtnClick);
    console.log("Connected to the game server");
}
function disconnectGameServer() {
    if (ws) {
        ws.close();
        ws = null;
    }
    selectedTournament = null;
    tournaments = [];
    renderTournamentList();
    console.log("Disconnected from the game server");
    subscribeBtn.removeEventListener("click", subscribeBtnClick);
    startBtn.removeEventListener("click", subscribeBtnClick);
}
function startBtnClick() {
    if (selectedTournament === null)
        return;
    const msg = {
        type: "start_tournament",
        tournament: selectedTournament,
    };
    ws.send(JSON.stringify(msg));
}
function subscribeBtnClick() {
    if (selectedTournament === null)
        return;
    const msg = {
        type: "subscribe",
        tournament: selectedTournament,
    };
    ws.send(JSON.stringify(msg));
}
function renderTournamentList() {
    tournamentList.innerHTML = "";
    tournaments.forEach((t) => {
        const li = document.createElement("li");
        li.textContent = t.name;
        li.className = "cursor-pointer p-2 hover:bg-gray-100 rounded";
        li.addEventListener("click", () => selectTournament(t.id));
        tournamentList.appendChild(li);
    });
}
function selectTournament(id) {
    console.log("Selected tournament:", id);
    selectedTournament = id;
    const tournament = tournaments.find((t) => t.id === id) || null;
    if (!tournament) {
        selectedTitle.textContent = "Select a tournament";
        statusMessage.textContent = "No tournament";
        playerList.innerHTML = "";
        subscribeBtn.classList.add("hidden");
        startBtn.classList.add("hidden");
        return;
    }
    selectedTitle.textContent = `Players in "${tournament.name}"`;
    statusMessage.textContent = tournament.started
        ? "🏁 This tournament is starting."
        : `Creator: ${tournament.creator.username}`;
    playerList.innerHTML = "";
    tournament.players.forEach((player) => {
        const li = document.createElement("li");
        li.textContent = player.username;
        li.className = "border p-2 rounded";
        playerList.appendChild(li);
    });
    const isCreator = userInfo && userInfo.id === tournament.creator.id;
    const playerIds = tournament.players.map((p) => p.id);
    if (!tournament.started && userInfo && !playerIds.includes(userInfo.id)) {
        subscribeBtn.classList.remove("hidden");
    }
    else {
        subscribeBtn.classList.add("hidden");
    }
    if (!tournament.started && isCreator) {
        startBtn.classList.remove("hidden");
    }
    else {
        startBtn.classList.add("hidden");
    }
}
export { connectGameServer, disconnectGameServer };
