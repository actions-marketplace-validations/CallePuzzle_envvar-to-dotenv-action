jest.mock('@actions/core', () => {
    return {
        info: () => {},
        getInput: () => '',
        setFailed: () => {},
        setSecret: () => {},
        exportVariable: () => {},
    };
});

import * as fs from 'node:fs';
import {main} from "../src/main";
import {write} from "../src/write";

describe('Action run', () => {
    const envPath = __dirname + '/.env';

    let expectedFilePath: string | undefined;

    process.env.KEY1 = 'VALUE1';
    process.env.KEY2 = 'VALUE2';

    process.env.PRE_KEY1 = 'VALUE1';
    process.env.PRE_KEY2 = 'VALUE2';


    beforeEach(() => {
        expectedFilePath = undefined;
        if (fs.existsSync(envPath)) {
            fs.unlinkSync(envPath);
        }
    });

    afterEach(() => {
        if (expectedFilePath !== undefined) {
            const expected = fs.readFileSync(expectedFilePath);
            const actual = fs.readFileSync(envPath);

            expect(expected.equals(actual)).toBe(true);
        }
    });

    it('test variable name key1', () => {
        expectedFilePath = __dirname + '/results/variable-name.env';

        main({
            variableName: 'KEY1',
            envPath: envPath,
        });
    });

    it('test variable names key1 and key2', () => {
        expectedFilePath = __dirname + '/results/variable-names.env';

        main({
            variableNames: 'KEY1,KEY2',
            envPath: envPath,
        });
    });

    it('test regex ^KEY', () => {
        expectedFilePath = __dirname + '/results/variable-names.env';

        main({
            variableNamesByFilter: '^KEY',
            envPath: envPath,
        });
    });

    it('test regex ^PRE_(KEY.*)', () => {
        expectedFilePath = __dirname + '/results/variable-names.env';

        main({
            variableNamesByFilter: '^PRE_(KEY.*)',
            envPath: envPath,
        });
    });

    it('test undefined variable does not create file', () => {
        main({
            variableName: 'UNDEFINED_VAR_KEY',
            envPath: envPath,
        });

        expect(fs.existsSync(envPath)).toBe(false);
    });

    it('test path traversal is blocked', () => {
        expect(() => {
            write({
                key: 'KEY1',
                value: 'VALUE1',
                envPath: '../outside-workspace.env',
            });
        }).toThrow('Path traversal detected');
    });

    it('test invalid regex throws error', () => {
        expect(() => {
            main({
                variableNamesByFilter: '[invalid',
                envPath: envPath,
            });
        }).toThrow('Invalid regex pattern');
    });

    it('test dangerous regex throws error', () => {
        expect(() => {
            main({
                variableNamesByFilter: '(a+)+',
                envPath: envPath,
            });
        }).toThrow('Potentially unsafe regex pattern detected');
    });

    it('test special characters in value', () => {
        process.env.SPECIAL_VAR = 'value=with=equals and spaces';

        main({
            variableName: 'SPECIAL_VAR',
            envPath: envPath,
        });

        const content = fs.readFileSync(envPath, 'utf-8');
        expect(content).toBe('SPECIAL_VAR=value=with=equals and spaces');

        delete process.env.SPECIAL_VAR;
    });
});
