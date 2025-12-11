import NodeLeekClient from "./node-leek-client/node-leek-client";

console.log("Starting app");

var nodeLeek = new NodeLeekClient();
nodeLeek.login("PorteventRemote", "YOUR_PASSWORD").then(() =>
    nodeLeek.fetchFile(451535, 0).then(file => console.log(file))
);
