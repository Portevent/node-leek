import NodeLeekClient from "./node-leek-client";

function getTokenSetter(header: string[]) {
    return header
        .find(cookie => cookie.startsWith("token=") && !cookie.startsWith("token=deleted;")) ?? "token=undefined;";
}

function getCookieToken(header: string[] | undefined): string {
    return getTokenSetter(header ?? [])
        .split(";")[0]
        .split("token=")[1]?? "";
}

export default getCookieToken;