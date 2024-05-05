const express = require("express");
const cors = require("cors");
const sql = require("mssql");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");

const app = express();
const port = 3000;

const JWT_SECRET_KEY = "22D395C8229AABC76A2146E3DCC46";

// SQL Server configuration
const config = {
  user: "sa",
  password: "a048128798",
  server: "localhost",
  database: "amirali",
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

// Connect to the database
sql
  .connect(config)
  .then((pool) => {

    return pool.request().query("SELECT 1 as number");
  })
  .then((result) => {
    console.log("Connected to MSSQL");
  })
  .catch((err) => {
    console.error("Database Connection Failed! Bad Config: ", err);
  });

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/login", function (req, res, next) {
  res.json({ msg: "This is CORS-enabled for all origins!" });
});


// Login user
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

    const pool = await sql.connect(config);
    const result = await pool.request().query(query);

    const user = result.recordset[0];

    if (user) {
      const accessToken = jwt.sign(
        { username: user.username },
        JWT_SECRET_KEY,
        { expiresIn: "5s" }
      );
      const data = {
        message: "User logged in successfully",
        accessToken,
      };
      res.send(data);
    } else {
      res.status(403).send("Username or password is incorrect");
    }
  } catch (err) {
    console.error(err);
    res.status(403).send("Server error");
  }
});

const checkTokenMiddleware = (req, res, next) => {
  const bearerHeader = req.headers["authorization"];

  if (bearerHeader) {
    const bearerToken = bearerHeader.split(" ")[1];

    jwt.verify(bearerToken, JWT_SECRET_KEY, (error, decoded) => {
      if (error) {
        return res
          .status(403)
          .json({ success: false, message: "Error to verify token" });
      } else {
        req.decoded = decoded;
        next();
      }
    });
  } else {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }
};

const verifyToken = (req, res, next) => {
  const bearerHeader = req.headers["authorization"];

  if (!bearerHeader) {
    return res.sendStatus(403);
  }
  const token = bearerHeader.split(" ")[1];
  jwt.verify(token, JWT_SECRET_KEY, (err, authData) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.authData = authData;
    next();
  });
};

app.get("/product", checkTokenMiddleware, (req, res) => {
  sql
    .connect(config)
    .then((pool) => {
      return pool.request().query("SELECT * FROM product");
    })
    .then((result) => {
      res.json(result.recordset);
    })
    .catch((error) => {
      console.error("Database error", error);
      res.status(403).send({ message: "Error while accessing information" });
    });
});
app.get("/users", checkTokenMiddleware, (req, res) => {
  sql
    .connect(config)
    .then((pool) => {
      return pool.request().query("SELECT * FROM users");
    })
    .then((result) => {
      res.json(result.recordset);
    })
    .catch((error) => {
      console.error("Database error", error);
      res.status(403).send({ message: "Error while accessing information" });
    });
});
app.get("/checktoken", verifyToken, (req, res) => {
  res.json({ success: true, message: "Token is valid" });
});
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
