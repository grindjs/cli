import './PromptCommand'
import path from 'path'

export class CliRunner {
	bootstrapper = null

	constructor(bootstrapper) {
		this.bootstrapper = bootstrapper
	}

	run() {
		if(process.argv.length > 2 && process.argv[2] === 'prompt') {
			return this.prompt()
		} else {
			return this.cli()
		}
	}

	async cli() {
		const app = await this.bootstrap()
		return app.cli.run()
	}

	async prompt() {
		let app = await this.bootstrap()
		const prompt = new PromptCommand(app, app.cli)
		const watchDirs = [ ]

		for(const arg of process.argv) {
			if(!arg.startsWith('--watch=')) {
				continue
			}

			for(const dir of arg.substr(8).split(',')) {
				if(dir.substring(0, 1) === '/') {
					watchDirs.push(dir)
				} else {
					watchDirs.push(path.join(process.cwd(), dir))
				}
			}

			break
		}

		if(watchDirs.length > 0) {
			const watcher = require('chokidar').watch(watchDirs)
			let restarting = false

			watcher.on('ready', () => {
				watcher.on('all', async () => {
					if(restarting) {
						return
					} else {
						restarting = true
					}

					files:
					for(const file of Object.keys(require.cache)) {
						dirs:
						for(const dir of watchDirs) {
							if(file.indexOf(dir) !== 0) {
								continue dirs
							}

							delete require.cache[file]
							continue files
						}
					}

					try {
						app = await this.bootstrap()
					} catch(err) {
						Log.error('Error loading changes', err.stack)
						restarting = false
						return
					}

					prompt.app = app
					prompt.cli = app.cli
					restarting = false
				})
			})
		}

		prompt.run()
	}

	bootstrap() {
		const app = this.bootstrapper()
		return app.boot().then(() => app.cli.boot()).then(() => app)
	}

}
