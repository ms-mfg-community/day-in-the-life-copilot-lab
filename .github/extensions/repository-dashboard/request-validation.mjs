import { DashboardRequestError } from "./request-security.mjs";

export const MAX_REQUEST_BYTES = 16_384;
const MAX_AGENT_NAME_CHARACTERS = 128;
const MAX_LOGIN_CHARACTERS = 39;
const SHA256_HEX_PATTERN = "^[0-9a-f]{64}$";

const ISSUE_NUMBER_RULES = { type: "integer", minimum: 1 };
const RUN_ID_RULES = { type: "integer", minimum: 1 };
const ASSIGNEE_RULES = { type: "string", minLength: 1, maxLength: MAX_LOGIN_CHARACTERS };

export const ASSIGN_ISSUE_BODY_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["assignee"],
    properties: { assignee: ASSIGNEE_RULES },
};

export const ASSIGN_ISSUE_ACTION_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["issueNumber", "assignee"],
    properties: { issueNumber: ISSUE_NUMBER_RULES, assignee: ASSIGNEE_RULES },
};

export const RUN_DETAILS_ACTION_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["runId"],
    properties: { runId: RUN_ID_RULES },
};

export const START_WORK_BODY_SCHEMA = {
    type: "object",
    additionalProperties: false,
    required: ["executionLocation", "kickoffDigest"],
    properties: {
        agent: { type: "string", minLength: 1, maxLength: MAX_AGENT_NAME_CHARACTERS },
        executionLocation: { type: "string", enum: ["local", "cloud"] },
        assignee: { type: "string", maxLength: MAX_LOGIN_CHARACTERS },
        kickoffDigest: { type: "string", pattern: SHA256_HEX_PATTERN },
    },
};

export const EXECUTION_LOCATIONS = new Set(
    START_WORK_BODY_SCHEMA.properties.executionLocation.enum,
);

function reject(message) {
    throw new DashboardRequestError(400, message);
}

function validateString(name, value, rules) {
    if (typeof value !== "string") {
        reject(`"${name}" must be a string.`);
    }
    if (rules.enum && !rules.enum.includes(value)) {
        reject(`"${name}" must be one of: ${rules.enum.join(", ")}.`);
    }
    if (rules.minLength !== undefined && value.length < rules.minLength) {
        reject(`"${name}" must not be empty.`);
    }
    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        reject(`"${name}" must be ${rules.maxLength} characters or fewer.`);
    }
    if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
        reject(`"${name}" is not in the expected format.`);
    }
}

function validateInteger(name, value, rules) {
    if (!Number.isSafeInteger(value)) {
        reject(`"${name}" must be an integer.`);
    }
    if (rules.minimum !== undefined && value < rules.minimum) {
        reject(`"${name}" must be ${rules.minimum} or greater.`);
    }
}

function validateProperty(name, value, rules) {
    if (rules.type === "string") {
        validateString(name, value, rules);
        return;
    }
    if (rules.type === "integer") {
        validateInteger(name, value, rules);
        return;
    }
    reject(`"${name}" has an unsupported type.`);
}

export function validateInput(schema, value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        reject("The request body must be a JSON object.");
    }

    const properties = schema.properties ?? {};
    for (const name of Object.keys(value)) {
        if (!Object.hasOwn(properties, name)) {
            reject(`"${name}" is not a supported field.`);
        }
    }
    for (const name of schema.required ?? []) {
        if (!Object.hasOwn(value, name)) {
            reject(`"${name}" is required.`);
        }
    }
    for (const [name, rules] of Object.entries(properties)) {
        if (Object.hasOwn(value, name)) {
            validateProperty(name, value[name], rules);
        }
    }
    return value;
}

async function readJsonBody(req) {
    const chunks = [];
    let size = 0;

    for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_REQUEST_BYTES) {
            throw new DashboardRequestError(413, "The request body is too large.");
        }
        chunks.push(chunk);
    }

    if (chunks.length === 0) {
        return {};
    }

    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
        throw new DashboardRequestError(400, "The request body is not valid JSON.");
    }
}

export async function readValidatedBody(req, schema) {
    return validateInput(schema, await readJsonBody(req));
}
