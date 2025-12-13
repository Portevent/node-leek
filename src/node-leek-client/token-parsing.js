"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getTokenSetter(header) {
    return header
        .find(cookie => cookie.startsWith("token=") && !cookie.startsWith("token=deleted;")) ?? "token=undefined;";
}
function getCookieToken(header) {
    return getTokenSetter(header ?? [])
        .split(";")[0]
        .split("token=")[1] ?? "";
}
exports.default = getCookieToken;
