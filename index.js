'use strict';
const Logger = require('./lib/logger');

const Levels = {
	'debug': 16,
	'info': 8,
	'warn': 4,
	'error': 2,
	'fatal': 1
};
const logType = {
	'file': 0,	//default
	'std': 1
};
//默认日志级别，生产环境为info，其他环境debug
if (process.env.NODE_ENV === 'production') {
	var defaultLevel = 'info',
		defaultType = 'file';
} else {
	var defaultLevel = 'debug',
		defaultType = 'std';
}

class RainLog {
	constructor(options) {
		if (typeof options.name !== 'string') {
			throw new Error('what is your name?');
		}
		let level = defaultLevel;
		if (options.level && Levels[options.level]) {
			level = options.level;
		}
		this.level = Levels[level];
		let type = logType[options.logType] || logType[defaultType];
		this.logger = new Logger(options.name, type);
	}

	debug(data) {
		if (16 <= this.level) {
			this.logger.getDebugLogger().debug(data);
		}
	}

	info(data) {
		if (8 <= this.level) {
			this.logger.getInfoLogger().info(data);
		}
	}

	error(err) {
		if (2 <= this.level) {
			this.logger.getErrorLogger().error(err);
		}
	}

	access_log() {
		return (req, res, next) => {
			this.logger.middleware(req, res, next);
		};
	}
}

module.exports = RainLog;
