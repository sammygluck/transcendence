import { logout } from "../login/script.js";

interface Player {
	id: number;
	username: string;
}

interface Tournament {
	id: number;
	name: string;
	creator: Player;
	players: Player[];
	started: boolean;
}

interface UserInfo {
	id: number;
	token: string;
	// add other user fields here if needed
}

type ClientMessage =
	| { type: "list_tournaments" }
	| { type: "create_tournament"; name: string }
	| { type: "subscribe"; tournament: number }
	| { type: "start_tournament"; tournament: number };

interface TournamentsMessage {
	type: "tournaments";
	data: Tournament[];
}

type ServerMessage = TournamentsMessage; // TournamentsMessage is only valid for open tournaments (before they are started), extend ServerMessage later with other types

// Element references
const tournamentList = document.getElementById(
	"tournamentList"
) as HTMLUListElement;
const createTournamentForm = document.getElementById(
	"createTournamentForm"
) as HTMLFormElement;
const tournamentNameInput = document.getElementById(
	"tournamentName"
) as HTMLInputElement;

const selectedTitle = document.getElementById(
	"selectedTournamentTitle"
) as HTMLElement;
const playerList = document.getElementById("playerList") as HTMLUListElement;
const subscribeBtn = document.getElementById(
	"subscribeBtn"
) as HTMLButtonElement;
const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
const statusMessage = document.getElementById("statusMessage") as HTMLElement;

// State
let tournaments: Tournament[] = [];
let selectedTournament: number | null = null;
let userInfo: UserInfo | null = null;
let ws: WebSocket | null = null;

function connectGameServer(): void {
	// This function is called to connect to the game server
	// Load user info
	const userInfoStr = localStorage.getItem("userInfo");
	if (!userInfoStr) {
		return;
	}
	userInfo = JSON.parse(userInfoStr!);
	if (!userInfo || !userInfo.token) {
		return;
	}

	// WebSocket setup
	ws = new WebSocket(
		`ws://${window.location.host}/game?token=${userInfo.token}`
	);

	ws.addEventListener("error", (error) => {
		console.error("WebSocket error:", error);
		disconnectGameServer();
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
		logout();
		/*console.log("Reconnecting in 5 seconds...");
		setTimeout(() => {
			connectGameServer();
		}, 5000);*/
	});

	ws.addEventListener("open", () => {
		const msg: ClientMessage = { type: "list_tournaments" };
		ws.send(JSON.stringify(msg));
	});

	ws.addEventListener("message", (event) => {
		const msg: ServerMessage = JSON.parse(event.data);
		console.log(msg);

		if (msg.type === "tournaments") {
			tournaments = msg.data;
			renderTournamentList();
			if (selectedTournament !== null) {
				selectTournament(selectedTournament);
			}
		}
	});

	// Form: create tournament
	createTournamentForm.addEventListener("submit", (e) => {
		e.preventDefault();
		const name = tournamentNameInput.value.trim();
		if (!name) return;

		const msg: ClientMessage = { type: "create_tournament", name };
		ws.send(JSON.stringify(msg));
		tournamentNameInput.value = "";
	});

	// Subscribe to tournament
	subscribeBtn.addEventListener("click", subscribeBtnClick);

	// Start tournament
	startBtn.addEventListener("click", startBtnClick);
	console.log("Connected to the game server");
}

function disconnectGameServer(): void {
	if (ws) {
		ws.close();
		ws = null;
	}
	selectedTournament = null;
	tournaments = [];
	renderTournamentList();
	console.log("Disconnected from the game server");

	subscribeBtn.removeEventListener("click", subscribeBtnClick);
	startBtn.removeEventListener("click", startBtnClick);
}

function startBtnClick(): void {
	if (selectedTournament === null) return;
	const msg: ClientMessage = {
		type: "start_tournament",
		tournament: selectedTournament,
	};
	ws.send(JSON.stringify(msg));
}

function subscribeBtnClick(): void {
	if (selectedTournament === null) return;
	const msg: ClientMessage = {
		type: "subscribe",
		tournament: selectedTournament,
	};
	ws.send(JSON.stringify(msg));
}

// Render list of tournaments
function renderTournamentList(): void {
	tournamentList.innerHTML = "";
	tournaments.forEach((t) => {
		const li = document.createElement("li");
		li.textContent = t.name;
		li.className = "cursor-pointer p-2 hover:bg-gray-100 rounded";
		li.addEventListener("click", () => selectTournament(t.id));
		tournamentList.appendChild(li);
	});
}

// Select a tournament
function selectTournament(id: number): void {
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

	// Render players
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
	} else {
		subscribeBtn.classList.add("hidden");
	}

	if (!tournament.started && isCreator) {
		startBtn.classList.remove("hidden");
	} else {
		startBtn.classList.add("hidden");
	}
}

// if logged in on page load, connect to the game server
if (localStorage.getItem("userInfo")) {
	connectGameServer();
}

export { connectGameServer, disconnectGameServer };
