const express = require("express");
const fileUpload = require("express-fileupload");
const mongoose = require("mongoose");

const cloudinary = require("cloudinary").v2; // On n'oublie pas le `.v2` à la fin

const router = express.Router();

const isAuthenticated = require("../middleware/isAuthenticated");
const Offer = require("../models/offer");
const { route } = require("./user");
const convertToBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

const PAGELIMIT = 5;

router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    console.log("publish ... ", req.body);

    try {
      // Récupération des paramètres du body
      const { product_name, product_description, product_price } = req.body;

      // On créé l'offre
      const newOffer = new Offer({
        product_name: product_name,
        product_description: product_description,
        product_price: product_price,
        owner: req.user._id,
      });

      const keys = Object.keys(req.body);

      for (let i = 0; i < keys.length; i++) {
        if (
          keys[i] !== "product_name" &&
          keys[i] !== "product_description" &&
          keys[i] !== "product_price" &&
          keys[i] !== "product_image"
        ) {
          const obj = {};
          obj[keys[i]] = req.body[keys[i]];
          newOffer.product_details.push(obj);
        }
      }

      //
      if (req.files?.picture) {
        // On envoie une à Cloudinary un buffer converti en base64
        const result = await cloudinary.uploader.upload(
          convertToBase64(req.files.product_image),
          { folder: "/vinted/offers/" + newOffer._id }
        );

        // On récupère les informations de l'image
        newOffer.product_image = result;
      }

      // Sauvegarde de loffre
      await newOffer.save();

      return res.json(newOffer);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.put("/offer/update", isAuthenticated, fileUpload(), async (req, res) => {
  console.log("offers/update");

  try {
    const offerToUpdate = await Offer.findById(req.body.id);
    if (!offerToUpdate) {
      return res.status(400).json({ message: "Unknow offer..." });
    }
    const { product_name, product_description, product_price } = req.body;

    offerToUpdate.product_name = product_name;
    offerToUpdate.product_description = product_description;
    offerToUpdate.product_price = product_price;

    delete offerToUpdate.product_details;

    offerToUpdate.product_details = [];
    const keys = Object.keys(req.body);

    for (let i = 0; i < keys.length; i++) {
      if (
        keys[i] !== "id" &&
        keys[i] !== "product_name" &&
        keys[i] !== "product_description" &&
        keys[i] !== "product_price" &&
        keys[i] !== "product_image"
      ) {
        const obj = {};
        obj[keys[i]] = req.body[keys[i]];
        //console.log("obj -> ", obj);
        offerToUpdate.product_details.push(obj);
      }
    }

    if (req.files?.picture) {
      // On envoie une à Cloudinary un buffer converti en base64
      const result = await cloudinary.uploader.upload(
        convertToBase64(req.files.product_image),
        { folder: "/vinted/offers/" + req.body.id }
      );

      // On récupère l'URL de l'image
      offerToUpdate.product_image = result;
    }

    await offerToUpdate.save();

    return res.json(offerToUpdate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/offer/delete", isAuthenticated, async (req, res) => {
  console.log("/offer/delete..." + req.body.id);

  try {
    const offerToDelete = await Offer.findById(req.body.id);
    if (!offerToDelete) {
      return res.status(400).json({ message: "Unknow offer..." });
    }

    console.log("public_id ..." + offerToDelete.product_image.public_id);

    await cloudinary.uploader.destroy(
      offerToDelete.product_image.public_id,
      function (result) {
        console.log(result);
      }
    );

    //await cloudinary.api.resources("/vinted/offers/" + req.body.id);
    await cloudinary.api.delete_folder("/vinted/offers/" + req.body.id);
    // Suppression de l'offre dans MongoDb
    await offerToDelete.delete();

    res.status(200).json({ message: "Offer successfully deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/offers", async (req, res) => {
  console.log("offers....");

  try {
    // Récupération des paramètres
    console.log("req.query ->", req.query);

    // Traitement du nombre de page
    page = req.query.page ? parseInt(req.query.page) : 1;

    const offers = await Offer.find({
      product_name: new RegExp(req.query.title, "i"),
      product_price: {
        $gte: req.query.priceMin ? parseInt(req.query.priceMin) : 0,
        $lte: req.query.priceMax ? parseInt(req.query.priceMax) : 999999,
        //$lte: 20,
      },
    })
      .select("product_name product_price -_id")
      .populate("owner", "account _id")
      .sort({
        product_price: req.query.sort
          ? req.query.sort === "price-asc"
            ? 1
            : -1
          : -1,
      })
      .limit(PAGELIMIT)
      .skip(PAGELIMIT * (page - 1));

    const offersCount = await Offer.find({
      product_name: new RegExp(req.query.title, "i"),
      product_price: {
        $gte: req.query.priceMin ? parseInt(req.query.priceMin) : 0,
        $lte: req.query.priceMax ? parseInt(req.query.priceMax) : 999999,
        //$lte: 20,
      },
    });
    res.status(200).json({ count: offersCount.length, offers: offers });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/offer/:id", async (req, res) => {
  console.log("offer ...");

  try {
    console.log("params : ", req.params.id);

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Bad format id" });
    }
    const offer = await Offer.findById(req.params.id).populate(
      "owner",
      "account _id"
    );
    if (!offer) {
      return res.status(400).json({ message: "Unknown offer" });
    }

    res.status(200).json(offer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
module.exports = router;
