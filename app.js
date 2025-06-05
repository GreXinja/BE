const LibExpress = require("express")
const LibRandomString = require("randomstring")
const { MongoClient } = require('mongodb')
const LibCors = require('cors')
const server = LibExpress();
server.use(LibCors())
server.use(LibExpress.json());



const connection = new MongoClient("mongodb://ims_app_user:password123@localhost:27017/ims")
const DB = "ims"

server.listen(8000, () => {
    console.log("Server is listening and is connected to port 8000")
})

//signup
server.post("/users", async (req, res) => {
    if (req.body.name && req.body.email && req.body.phone && req.body.password) {
        await connection.connect()
        const db = await connection.db(DB)
        const collection = await db.collection('users')
        const result = await collection.find({ "email": req.body.email }).toArray()
        if (result.length > 0) {
            res.json({ error: "User Already Exists" })
        }
        else {
            await collection.insertOne({
                name: req.body.name,
                email: req.body.email,
                password: req.body.password,
                phone: req.body.phone
            })
            res.json({ message: "Success" })
            connection.close()
        }
    }
})
//login
server.post("/tokens", async (req, res) => {
    if (req.body.email && req.body.password) {
        await connection.connect()
        const db = await connection.db(DB)
        const collection = await db.collection('users')
        const result = await collection.find({ "email": req.body.email, "password": req.body.password }).toArray()
        if (result.length > 0) {

            const generateToken = LibRandomString.generate(7)
            const user = result[0]
            await collection.updateOne(
                { _id: user._id },
                { $set: { token: generateToken } }
            )
            res.status(200).json({ token: generateToken })
            connection.close()
        }
        else {
            res.status(400).json({ error: "Invaild Credentials" })
        }

    } else {
        res.status(401).json({ error: "Missing Email or password " })
    }
})
server.get("/users/roles", async (req, res) => {
    if (!req.headers.token) {
        return res.status(400).json({ error: "No Token present" });
    }

    try {
        await connection.connect();
        const db = await connection.db(DB);
        const collection = db.collection('users');

        const result = await collection.find({ token: req.headers.token }).toArray();

        if (result.length === 0) {
            return res.status(401).json({ error: "No User present" });
        }

        const currentUser = result[0];

        res.status(200).json({
            admin: !!currentUser.is_admin,
            TeamOwner: !!currentUser.owner_of,       // true if array or string exists
            Player: !!currentUser.playing_for        // true if array or value exists
        });
        connection.close()

    } catch (err) {
        console.error("Error fetching user role:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
// GET /players - returns users who are players (i.e., have 'playing_for' field)
server.get("/players", async (req, res) => {
    const token = req.headers.token;

    if (!token) {
        return res.status(400).json({ error: "Missing token in header" });
    }

    try {
        await connection.connect();
        const db = await connection.db(DB);
        const usersCollection = db.collection("users");

        // Validate token
        const user = await usersCollection.findOne({ token });

        if (!user) {
            return res.status(401).json({ error: "Invalid token" });
        }

        // Fetch all users who are players (i.e., have 'playing_for' field)
        const players = await usersCollection.find({ playing_for: { $exists: true } }).toArray();

        res.status(200).json(players);
        connection.close()

    } catch (error) {
        console.error("Error fetching players:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
server.get("/teams", async (req, res) => {
    const token = req.headers.token;

    if (!token) {
        return res.status(400).json({ error: "Missing token in header" });
    }

    try {
        await connection.connect();
        const db = await connection.db(DB);
        const usersCollection = db.collection("users");

        // Validate token
        const user = await usersCollection.findOne({ token });

        if (!user) {
            return res.status(401).json({ error: "Invalid token" });
        }

        // Fetch all teams (fields at root level)
        const teamsCollection = db.collection("teams");
        const teams = await teamsCollection.find({}).toArray();

        res.status(200).json(teams);
        connection.close()

    } catch (error) {
        console.error("Error fetching teams:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
// Get single player by ID with token
server.get("/player/:id", async (req, res) => {
    const token = req.headers.token;
    const playerId = req.params.id;

    if (!token) {
        return res.status(400).json({ error: "Missing token in header" });
    }

    try {
        await connection.connect();
        const db = connection.db(DB);
        const usersCollection = db.collection("users");

        // Validate token
        const user = await usersCollection.findOne({ token });

        if (!user) {
            return res.status(401).json({ error: "Invalid token" });
        }

        // Fetch player by ID
        const player = await usersCollection.findOne({ _id: new MongoClient(playerId) });

        if (!player) {
            return res.status(404).json({ error: "Player not found" });
        }

        res.status(200).json(player);
    } catch (error) {
        console.error("Error fetching player:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

server.put("/team/:id", async (req, res) => {
    const token = req.headers.token;
    const teamId = req.params.id;
    const { name, owner, captain, logo } = req.body;

    if (!token) {
        return res.status(400).json({ error: "Missing token" });
    }

    try {
        await connection.connect();
        const db = connection.db(DB);
        const usersCollection = db.collection("users");
        const teamsCollection = db.collection("teams");

        // Token validation
        const user = await usersCollection.findOne({ token });
        if (!user) {
            return res.status(401).json({ error: "Invalid token" });
        }

        // Update team
        const result = await teamsCollection.updateOne(
            { _id: new MongoClient(teamId) },
            { $set: { name, owner, captain, logo } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: "Team not found or no changes made" });
        }

        res.status(200).json({ message: "Team updated successfully" });
    } catch (err) {
        console.error("Update failed:", err);
        res.status(500).json({ error: "Server error" });
    }
});

