function getSetterOf(header: string[], attribute: string) {
    return header
        .find(cookie => cookie.startsWith( attribute + "=") && !cookie.startsWith(attribute + "=deleted;")) ?? attribute + "=undefined;";
}

export function getCookieToken(header: string[] | undefined): string {
    return getSetterOf(header ?? [], "token")
        .split(";")[0]
        .split("token=")[1]?? "";
}

export function getPhpsessidToken(header: string[] | undefined): string {
    return getSetterOf(header ?? [], "PHPSESSID")
        .split(";")[0]
        .split("PHPSESSID=")[1]?? "";
}
