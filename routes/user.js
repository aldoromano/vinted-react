const express = require("express");

const router = express.Router();

const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");

// Import de modèles
const User = require("../models/User");

router.post("/user/signup", async (req, res) => {
  console.log("signup ..." + req.body.username);
  try {
    const { username, email, newsletter, password } = req.body;

    // Contrôle du username
    if (!username) {
      return res.json({ message: "Username mandatory" });
    }

    // Contrôle de l'email
    // 1 - obligatoire
    if (!email) {
      return res.json({ message: "Email mandatory" });
    }
    // 2 - ne doit pas exister
    const users = await User.find({ email: email });
    if (users.length > 0) {
      return res.status(200).json({ message: "Email already exists" });
    }

    // Contrôle du mot de passe
    if (!password) {
      return res.json({ message: "Password mandatory" });
    }

    // Contrôles OK, on passe à la suite

    // Salage : 16 caractères aléatoires
    const salt = uid2(16);
    // Hachage du mot de passe et du sel et conversion en string
    const hash = SHA256(password + salt).toString(encBase64);
    // token = 16 caractères aléatoires
    const token = uid2(16);

    const user = new User({
      email: email,
      account: {
        username: username,
      },
      newsletter: newsletter,
      token: token,
      hash: hash,
      salt: salt,
    });

    await user.save();

    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  console.log("user/login... -> " + req.body.email);

  const { email, password } = req.body;

  try {
    // Contrôle de l'email
    // 1 - obligatoire
    if (!email) {
      return res.json({ message: "Email mandatory" });
    }

    // Contrôle du mot de passe
    if (!password) {
      return res.json({ message: "Password mandatory" });
    }

    // 2 - Doit  exister
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(200).json({ message: "Credentials are incorrect" });
    }

    // Contrôles primaires OK

    // Vérification du mot de passe

    // Hachage du mot de passe et du sel et conversion en string
    const hash = SHA256(password + user.salt).toString(encBase64);
    if (user.hash !== hash) {
      return res.status(200).json({ message: "Credentials are incorrect" });
    } else {
      return res.json(user);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
module.exports = router;
