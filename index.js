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

	debug() {
        if (16 <= this.level) {
            let logger = this.logger.getDebugLogger();
            logger.debug.apply(logger, arguments);
        }
    }

    info() {
        if (8 <= this.level) {
            let logger = this.logger.getInfoLogger();
            logger.info.apply(logger, arguments);
        }
    }

    error() {
        if (2 <= this.level) {
            let logger = this.logger.getErrorLogger();
            logger.error.apply(logger, arguments);
        }
    }

	access_log(options = {}) {
		return (req, res, next) => {
			this.logger.middleware(req, res, next, options);
		};
	}
}

module.exports = RainLog;
