import { exec } from 'child_process'

export async function runCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`error: ${error.message}`)
        return
      }

      if (stderr) {
        const match = stderr.match(/&program_id = "([^"]+)"/)
        if (match && match[1]) {
          resolve(match[1])
        }
        if (stdout) {
          resolve(stdout)
        }
        if (stderr.includes('No such file or directory')) {
          reject('KeyPair file not found. Please ensure the path is correct.')
        } else {
          reject(`stderr: ${stderr}`)
        }
        return
      }
      resolve(stdout)
    })
  })
}
