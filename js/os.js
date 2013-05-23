/*
 * 这操作系统的单例执行能力- 和状态相关操作
 */
var OS = {
  initialize: function() {
    Display.echo("启动 小宇宙 ...");
    initEvaluator();
    this.loadState();
    Filesystem.initialize();

    // 开始每隔60秒自动保存文件系统到本地缓存
    setInterval(OS.saveState, 60000);
  },

  close: function() {
    window.open('', '_self', ''); // 别人的建议 - 允许 window.close() 工作在Chrome浏览器
    window.close();
  },

  reboot: function() {
    location.reload(true);
  },

  loadState: function() {
    if (typeof localStorage != "undefined" && typeof localStorage.fileSystemFrame != "undefined") {
      Display.echo("恢复 文件系统状态 ...");
      var fileSystemFrame = JSON.parse(localStorage.fileSystemFrame);
   } else {
       var fileSystemFrame = defaultFileSystemFrame;
   }
   Filesystem.importFSFrame(fileSystemFrame);
  },

  saveState: function() {
    if (typeof localStorage != "undefined") {
      localStorage.fileSystemFrame = JSON.stringify(Filesystem.exportFSFrame());
    }
  },

  deleteSavedState: function() {
    if (typeof localStorage != "undefined") {
      delete localStorage.fileSystemFrame;
    }
  }
}

/*
 * 显示单例与终端
 */
var Display = {
  terminal: null, // 终端对象
  lineContinuationString: '.. ',

  initialize: function(term) {
    this.terminal = term;
  },

  /*
   * 预处理显示输出
   */
  preprocess: function(str) {
		str = prepareString(str);
		if (str !== null) {
			str = str.replace(/lambda/g, '&lambda;').replace(/true/g, '#t').replace(/false/g, '#f');
		}
  	return str;
  },

  /*
   * 过程和显示输出
   */
  echo: function(str) {
    str = this.preprocess(str);
    if (str !== null) {
    	this.terminal.echo(str);
    	this.refresh();
    }
  },

  /*
   * 刷新终端:调整+滚动到底
   */
  refresh: function() {
    // 超时需要避免一些愚蠢的UI问题
    setTimeout( function() {
      Display.terminal.resize();
      $(document).scrollTop($(document).height());
    }, 100);
  },

  /*
   * 调整终端以避免重叠和覆盖
   */
  resize: function() {
    if ($('.overlayRight').length == 0) {
      var newWidth = $(document).width() - 20;
    } else {
      var newWidth = $('.overlayRight').map(function (i, x) {return x.offsetLeft;}).sort(function (a,b) {return a - b})[0] - 20;
    }

    if (this.terminal.width() != newWidth) {
      this.terminal.resize(newWidth, this.terminal.height());
    }
  },

  /*
   * 添加一个新行和删除之前的命令从输出和历史
   */
  newline: function(command) {
    this.terminal.set_command(command + '\n' + this.lineContinuationString); // 开始新行命令
    this.terminal.lines(this.terminal.lines().slice(0,-1)); // 删除最后一行输出
    for (i = 1; i < command.split(/\n/).length; i++) {
      this.terminal.history().pop(); // 一旦在第一，需要对每一行pop
    }
    this.terminal.refresh(); // 刷新终端
  },

  /*
   * 返回终端对象直接交互
   */
  terminal: function() {
    return this.terminal;
  },

  debugPrint: function(txt) {
  	if (Processes.getCurrentProcess().isTerminal) {
  		console.log(txt);
  	}
  }
}

/*
 * 文件系统单例执行文件相关操作
 */
var Filesystem = {
  fs: null, // 文件系统路径
  currentDir: '/', //  当前目录

  /*
   * 初始化文件系统(称为从操作系统初始化())
   */
  initialize: function() {
    Display.echo('启动 文件系统 ...');

    // 从 /启动 运行所有文件
    for (var fname in Filesystem.getDir('/startup')) {
      var contents = Filesystem.getFile('/startup/' + fname).contents;
      evaluate(contents);
    }
  },

  //
  // 辅助函数
  //

  importFSFrame: function(fileSystemFrame) {
    this.fs = fileSystemFrame['__fileSystem'];

    // 添加文件系统到求值环境
    globalEnvironment.push(fileSystemFrame);
  },

  exportFSFrame: function() {
    return {'__fileSystem': this.fs};
  },

  /*
   * 得到新的路径 (例如“cd”命令)
   */
  calculatePath: function(dir) {
    if (dir == '') { // 当前目录
      return this.currentDir;
    } else if (dir == '/') { // 顶层目录
      return '/';
    } else if (dir[0] == '/') { // 从顶层目录计算
      return dir;
    } else { // 从当前目录计算
      var pathComponents = this.currentDir.split('/');
      var dirComponents = dir.split('/');
      dirComponents.forEach(function (comp) {
        if (comp == '..') {
          pathComponents.pop();
        } else {
          pathComponents.push(comp);
        }
      });
      var newPath = pathComponents.join('/').replace(/\/+/g,'/');
      return (newPath != '') ? newPath : '/';
    }
  },

  /*
   * 例如 '/dir1/dir2/file' => 'file'
   */
  getNameFromPath: function(path) {
    var pathSplit = path.split('/');
    return pathSplit[pathSplit.length - 1];
  },

  /*
   * 例如 '/dir1/dir2/file' => '/dir1/dir2'
   */
  getFolderFromPath: function(path) {
    var pathSplit = path.split('/');
    if (path[0] == '/') { // 顶层目录
      var folder = pathSplit.slice(0, pathSplit.length - 1).join('/');
      return (folder == '')? '/' : folder;
    } else {
      return this.calculatePath(pathSplit.slice(0, pathSplit.length - 1).join('/'));
    }
  },

  /*
   * 从一个路径得到一个文件
   */
  getFile: function(path) {
    return this.fs[this.getFolderFromPath(path)][this.getNameFromPath(path)];
  },

  /*
   * 获得目录中的所有文件
   */
  getDir: function(dir) {
    return this.fs[dir];
  },

  /*
   * 创建/更新文件在指定的路径
   */
  setFile: function(path, file) {
    this.fs[this.getFolderFromPath(path)][this.getNameFromPath(path)] = file;
  },

  /*
   * 创建/更新目录在指定路径
   */
  setDir: function(path, dir) {
    this.fs[path] = dir;
  },

  /*
   * 删除文件路径
   */
  deleteFileAtPath: function(path) {
    delete this.fs[this.getFolderFromPath(path)][this.getNameFromPath(path)];
  },

  /*
   * 删除目录
   */
  deleteDir: function(path) {
    delete this.fs[path];
  },

  //
  // 异常处理
  //


  /*
   * 如路径无效，抛出异常
   */
  checkPathExists: function(path) {
    if (this.fs[path] === undefined) {
      throw '文件系统错误: 路径 "' + path + '" 不存在';
    }
  },

  /*
   * 如果文件不存在，抛出异常
   */
  checkFileExists: function(file, path) {
    if (file === undefined) {
      throw '文件系统错误: 文件 "' + path + '" 不存在';
    }
  },

  /*
   * 如果文件是一个目录，抛出异常
   */
  checkNotADir: function(file, path) {
    if (file !== undefined && file.type == 'dir') {
      throw '文件系统错误: "' + path + '" 是一个目录';
    }
  },

  /*
   * 如果文件/目录已经存在，抛出异常
   */
  checkAlreadyExists: function(file, path) {
    if (file !== undefined) {
      throw '错误: "' + path + '" 已经存在';
    }
  },

  //
  // 文件系统函数库
  //

  /*
   * 目录中列表文件
   */
  listFiles: function(dir) {
    var workingDir = dir ? this.calculatePath(dir) : this.currentDir;
    this.checkPathExists(workingDir);

    var fileNames = [];
    for (var fname in this.getDir(workingDir)) {
      fileNames.push(fname);
    }
    fileNames.sort();
    return fileNames;
  },

  /*
   * 更改当前目录
   * 返回新的路径
   */
  navigate: function(path) {
    var newPath = this.calculatePath(path);
    this.checkPathExists(newPath);
    this.currentDir = newPath;
    return newPath;
  },

  /*
   * 返回文件内容
   */
  readFile: function(path) {
    var file = this.getFile(path);
    this.checkFileExists(file, path);
    this.checkNotADir(file, path);
    return file.contents;
  },

  /*
   * 创建一个目录
   * 返回其路径
   */
  makeDir: function(name) {
    var newDirPath = this.calculatePath(name);
    this.checkAlreadyExists(this.getDir(name), newDirPath);
    this.setDir(newDirPath, {});
    this.setFile(name, { 'type': 'dir' });
    return newDirPath;
  },

  /*
   * 创建新文件
   * 返回其路径
   */
  newFile: function(path) {
    var file = this.getFile(path);
    this.checkAlreadyExists(file);
    this.setFile(path, { 'type': 'file', 'contents': '' });
    return this.calculatePath(path);
  },

  /*
   * 保存文件
   * 返回其路径
   */
  saveFile: function(path, contents) {
    var file = this.getFile(path);
    this.checkNotADir(file);
    this.setFile(path, { 'type': 'file', 'contents': contents });
    return this.calculatePath(path);
  },

  /*
   * 删除一个文件或目录
   * 返回其路径
   */
  removeItem: function(path) {
    var file = this.getFile(path);
    this.checkFileExists(file, path);
    if (file.type == 'dir') {
      var dirPath = this.calculatePath(path);
      this.deleteDir(dirPath);
    }
    this.deleteFileAtPath(path);
    return this.calculatePath(path);
  },

  /*
   * 复制一个文件或目录到一个新的路径
   * 返回 {旧路径, 新路径}
   */
  copyItem: function(path, newPath) {
    var file = this.getFile(path);
    var oldPath = this.calculatePath(path);
    var newPath = this.calculatePath(newPath);
    var newFolderPath = this.getFolderFromPath(newPath);

    this.checkFileExists(file, path);
    this.checkPathExists(newFolderPath);

    // 如果复制到一个目录,添加当前文件名的路径
    if (this.getFile(newPath) && this.getFile(newPath).type == 'dir') {
      newPath = newPath + '/' + this.getNameFromPath(path);
    }

    if (file.type == 'dir') {
      this.setDir(newPath, this.getDir(oldPath));
      this.setFile(newPath, { 'type': 'dir' });
    } else {
      this.setFile(newPath, { 'type': 'file', 'contents': file.contents });
    }

    return {
      'oldPath': oldPath,
      'newPath': newPath
    };
  }
};

/*
 * 单处理线程的进程
 */
var Processes = {
	processList: [],
	currentPID: null,

	terminalProcess: {
		'pid': -1,
		'name': 'Terminal',
		'isTerminal': true,

		// 性能
		'timeStarted': new Date().getTime(),
		'timeElapsed': function () { return ((new Date().getTime()) - this.timeStarted); },
		'evals': 0
	},

	getProcessByID: function(pid) {
		if (pid == -1 || pid == null) {
			return this.terminalProcess;
		} else if (this.processList[pid] === undefined || this.processList[pid].terminated) {
			throw '没有进程与PID ' + pid;
		} else {
			return this.processList[pid];
		}
	},

	getCurrentProcess: function() {
		return this.getProcessByID(this.currentPID);
	},

	setCurrentPID: function(pid) {
		if (pid !== undefined) {
			Processes.currentPID = pid;
		} else {
			Processes.currentPID = null;
		}
	},

	/*
	 * 增加当前进程的求值计数
	 */
	incrementEvals: function() {
		var process = this.getCurrentProcess();
		process.evals++;
	},

	/*
	 * 启动一个新的进程,返回其PID
	 */
	startProcess: function(name, contents, refreshRate) {
		var pid = this.processList.length;

		// 启动间隔
		var interval = setInterval(function () {
			var result = evaluate(contents, pid);
			if (result !== undefined) {
				Display.echo(result);
			}
		}, refreshRate);

		// 添加到进程列表
		this.processList.push({
			'pid': pid,
			'name': Filesystem.getNameFromPath(name),
			'process': interval,
			'code': contents,
			'terminated': false,
			'overlays': [],

			// 性能
			'timeStarted': new Date().getTime(),
			'timeElapsed': function () { return ((new Date().getTime()) - this.timeStarted); },
			'interval': refreshRate,
			'evals': 0
		});

		return pid;
	},

	/*
	 * 杀死一个进程PID,返回结果
	 */
	killProcess: function(pid) {
		var proc = this.getProcessByID(pid);
		if (proc.isTerminal) {
			throw '不能杀死终端';
		}
		clearInterval(proc.process);
		proc.terminated = true;

		// remove associated overlays
		proc.overlays.forEach(function (name) {
			$('#overlays #' + name).remove();}
		);

		return new Array('进程与PID ' + pid + ' [' + proc.name + '] 终止');
	},

	/*
	 * 返回一个列表的运行过程
	 */
	listProcesses: function() {
		var procs = this.processList.filter(function (proc) {return !proc.terminated});
		procs.unshift(this.terminalProcess);
		return procs;
	},

	/*
	 * 返回 求值/秒 的性能的一个进程PID
	 */
	getPerformance: function(pid) {
		var proc = this.getProcessByID(pid);
		var evalsPerMS = proc.evals / (proc.timeElapsed());
		var evalsPerSec = Math.round(evalsPerMS * 1000000)/1000;
		return evalsPerSec;
	},

	/*
	 * 注册一个名为叠加属于当前进程
	 */
	registerOverlay: function(name) {
		if (this.currentPID != null && this.getProcessByID(this.currentPID).overlays.indexOf(name) < 0) {
			this.getProcessByID(this.currentPID).overlays.push(name);
		}
	}
}
