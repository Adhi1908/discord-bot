const router = require("express").Router();
const fs = require("fs");
const yaml = require("js-yaml");
const config = yaml.load(fs.readFileSync('./configs/config.yml', 'utf8'));

// Route for Ticket Transcript
router.get("/:id", async (req, res) => {
  let id = req.params.id;
  let fileLoc = `./transcripts/ticket-${id}.html`;
  let fileExist = fs.existsSync(fileLoc);
  if (!fileExist) return res.send(`Ticket with ID ${id} doesn't exist.`);
  let fileToSend = fs.readFileSync(fileLoc, "utf8");

  res.send(fileToSend);
});

// Route for Downloading Ticket Transcript
router.get("/:id/download", async (req, res) => {
  if (config.server.selfhost.download == false) return res.send("Transcript downloading is disabled.");

  let id = req.params.id;
  let fileLoc = `./transcripts/ticket-${id}.html`;
  let fileExist = fs.existsSync(fileLoc);
  if (!fileExist) return res.send(`Ticket with ID ${id} doesn't exist.`);

  res.download(fileLoc, `transcript-${id}.html`);
});

module.exports = router;
