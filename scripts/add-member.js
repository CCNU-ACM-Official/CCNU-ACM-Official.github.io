import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'node:path';

const targetFile = process.env.TARGET_FILE || 'docs/协会成员.md';
const payloadRaw = process.env.MEMBER_PAYLOAD;
const groupEnv = process.env.MEMBER_GROUP;
const avatarDir = process.env.AVATAR_DIR || 'public/avatar';

const indentUnit = '    ';

function ensureHttpsUrl(url) {
    if (!url || typeof url !== 'string') {
        return null;
    }
    const trimmed = url.trim();
    if (!trimmed) {
        return null;
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    if (trimmed.startsWith('//')) {
        return `https:${trimmed}`;
    }
    return `https://${trimmed.replace(/^\/+/, '')}`;
}

function detectExtensionFromContentType(contentType) {
    if (!contentType) {
        return null;
    }
    const type = contentType.split(';')[0].trim().toLowerCase();
    switch (type) {
        case 'image/jpeg':
        case 'image/jpg':
            return 'jpg';
        case 'image/png':
            return 'png';
        case 'image/webp':
            return 'webp';
        case 'image/gif':
            return 'gif';
        default:
            return null;
    }
}

function detectExtensionFromUrl(url) {
    try {
        const parsed = new URL(url);
        const pathname = parsed.pathname;
        const lastSegment = pathname.split('/').pop() || '';
        const cleanSegment = lastSegment.split('?')[0].split('#')[0];
        if (!cleanSegment.includes('.')) {
            return null;
        }
        return cleanSegment.split('.').pop();
    } catch (error) {
        return null;
    }
}

async function fetchCodeforcesAvatar(member) {
    if (!Array.isArray(member.links)) {
        throw new Error('Member payload must include a "links" array containing the Codeforces profile.');
    }

    const cfLinkEntry = member.links.find((linkEntry) => linkEntry && typeof linkEntry.link === 'string' && linkEntry.link.trim().length > 0);

    if (!cfLinkEntry) {
        throw new Error('Unable to locate a Codeforces profile link in member.links; required for avatar download.');
    }

    const handle = cfLinkEntry.link.trim();
    if (!handle) {
        throw new Error('Codeforces handle is empty.');
    }

    const handlePattern = /^[A-Za-z0-9_.-]+$/;
    if (!handlePattern.test(handle)) {
        throw new Error(`Invalid Codeforces handle: ${handle}`);
    }

    const profileUrl = `https://codeforces.com/profile/${encodeURIComponent(handle)}`;
    cfLinkEntry.link = profileUrl;

    const apiUrl = `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`;
    console.log(`Fetching Codeforces user info for avatar: ${apiUrl}`);

    const apiResponse = await fetch(apiUrl, {
        headers: {
            'User-Agent': 'CCNU-ACM-Automation/1.0 (+https://github.com/CCNU-ACM-Official)',
            Accept: 'application/json',
        },
    });

    if (!apiResponse.ok) {
        throw new Error(`Failed to fetch Codeforces user info. Status: ${apiResponse.status} ${apiResponse.statusText}`);
    }

    const apiPayload = await apiResponse.json();
    if (!apiPayload || apiPayload.status !== 'OK' || !Array.isArray(apiPayload.result) || apiPayload.result.length === 0) {
        throw new Error('Unexpected response from Codeforces user info API.');
    }

    const userInfo = apiPayload.result[0];
    const avatarCandidate = userInfo.titlePhoto || userInfo.avatar;
    if (!avatarCandidate) {
        throw new Error('Codeforces user info does not include an avatar URL.');
    }

    const avatarUrl = ensureHttpsUrl(avatarCandidate);
    if (!avatarUrl) {
        throw new Error('Failed to normalize Codeforces avatar URL.');
    }

    console.log(`Downloading Codeforces avatar: ${avatarUrl}`);
    const avatarResponse = await fetch(avatarUrl, {
        headers: {
            'User-Agent': 'CCNU-ACM-Automation/1.0 (+https://github.com/CCNU-ACM-Official)',
        },
    });

    if (!avatarResponse.ok) {
        throw new Error(`Failed to download avatar image. Status: ${avatarResponse.status} ${avatarResponse.statusText}`);
    }

    const arrayBuffer = await avatarResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const contentType = avatarResponse.headers.get('content-type');
    let extension = detectExtensionFromContentType(contentType) || detectExtensionFromUrl(avatarUrl) || 'jpg';
    extension = extension.toLowerCase();

    const safeHandle = handle.replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `${safeHandle}.${extension}`;

    const absoluteAvatarDir = resolve(process.cwd(), avatarDir);
    if (!existsSync(absoluteAvatarDir)) {
        mkdirSync(absoluteAvatarDir, { recursive: true });
    }

    const filePath = join(absoluteAvatarDir, fileName);
    writeFileSync(filePath, buffer);

    console.log(`Saved avatar to ${filePath}`);

    return `/avatar/${fileName}`;
}

function formatValue(value, level) {
    if (value === null) {
        return 'null';
    }
    if (Array.isArray(value)) {
        return formatArray(value, level);
    }
    switch (typeof value) {
        case 'object':
            return formatObject(value, level);
        case 'string':
            return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
        case 'number':
        case 'boolean':
            return String(value);
        default:
            throw new Error(`Unsupported value type: ${typeof value}`);
    }
}

function formatArray(arr, level) {
    if (arr.length === 0) {
        return '[]';
    }
    const indent = indentUnit.repeat(level);
    const innerIndent = indentUnit.repeat(level + 1);
    const formattedItems = arr.map((item) => `${innerIndent}${formatValue(item, level + 1)}`);
    return `[\n${formattedItems.join(',\n')}\n${indent}]`;
}

function formatObject(obj, level) {
    const entries = Object.entries(obj);
    if (entries.length === 0) {
        return '{}';
    }
    const indent = indentUnit.repeat(level);
    const innerIndent = indentUnit.repeat(level + 1);
    const formattedEntries = entries.map(([key, value]) => `${innerIndent}${key}: ${formatValue(value, level + 1)}`);
    return `{\n${formattedEntries.join(',\n')}\n${indent}}`;
}

async function main() {
    if (!payloadRaw) {
        throw new Error('Missing MEMBER_PAYLOAD environment variable.');
    }

    let member;
    try {
        member = JSON.parse(payloadRaw);
    } catch (error) {
        console.error('Failed to parse MEMBER_PAYLOAD:', payloadRaw);
        throw error;
    }

    const resolvedGroup = (() => {
        if (groupEnv && groupEnv.trim()) {
            return groupEnv.trim();
        }
        if (typeof member.group !== 'undefined' && String(member.group).trim()) {
            const groupValue = String(member.group).trim();
            delete member.group;
            return groupValue;
        }
        const currentYear = new Date().getFullYear();
        return String(currentYear);
    })();

    delete member.group;

    if (!member.name || typeof member.name !== 'string') {
        throw new Error('Member payload must include a "name" field.');
    }

    const filePath = resolve(process.cwd(), targetFile);
    if (!existsSync(filePath)) {
        throw new Error(`Target file not found: ${filePath}`);
    }

    let content = readFileSync(filePath, 'utf8');
    const arrayMarker = `const members${resolvedGroup} = [`;
    const arrayIndex = content.indexOf(arrayMarker);

    if (arrayIndex === -1) {
        throw new Error(`Could not locate roster array for group "${resolvedGroup}" in ${targetFile}.`);
    }

    const arrayEndIndex = content.indexOf('];', arrayIndex);
    if (arrayEndIndex === -1) {
        throw new Error(`Could not determine end of members${resolvedGroup} array.`);
    }

    const existingSection = content.slice(arrayIndex, arrayEndIndex);
    const escapedName = member.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const namePattern = new RegExp(`name:\\s*["']${escapedName}["']`);
    if (namePattern.test(existingSection)) {
        console.log(`Member "${member.name}" already exists in members${resolvedGroup}. Skipping update.`);
        return;
    }

    const avatarPath = await fetchCodeforcesAvatar(member);
    member.avatar = avatarPath;

    const objectLiteral = formatObject(member, 2);
    const formattedMember = `${indentUnit.repeat(2)}${objectLiteral},\n`;

    const insertionPoint = arrayEndIndex;
    content = `${content.slice(0, insertionPoint)}${formattedMember}${content.slice(insertionPoint)}`;

    writeFileSync(filePath, content, 'utf8');

    console.log(`Inserted member "${member.name}" into members${resolvedGroup}.`);
}

await main().catch((error) => {
    console.error(error);
    process.exit(1);
});
