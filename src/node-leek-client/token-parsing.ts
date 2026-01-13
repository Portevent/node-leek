export function getCookieToken(header: string[] | undefined): string {
    const cookie = getSetterOf(header ?? [], "token");
    if (!cookie.includes("token=")) return "";
    const value = cookie.split(";")[0].split("token=")[1];
    return value !== undefined ? value : "";
}

export function getPhpsessidToken(header: string[] | undefined): string {
    const cookie = getSetterOf(header ?? [], "PHPSESSID");
    if (!cookie.includes("PHPSESSID=")) return "";
    const value = cookie.split(";")[0].split("PHPSESSID=")[1];
    return value !== undefined ? value : "";
}

function getSetterOf(header: string[], attribute: string): string {
    return header.find(cookie => cookie.trim().startsWith(`${attribute}=`) && !cookie.startsWith(`${attribute}=deleted;`)) ?? `${attribute}=;`;
}
