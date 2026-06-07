import {write} from './write'

interface InputNamesByFilter {
    variableNamesByFilter: string
    envPath: string
}

const isSafeRegexPattern = (pattern: string): boolean => {
    // Reject common ReDoS patterns: nested quantifiers like (a+)+, (a*)*, etc.
    const dangerousPatterns = [
        /\([^)]*[\+\*][^)]*\)[\+\*]/,
        /\[[^\]]*[\+\*][^\]]*\][\+\*]/,
    ];
    return !dangerousPatterns.some(dp => dp.test(pattern));
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
