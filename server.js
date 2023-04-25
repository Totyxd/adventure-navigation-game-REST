const http = require('http');
const fs = require('fs');

const { Player } = require('./game/class/player');
const { World } = require('./game/class/world');

const worldData = require('./game/data/basic-world-data');
const { Room } = require('./game/class/room');

let player;
let world = new World();
world.loadWorld(worldData);

const server = http.createServer((req, res) => {
  console.log(req.method, req.url);
  let reqBody = '';
  req.on('data', (data) => {
    reqBody += data;
  });

  req.on("end", () => {
    if (reqBody) {
      req.body = reqBody
        .split("&")
        .map((keyValuePair) => keyValuePair.split("="))
        .map(([key, value]) => [key, value.replace(/\+/g, " ")])
        .map(([key, value]) => [key, decodeURIComponent(value)])
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});
      console.log(req.body);
    };

    /* ======================== ROUTE HANDLERS ========================== */

    // GET /
    if (req.method === "GET" && req.url === "/") {
      const htmlPage = fs.readFileSync("./views/new-player.html", "utf-8");
      const availableRooms = world.availableRoomsToString();

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html");
      return res.end(htmlPage.replace(/#{availableRooms}/, availableRooms));
    };

    // POST /player

    if (req.method === "POST" && req.url === "/player") {
      const {name, roomId} = req.body;
      const room = new Room(world.rooms[roomId].name, world.rooms[roomId].description);
      room.exits = world.rooms[roomId].exits;
      room.id = world.rooms[roomId].roomId;
      player = new Player(name, room);

      res.statusCode = 302;
      res.setHeader("Location", `/rooms/${roomId}`);
      return res.end();
    };

    //GET /rooms/:roomId

    if (!player) {
      res.statusCode = 302;
      res.setHeader("Location", `/`);
      return res.end();
    };

    if (req.method === "GET" && req.url.startsWith("/rooms/")) {
      const urlParts = req.url.split("/");
      if (urlParts.length === 3) {
        const htmlPage = fs.readFileSync("./views/room.html", "utf-8");
        const roomName = player.currentRoom.name;
        const inventory = player.inventoryToString();
        const roomItems = player.currentRoom.itemsToString();
        const roomExits = player.currentRoom.exitsToString();
        const resBody = htmlPage.replace(/#{roomName}/g, roomName)
            .replace(/#{inventory}/, inventory)
            .replace(/#{roomItems}/, roomItems)
            .replace(/#{exits}/, roomExits);

        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html");
        return res.end(resBody);
      };
    };

    //GET /rooms/:roomId/:direction

    if (req.method === "GET" && req.url.startsWith("/rooms/")) {
      const urlParts = req.url.split("/");

      if (urlParts.length === 4) {
        const direction = urlParts[3];
        player.move(direction[0]);
        const newRoomId = player.currentRoom.id;

        res.statusCode = 302;
        res.setHeader("Location", `/rooms/${newRoomId}`);
        return res.end();
      };
    };

    //POST /items/:itemId/:action

    if (req.method === "POST" && req.url.startsWith("/items/")) {
      const urlParts = req.url.split("/");
      const itemId = urlParts[2];
      const action = urlParts[3];
      const roomId = player.currentRoom.id;

      try {
        switch(action) {
          case "take":
            player.takeItem(itemId);
          case "eat":
            player.eatItem(itemId);
          case "drop":
            player.dropItem(itemId);
        };
      } catch(error) {
        res.statusCode = 302;
        res.setHeader("Location", `/rooms/${roomId}`);
        return res.end("Cannot perform action in given item.");
      };

      res.statusCode = 302;
      res.setHeader("Location", `/rooms/${roomId}`);
      return res.end();
    };

    //Redirect if no matching route handlers

    res.statusCode = 302;
    res.setHeader("Location", `/rooms/${player.currentRoom.id}`);
    res.end();
  })
});

const port = 5000;

server.listen(port, () => console.log('Server is listening on port', port));
