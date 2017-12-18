const bunyan = require('bunyan');
const uuid = require('uuid/v4');

class Logger {
	constructor(name, logType) {
		this.name = name;
		this.logType = logType;
		this.debugLogger = null;
		this.infoLogger = null;
		this.errorLogger = null;
	}

	getDebugLogger() {
		if (this.debugLogger) {
			return this.debugLogger;
		}
		if (this.logType === 0) {
			var stream = [{
				path: `logs/${this.name}-debug.log`,
				level: 'debug'
			}];
		} else {
			var stream = [{
				level: 'debug',
				stream: process.stdout
			}];
		}
		this.debugLogger = bunyan.createLogger({
			name: this.name,
			streams: stream
		});
		return this.debugLogger;
	}

	getInfoLogger() {
		if (this.infoLogger) {
			return this.infoLogger;
		}
		if (this.logType === 0) {
			var stream = [{
				path: `logs/${this.name}-access.log`,
				level: 'info'
			}];
		} else {
			var stream = [{
				level: 'info',
				stream: process.stdout
			}];
		}
		this.infoLogger = bunyan.createLogger({
			name: this.name,
			streams: stream
		});
		return this.infoLogger;
	}

	getErrorLogger() {
		if (this.errorLogger) {
			return this.errorLogger;
		}
		if (this.logType === 0) {
			var stream = [{
				level: 'error',
                path: `logs/${this.name}-error.log`
            }];
		} else {
			var stream = [{
				level: 'error',
				stream: process.stderr
            }];
		}
		this.errorLogger = bunyan.createLogger({
            name: this.name,
            streams: stream,
			serializers: {
				err: (err) => {
					if (!err || !err.stack) {
						return err;
					}
					return {
						message: err.message,
						name: err.name,
						stack: this.getFullErrorStack(err),
						code: err.code,
						status: err.status,
						data: err.data
					};
				}
			}
        });
		return this.errorLogger;
	}

	getFullErrorStack(ex) {
		let ret = ex.stack || ex.toString();
		if (ex.cause && typeof (ex.cause) === 'function') {
			let cex = ex.cause();
			if (cex) {
				ret += '\nCaused by: ' + this.getFullErrorStack(cex);
			}
		}
		return (ret);
	}

	middleware(req, res, next) {
		req.startTime = Date.now();
        req.req_id = req.query.req_id || uuid();
		res.on('finish', accessLog);
		let logger = this.getInfoLogger();
		function accessLog() {
			let responseTime = Date.now() - req.startTime,
				ip = (req.headers['x-forwarded-for'] || req.ip || req._remoteAddress ||
				(req.socket &&
					(req.socket.remoteAddress ||
						(req.socket.socket && req.socket.socket.remoteAddress)
					)
				)).split(',')[0],
				res_body;

			try {
                JSON.stringify(res.body);
				res_body = res.body;
            } catch (e) {
                res_body = '[unreadable data]';
            }
			let statusCode = (res.body && res.body.hasOwnProperty('status')) ? res.body.status : '66666';

			let data = {
				req_id: req.req_id,
				receive_time: new Date(req.startTime),
				ip: ip,
				url: req.url,
				path: req.url.replace(/\?.*/, '').replace(/\/+$/g, ""),
				method: req.method,
				body: req.body,
				cost: responseTime,
				response: res_body,
				http_status_code: res.statusCode,
				custom_status_code: statusCode,
				referer: req.header('referer') || req.header('referrer') || '-'
			}

			logger.info(data);
		}
		next();
	}
}

module.exports = Logger;
