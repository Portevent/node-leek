"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoidAuth = exports.OAuth = exports.ApiKeyAuth = exports.HttpBearerAuth = exports.HttpBasicAuth = exports.ObjectSerializer = void 0;
__exportStar(require("./aiCreate200Response"), exports);
__exportStar(require("./aiCreateRequest"), exports);
__exportStar(require("./aiFetchRequest"), exports);
__exportStar(require("./aiSave200Response"), exports);
__exportStar(require("./aiSaveRequest"), exports);
__exportStar(require("./aicode"), exports);
__exportStar(require("./credentials"), exports);
__exportStar(require("./farmer"), exports);
__exportStar(require("./folder"), exports);
__exportStar(require("./garden"), exports);
__exportStar(require("./gardenGarden"), exports);
__exportStar(require("./gardenGardenMyCompositionsInner"), exports);
__exportStar(require("./gardenGardenMyTeam"), exports);
__exportStar(require("./ia"), exports);
__exportStar(require("./item"), exports);
__exportStar(require("./leek"), exports);
__exportStar(require("./logindump"), exports);
__exportStar(require("./team"), exports);
const aiCreate200Response_1 = require("./aiCreate200Response");
const aiCreateRequest_1 = require("./aiCreateRequest");
const aiFetchRequest_1 = require("./aiFetchRequest");
const aiSave200Response_1 = require("./aiSave200Response");
const aiSaveRequest_1 = require("./aiSaveRequest");
const aicode_1 = require("./aicode");
const credentials_1 = require("./credentials");
const farmer_1 = require("./farmer");
const folder_1 = require("./folder");
const garden_1 = require("./garden");
const gardenGarden_1 = require("./gardenGarden");
const gardenGardenMyCompositionsInner_1 = require("./gardenGardenMyCompositionsInner");
const gardenGardenMyTeam_1 = require("./gardenGardenMyTeam");
const ia_1 = require("./ia");
const item_1 = require("./item");
const leek_1 = require("./leek");
const logindump_1 = require("./logindump");
const team_1 = require("./team");
/* tslint:disable:no-unused-variable */
let primitives = [
    "string",
    "boolean",
    "double",
    "integer",
    "long",
    "float",
    "number",
    "any"
];
let enumsMap = {};
let typeMap = {
    "AiCreate200Response": aiCreate200Response_1.AiCreate200Response,
    "AiCreateRequest": aiCreateRequest_1.AiCreateRequest,
    "AiFetchRequest": aiFetchRequest_1.AiFetchRequest,
    "AiSave200Response": aiSave200Response_1.AiSave200Response,
    "AiSaveRequest": aiSaveRequest_1.AiSaveRequest,
    "Aicode": aicode_1.Aicode,
    "Credentials": credentials_1.Credentials,
    "Farmer": farmer_1.Farmer,
    "Folder": folder_1.Folder,
    "Garden": garden_1.Garden,
    "GardenGarden": gardenGarden_1.GardenGarden,
    "GardenGardenMyCompositionsInner": gardenGardenMyCompositionsInner_1.GardenGardenMyCompositionsInner,
    "GardenGardenMyTeam": gardenGardenMyTeam_1.GardenGardenMyTeam,
    "Ia": ia_1.Ia,
    "Item": item_1.Item,
    "Leek": leek_1.Leek,
    "Logindump": logindump_1.Logindump,
    "Team": team_1.Team,
};
class ObjectSerializer {
    static findCorrectType(data, expectedType) {
        if (data == undefined) {
            return expectedType;
        }
        else if (primitives.indexOf(expectedType.toLowerCase()) !== -1) {
            return expectedType;
        }
        else if (expectedType === "Date") {
            return expectedType;
        }
        else {
            if (enumsMap[expectedType]) {
                return expectedType;
            }
            if (!typeMap[expectedType]) {
                return expectedType; // w/e we don't know the type
            }
            // Check the discriminator
            let discriminatorProperty = typeMap[expectedType].discriminator;
            if (discriminatorProperty == null) {
                return expectedType; // the type does not have a discriminator. use it.
            }
            else {
                if (data[discriminatorProperty]) {
                    var discriminatorType = data[discriminatorProperty];
                    if (typeMap[discriminatorType]) {
                        return discriminatorType; // use the type given in the discriminator
                    }
                    else {
                        return expectedType; // discriminator did not map to a type
                    }
                }
                else {
                    return expectedType; // discriminator was not present (or an empty string)
                }
            }
        }
    }
    static serialize(data, type) {
        if (data == undefined) {
            return data;
        }
        else if (primitives.indexOf(type.toLowerCase()) !== -1) {
            return data;
        }
        else if (type.lastIndexOf("Array<", 0) === 0) { // string.startsWith pre es6
            let subType = type.replace("Array<", ""); // Array<Type> => Type>
            subType = subType.substring(0, subType.length - 1); // Type> => Type
            let transformedData = [];
            for (let index = 0; index < data.length; index++) {
                let datum = data[index];
                transformedData.push(ObjectSerializer.serialize(datum, subType));
            }
            return transformedData;
        }
        else if (type === "Date") {
            return data.toISOString();
        }
        else {
            if (enumsMap[type]) {
                return data;
            }
            if (!typeMap[type]) { // in case we dont know the type
                return data;
            }
            // Get the actual type of this object
            type = this.findCorrectType(data, type);
            // get the map for the correct type.
            let attributeTypes = typeMap[type].getAttributeTypeMap();
            let instance = {};
            for (let index = 0; index < attributeTypes.length; index++) {
                let attributeType = attributeTypes[index];
                instance[attributeType.baseName] = ObjectSerializer.serialize(data[attributeType.name], attributeType.type);
            }
            return instance;
        }
    }
    static deserialize(data, type) {
        // polymorphism may change the actual type.
        type = ObjectSerializer.findCorrectType(data, type);
        if (data == undefined) {
            return data;
        }
        else if (primitives.indexOf(type.toLowerCase()) !== -1) {
            return data;
        }
        else if (type.lastIndexOf("Array<", 0) === 0) { // string.startsWith pre es6
            let subType = type.replace("Array<", ""); // Array<Type> => Type>
            subType = subType.substring(0, subType.length - 1); // Type> => Type
            let transformedData = [];
            for (let index = 0; index < data.length; index++) {
                let datum = data[index];
                transformedData.push(ObjectSerializer.deserialize(datum, subType));
            }
            return transformedData;
        }
        else if (type === "Date") {
            return new Date(data);
        }
        else {
            if (enumsMap[type]) { // is Enum
                return data;
            }
            if (!typeMap[type]) { // dont know the type
                return data;
            }
            let instance = new typeMap[type]();
            let attributeTypes = typeMap[type].getAttributeTypeMap();
            for (let index = 0; index < attributeTypes.length; index++) {
                let attributeType = attributeTypes[index];
                instance[attributeType.name] = ObjectSerializer.deserialize(data[attributeType.baseName], attributeType.type);
            }
            return instance;
        }
    }
}
exports.ObjectSerializer = ObjectSerializer;
class HttpBasicAuth {
    username = '';
    password = '';
    applyToRequest(requestOptions) {
        requestOptions.auth = {
            username: this.username, password: this.password
        };
    }
}
exports.HttpBasicAuth = HttpBasicAuth;
class HttpBearerAuth {
    accessToken = '';
    applyToRequest(requestOptions) {
        if (requestOptions && requestOptions.headers) {
            const accessToken = typeof this.accessToken === 'function'
                ? this.accessToken()
                : this.accessToken;
            requestOptions.headers["Authorization"] = "Bearer " + accessToken;
        }
    }
}
exports.HttpBearerAuth = HttpBearerAuth;
class ApiKeyAuth {
    location;
    paramName;
    apiKey = '';
    constructor(location, paramName) {
        this.location = location;
        this.paramName = paramName;
    }
    applyToRequest(requestOptions) {
        if (this.location == "query") {
            requestOptions.qs[this.paramName] = this.apiKey;
        }
        else if (this.location == "header" && requestOptions && requestOptions.headers) {
            requestOptions.headers[this.paramName] = this.apiKey;
        }
        else if (this.location == 'cookie' && requestOptions && requestOptions.headers) {
            if (requestOptions.headers['Cookie']) {
                requestOptions.headers['Cookie'] += '; ' + this.paramName + '=' + encodeURIComponent(this.apiKey);
            }
            else {
                requestOptions.headers['Cookie'] = this.paramName + '=' + encodeURIComponent(this.apiKey);
            }
        }
    }
}
exports.ApiKeyAuth = ApiKeyAuth;
class OAuth {
    accessToken = '';
    applyToRequest(requestOptions) {
        if (requestOptions && requestOptions.headers) {
            requestOptions.headers["Authorization"] = "Bearer " + this.accessToken;
        }
    }
}
exports.OAuth = OAuth;
class VoidAuth {
    username = '';
    password = '';
    applyToRequest(_) {
        // Do nothing
    }
}
exports.VoidAuth = VoidAuth;
