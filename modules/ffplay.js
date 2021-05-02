const spawn = require('child_process').spawn;
const util = require('util');
const EventEmitter = require('events').EventEmitter;
const debug = require('debug')('ffplay');
var path = require('path');

function FFplay(folder, file, opts) {

	if (process.env.FFPLAY_PATH === undefined || process.env.FFPLAY_PATH === '') {
		process.env.FFPLAY_PATH = path.join(__dirname, 'ffmpeg', 'ffplay.exe');
	}

	var filePath = path.join(folder, file);
	// Get custom options or fallback to defaults
	opts = opts || ['-nodisp', '-autoexit'];
	opts.unshift(filePath);

	// Spawn process
	this.proc = spawn(process.env.FFPLAY_PATH, opts);

	this.file = file;
	
	//this.ef = function () {
	//	this.proc.kill();
	//}.bind(this);

	//process.on('exit', this.ef);

	this.proc.on('exit', () => {
		if (this.running) {
			this.running = false;
			//process.removeListener('exit', this.ef);
			if (!this.manualStop) {
				setImmediate(() => {
					this.emit('stopped', this.file);
				});
			}
		}
	});


	this.proc.stdout.on('data', (data) => {
		debug(`stdout: ${data}`);
	});

	this.proc.stderr.on('data', (data) => {
		debug(`stderr: ${data}`);
	});

	this.proc.on('close', (code) => {
		debug(`child process exited with code ${code}`);
	});


	this.running = true;
}

util.inherits(FFplay, EventEmitter);

FFplay.prototype.paused = false;
FFplay.prototype.running = false;

FFplay.prototype.pause = function () {
	if (!this.paused) {
		this.proc.kill('SIGSTOP');
		this.paused = true;
		this.emit('paused');
	}
};
FFplay.prototype.resume = function () {
	if (this.paused) {
		this.proc.kill('SIGCONT');
		this.paused = false;
		this.emit('resumed');
	}
};

FFplay.prototype.stop = function () {
	this.manualStop = true;
	this.proc.kill('SIGKILL');
	this.emit('stopped', this.file);
};

module.exports = FFplay;