const { type } = require("os");
const WebSocket = require("ws");

let clients = [];
let openTournaments = [];
let waitingTournaments = []; // started tournaments + regular games based on invites
let currentTournament = null; // current tournament in progress
let tournamentCounter = 0; // counter for tournament ids

function broadcast(obj) {
	const data = JSON.stringify(obj);
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
				tournament.matches = [];
				tournament.round = 1;
				tournament.startTime = Date.now();
			}
		} else if (msg.type === "list_tournaments") {
			socket.send(
				JSON.stringify({ type: "tournaments", data: openTournaments })
			);
			return;
		}
		broadcast({ type: "tournaments", data: openTournaments });
	};
	socket.onclose = () => {
		clients = clients.filter((w) => w !== socket);
		console.log("WebSocket closed:", socket.user.username);
	};
	socket.onerror = (event) => {
		console.error("WebSocket error observed:", event);
	};
}

function startTournament() {
	if (currentTournament) {
		//game already in progress
		return;
	} else if (waitingTournaments.length > 0) {
		// take first one from list
		currentTournament = waitingTournaments[0];
	} else if (openTournaments.length > 0) {
		let firstTimeStamp = 9999999999999;
		let index = -1;
		for (let i = 0; i < openTournaments.length; i++) {
			if (
				openTournaments[i].started &&
				openTournaments[i].startTime < firstTimeStamp
			) {
				firstTimeStamp = openTournaments[i].startTime;
				index = i;
			}
			if (index >= 0) {
				// insert in database and update id here
				currentTournament = openTournaments[index];
				waitingTournaments.push(currentTournament);
				openTournaments.splice(index, 1); // remove 1 element at index
			}
		}
	}
}

function endTournament() {
	if (!currentTournament) {
		return;
	} else {
		// database update?
		// announce tournament winner
		broadcast({ type: "tournamentWinner", data: currentTournament.winner });
		// should be the first element in game array, remove first elememt
		waitingTournaments.unshift();
		currentTournament = null;
	}
}

function tournamentNextMatch() {
	if (!currentTournament) {
		return;
	}
	if (currentTournament.matches.length) {
		//finish current match
		let currentMatch =
			currentTournament.matches[currentTournament.matches.length - 1];
		currentMatch.round = currentTournament.round;
		if (currentMatch.player1.score > currentMatch.player2.score) {
			currentMatch.winner = currentMatch.player1.id;
			currentTournament.playersNextRound.push(...currentMatch.player1);
		} else {
			currentMatch.winner = currentMatch.player2.id;
			currentTournament.playersNextRound.push(...currentMatch.player2);
		}
	}
	//next match
	if (
		currentTournament.playersCurrentRound.length +
			currentTournament.playersNextRound.length <
		2
	) {
		//tournament is finished
		if (currentTournament.playersCurrentRound.length)
			currentTournament.winner = currentTournament.playersCurrentRound[0].id;
		else currentTournament.winner = currentTournament.playersNextRound[0];
		endTournament();
		return;
	}
	let numberOfPlayers = 0;
	let currentMatch = null;
	while (
		numberOfPlayers < 2 &&
		currentTournament.playersCurrentRound.length > 0
	) {
		let index = Math.floor(
			Math.random() * currentTournament.playersCurrentRound.length
		);
		if (!numberOfPlayers) {
			currentMatch = {
				player1: { ...currentTournament.playersCurrentRound[index], score: 0 },
				player2: null,
			};
			currentTournament.matches.push(currentMatch);
			numberOfPlayers++;
		} else {
			currentMatch.player2 = {
				...currentTournament.playersCurrentRound[index],
				score: 0,
			};
			currentMatch.round = currentTournament.round;
		}
		//remove player from playersCurrentRound
		currentTournament.playersCurrentRound.splice(index, 1); // remove 1 element at index
	}
	if (
		numberOfPlayers < 2 &&
		currentTournament.playersCurrentRound.length === 0
	) {
		currentTournament.playersCurrentRound = currentTournament.playersNextRound;
		currentTournament.playersNextRound = [];
		currentTournament.round++;
	}
	while (
		numberOfPlayers < 2 &&
		currentTournament.playersCurrentRound.length > 0
	) {
		let index = Math.floor(
			Math.random() * currentTournament.playersCurrentRound.length
		);
		if (!numberOfPlayers) {
			currentMatch = {
				player1: { ...currentTournament.playersCurrentRound[index], score: 0 },
				player2: null,
			};
			currentTournament.matches.push(currentMatch);
			numberOfPlayers++;
		} else {
			currentMatch.player2 = {
				...currentTournament.playersCurrentRound[index],
				score: 0,
			};
			currentMatch.round = currentTournament.round;
		}
		//remove player from playersCurrentRound
		currentTournament.playersCurrentRound.splice(index, 1); // remove 1 element at index
	}
	broadcast({ type: "nextMatch", data: currentMatch });
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
currentTournament = {
	name: "Summer Cup",
	creator: { id: "1", name: "Alice" },
	id: "12345", // generate random id when creating a game, replace by database id when saving to db
	scoreToWin: 10,
	type: "tournament", // tournament or invite
	started: true,
	startTime: 1747127100000, //epochtime
	playersCurrentRound: [
		{ id: 1, name: "Alice" },
		{ id: 2, name: "Bob" },
		{ id: 3, name: "Carol" },
		{ id: 4, name: "Dave" },
	],
	playersNextRound: [
		{ id: 5, name: "Alice" },
		{ id: 6, name: "Bob" },
		{ id: 7, name: "Carol" },
		{ id: 8, name: "Dave" },
	],
	matches: [
		{
			player1: { id: 1, name: "Alice", score: 10 },
			player2: { id: 2, name: "Bob", score: 6 },
			winner: 1,
			round: 1,
		},
		{
			player1: { id: 3, name: "Carol", score: 2 },
			player2: { id: 4, name: "Dave", score: 10 },
			winner: 4,
			round: 1,
		},
		{
			player1: { id: 5, name: "Alice" },
			player2: { id: 8, name: "Dave" },
			winner: null,
			round: 2,
		}, // not played yet
	],
	/*
	rounds: [
		{
			round: 1,
			matches: [
				{ player1: { id: 1, name: "Alice", score: 10 }, player2: { id: 2, name: "Bob", score: 6 }, winner: 1 },
				{ player1: { id: 3, name: "Carol", score: 2 }, player2: { id: 4, name: "Dave", score: 10 }, winner: 4 },
			],
		},
		{
			round: 2,
			matches: [
				{ player1: { id: 5, name: "Alice" }, player2:{ id: 8, name: "Dave" }, winner: null }, // not played yet
			],
		},
	],*/
};
