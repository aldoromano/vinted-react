const express = require("express");
const mongoose = require("mongoose");

const app = express();

app.use(express.json());

const cloudinary = require("cloudinary").v2; // On n'oublie pas le `.v2` à la fin

// Données à remplacer avec les vôtres :
cloudinary.config({
  cloud_name: "dcb0jrjim",
  api_key: "552938344947371",
  api_secret: "w7r3JMeALGvDlw-CatrHpgZmrfU",
});

mongoose.connect("mongodb://127.0.0.1:27017/vinted");

const routeUser = require("./routes/user");
const routeOffer = require("./routes/offer");

app.use(routeUser);
app.use(routeOffer);

app.all("*", (req, res) => {
  res.status(404).json({ message: "Page not found" });
});

app.listen(3000, () => {
  console.log("Server vinted started...");
});
