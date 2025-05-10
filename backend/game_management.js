const { type } = require("os");

let clients = [];
let openTournaments = [];
let games = []; // started tournaments + regular games based on invites
let currentGame = null; // current game in progress
let tournamentCounter = 0; // counter for tournament ids

function broadcast() {
	const data = JSON.stringify({ type: "tournaments", data: openTournaments });
	clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(data);
		}
	});
}

function addSocket(socket) {
	clients.push(socket);

	socket.onmessage = (message) => {
		const msg = JSON.parse(message.data);
		console.log("Received message:", msg);
		if (msg.type === "create_tournament") {
			tournamentCounter++;
			const tournament = {
				id: tournamentCounter, // temporary id, replace with database id when saving to db
				name: msg.name,
				creator: {
					id: socket.user.id,
					username: socket.user.username,
					email: socket.user.email,
				},
				scoreToWin: 10,
				players: [],
				started: false,
			};
			openTournaments.push(tournament);
		} else if (msg.type === "subscribe") {
			const tournament = openTournaments.find((t) => t.id === msg.tournament);
			if (
				tournament &&
				!tournament.players.find((p) => p.id === socket.user.id)
			) {
				tournament.players.push({
					id: socket.user.id,
					username: socket.user.username,
					email: socket.user.email,
				});
			}
		} else if (msg.type === "start_tournament") {
			const tournament = openTournaments.find((t) => t.id === msg.tournament);
			if (
				tournament &&
				tournament.creator.id === socket.user.id &&
				!tournament.started
			) {
				tournament.started = true;
				tournament.playersCurrentRound = tournament.players;
				tournament.playersNextRound = [];
				tournament.rounds = [];
				tournament.startTime = Date.now();
			}
		} else if (msg.type === "list_tournaments") {
			socket.send(
				JSON.stringify({ type: "tournaments", data: openTournaments })
			);
			return;
		}
		broadcast();
	};
	socket.onclose = () => {
		clients = clients.filter((w) => w !== socket);
		console.log("WebSocket closed:", socket.user.username);
	};
	socket.onerror = (event) => {
		console.error("WebSocket error observed:", event);
	};
}

module.exports = {
	addSocket,
	/*getGameById,
	getAllGames,
	createGame,
	updateGame,
	deleteGame,
	getGameByName,*/
};

// examples
currentGame = {
	name: "Summer Cup",
	creator: { id: "1", name: "Alice" },
	id: "12345", // generate random id when creating a game, replace by database id when saving to db
	scoreToWin: 10,
	type: "tournament", // tournament or invite
	playersCurrentRound: [
		{ id: "1", name: "Alice" },
		{ id: "2", name: "Bob" },
		{ id: "3", name: "Carol" },
		{ id: "4", name: "Dave" },
	],
	playersNextRound: [
		{ id: "5", name: "Alice" },
		{ id: "6", name: "Bob" },
		{ id: "7", name: "Carol" },
		{ id: "8", name: "Dave" },
	],
	rounds: [
		{
			round: 1,
			matches: [
				{ player1: "Alice", player2: "Bob", winner: "Alice" },
				{ player1: "Carol", player2: "Dave", winner: "Dave" },
			],
		},
		{
			round: 2,
			matches: [
				{ player1: "Alice", player2: "Dave", winner: null }, // not played yet
			],
		},
	],
};
