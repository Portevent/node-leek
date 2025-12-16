import fs from "node:fs";

import NodeLeekClient from "./node-leek-client/node-leek-client";

const args = require('minimist')(process.argv.slice(2));
const path = args['path'] ?? args['p'] ?? "./leekscripts";
const watch = (args['watch'] ?? args['w']) != null;
const choice = args['choice'] ?? args['c'];
const readonly = (args['readonly'] ?? args['r']) != null;


const credentials = JSON.parse(fs.readFileSync("./credentials.json", "utf8"));

var client = new NodeLeekClient(credentials["username"], credentials["password"], readonly);

client.login().then(() => {
   client.syncWith(path, watch, choice);
});