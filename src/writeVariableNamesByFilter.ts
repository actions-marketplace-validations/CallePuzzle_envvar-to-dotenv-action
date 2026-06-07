import {write} from './write'

interface InputNamesByFilter {
    variableNamesByFilter: string
    envPath: string
}

const isSafeRegexPattern = (pattern: string): boolean => {
    // Reject common ReDoS patterns: nested quantifiers like (a+)+, (a*)*, etc.
    // Implemented without regular expressions to avoid ReDoS in the checker itself.
    for (let i = 0; i < pattern.length - 1; i++) {
        if ((pattern[i] === ')' || pattern[i] === ']') && (pattern[i + 1] === '+' || pattern[i + 1] === '*')) {
            const openChar = pattern[i] === ')' ? '(' : '[';
            for (let j = i - 1; j >= 0; j--) {
                if (pattern[j] === openChar) {
                    break;
                }
                if (pattern[j] === '+' || pattern[j] === '*') {
                    // Check if the quantifier is escaped (preceded by an odd number of backslashes)
                    let backslashes = 0;
                    for (let k = j - 1; k >= 0 && pattern[k] === '\\'; k--) {
                        backslashes++;
                    }
                    if (backslashes % 2 === 0) {
                        return false;
                    }
                }
            }
        }
    }
    return true;
};

export const writeVariableNamesByFilter = (input: InputNamesByFilter): void => {
    let re: RegExp;
    try {
        re = new RegExp(input.variableNamesByFilter);
    } catch (error) {
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
