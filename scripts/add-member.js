import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'node:path';

const targetFile = process.env.TARGET_FILE || 'docs/协会成员.md';
const payloadRaw = process.env.MEMBER_PAYLOAD;
const groupEnv = process.env.MEMBER_GROUP;

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

const indentUnit = '    ';

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
    process.exit(0);
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

const objectLiteral = formatObject(member, 2);
const formattedMember = `${indentUnit.repeat(2)}${objectLiteral},\n`;

const insertionPoint = arrayEndIndex;
content = `${content.slice(0, insertionPoint)}${formattedMember}${content.slice(insertionPoint)}`;

writeFileSync(filePath, content, 'utf8');

console.log(`Inserted member "${member.name}" into members${resolvedGroup}.`);
