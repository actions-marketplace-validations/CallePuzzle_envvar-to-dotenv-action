import {write} from './write'

interface InputNamesByFilter {
    variableNamesByFilter: string
    envPath: string
}

const isUnescapedQuantifier = (pattern: string, index: number): boolean => {
    let backslashCount = 0;
    for (let i = index - 1; i >= 0 && pattern[i] === '\\'; i--) {
        backslashCount++;
    }
    return backslashCount % 2 === 0;
};

const hasNestedQuantifier = (pattern: string, closeIndex: number): boolean => {
    const openChar = pattern[closeIndex] === ')' ? '(' : '[';
    for (let i = closeIndex - 1; i >= 0; i--) {
        if (pattern[i] === openChar) {
            return false;
        }
        if ((pattern[i] === '+' || pattern[i] === '*') && isUnescapedQuantifier(pattern, i)) {
            return true;
        }
    }
    return false;
};

const isSafeRegexPattern = (pattern: string): boolean => {
    // Reject common ReDoS patterns: nested quantifiers like (a+)+, (a*)*, etc.
    // Implemented without regular expressions to avoid ReDoS in the checker itself.
    for (let i = 0; i < pattern.length - 1; i++) {
        const isClosingGroup = pattern[i] === ')' || pattern[i] === ']';
        const isFollowedByQuantifier = pattern[i + 1] === '+' || pattern[i + 1] === '*';
        if (isClosingGroup && isFollowedByQuantifier && hasNestedQuantifier(pattern, i)) {
            return false;
        }
    }
    return true;
};

export const writeVariableNamesByFilter = (input: InputNamesByFilter): void => {
    let re: RegExp;
    try {
        re = new RegExp(input.variableNamesByFilter);
    } catch {
        throw new Error(`Invalid regex pattern: ${input.variableNamesByFilter}`);
    }

    if (!isSafeRegexPattern(input.variableNamesByFilter)) {
        throw new Error(`Potentially unsafe regex pattern detected: ${input.variableNamesByFilter}`);
    }

    for (let envVar in process.env) {
        if (re.test(envVar)) {
            const value = process.env[envVar];

            // Regex has group
            const regex = re.exec(envVar);
            if (regex !== null && typeof regex[1] === "string") {
                envVar = regex[1];
            }

            if (value !== undefined) {
                write({
                    key: envVar,
                    value: value,
                    envPath: input.envPath
                });
            }
        }
    }
};
