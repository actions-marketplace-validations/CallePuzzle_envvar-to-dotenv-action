import * as core from '@actions/core'
import * as fs from "fs";
import * as path from "path";
import dotenv, { DotenvParseOutput } from "dotenv";

interface Variable {
    key: string
    value: string
    envPath: string
}

export const write = (variable: Variable): void => {

    core.setSecret(variable.value);
    core.exportVariable(variable.key, variable.value);

    const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
    const resolvedPath = path.resolve(variable.envPath);
    const resolvedWorkspace = path.resolve(workspace);
    const relativePath = path.relative(resolvedWorkspace, resolvedPath);

    if (relativePath.startsWith('..')) {
        throw new Error(`Path traversal detected: ${variable.envPath} resolves outside of workspace`);
    }

    let content: DotenvParseOutput = {[variable.key]: variable.value};
    if (fs.existsSync(resolvedPath)) {
        content = {...dotenv.parse(fs.readFileSync(resolvedPath)), ...content};
    }

    const envVars = Object.entries(content)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    fs.writeFileSync(resolvedPath, envVars);
};
