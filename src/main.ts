import * as core from '@actions/core'
import packageJson, { PackageNotFoundError } from 'package-json'
import * as path from 'path'
import * as fs from 'fs'

/** An _incomplete_ representation of package.json. */
interface PackageFile {
    name: string
    version: string
    [key: string]: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

export async function readPackageFile(packagePath: string): Promise<PackageFile> {
    return await new Promise((resolve, reject) => {
        const packageFilePath = path.join(packagePath, 'package.json')
        core.debug(`Reading ${packageFilePath}…`)
        try {
            fs.readFile(packageFilePath, (err, data) => {
                if (err) reject(err)
                resolve(JSON.parse(data.toString()))
            })
        } catch (err) {
            reject(err)
        }
    })
}

async function run(): Promise<void> {
    try {
        const packagePath = core.getInput('path') || '.'
        const allowFirstVersion = core.getInput('allow-first-version') === 'true'
        const packageFile = await readPackageFile(packagePath)
        core.debug(`Fetching package ${packageFile.name} information from npm…`)
        try {
            const packageNpm = await packageJson(packageFile.name, { allVersions: true })
            const isNewVersion = !Object.hasOwn(packageNpm.versions, packageFile.version)
            core.setOutput('is-new-version', isNewVersion.toString())
            core.setOutput('is-first-version', 'false')
            core.setOutput('published-version', packageNpm['dist-tags'].latest)
            core.setOutput('committed-version', packageFile.version)
        } catch (err: unknown) {
            if (err instanceof PackageNotFoundError && allowFirstVersion) {
                core.setOutput('is-first-version', 'true')
                core.setOutput('is-new-version', 'true')
                core.setOutput('committed-version', packageFile.version)
            } else {
                throw err
            }
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            core.setFailed(error.message)
        } else {
            core.setFailed('An unknown error occurred')
        }
    }
}

run()
