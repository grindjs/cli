import './Command'
import './AbortError'
import './PromptExitError'

import repl from 'repl'
import chalk from 'chalk'

export class PromptCommand extends Command {
	name = 'prompt'
	description = 'Starts an interactive shell to execute commands.'

	run() {
		const exit = process.exit

		this.cli._cli.name = '$'
		const name = require(this.app.paths.package).name || 'grind'

		const r = repl.start({
			prompt: `${chalk.blue(name)} ${chalk.yellow('$')} `,
			eval: (cmd, context, filename, callback) => this.eval(cmd, callback)
		})

		r.on('exit', () => exit(0))
	}

	eval(cmd, callback) {
		cmd = (cmd || '').trim()

		if(cmd.length === 0) {
			return callback()
		}

		const exit = process.exit
		let ignoreErrors = false

		process.exit = () => {
			ignoreErrors = true

			setTimeout(() => {
				callback()
				process.exit = exit
			}, 10)

			throw new PromptExitError
		}

		const argv = [ 'node', __filename ].concat(cmd.split(/\s+/))

		this.cli.run(argv).catch(err => {
			if(ignoreErrors) {
				return
			}

			if(err instanceof PromptExitError || err instanceof AbortError) {
				err = null
			}

			process.exit = exit
			callback(err)
		})
	}

}
