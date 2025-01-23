const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");
const app = express();
const server = http.createServer(app);
const io = socket(server);
const chess = new Chess();
let players = {};
let currentPlayer = "w";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.render("index");
});

io.on("connection", function (uniq_socket) {
  console.log("Client connected:", uniq_socket.id);

  // Assign roles
  if (!players.white) {
    players.white = uniq_socket.id;
    uniq_socket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = uniq_socket.id;
    uniq_socket.emit("playerRole", "b");
  } else {
    uniq_socket.emit("spectatorRole");
  }

  // Handle disconnects
  uniq_socket.on("disconnect", () => {
    if (uniq_socket.id === players.white) {
      delete players.white;
    } else if (uniq_socket.id === players.black) {
      delete players.black;
    }
    console.log("Client disconnected:", uniq_socket.id);
    io.emit("boardState", chess.fen()); // Notify clients of the updated state
  });

  // Handle moves
  uniq_socket.on("move", (move) => {
    try {
      // Validate player roles and turn
      if (chess.turn() === "w" && uniq_socket.id !== players.white) {
        return;
      }
      if (chess.turn() === "b" && uniq_socket.id !== players.black) {
        return;
      }

      // Attempt the move
      const result = chess.move(move);
      if (result) {
        currentPlayer = chess.turn();
        io.emit("move", move);
        io.emit("boardState", chess.fen());
      } else {
        console.log("Invalid move: ", move);
        uniq_socket.emit("invalidMove", move);
      }
    } catch (err) {
      console.log("Error processing move: ", move, err.message);
      uniq_socket.emit("invalidMove", move);
    }
  });
});

server.listen(3000, function () {
  console.log("Server started on port 3000");
});
