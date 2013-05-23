/*
 * 原始函数定义
 */

var primitiveProcedures = {
	// 钩到底层环境
	'environment': function() {
		var variables = [];
		for (var i = 0; i < globalEnvironment.length; i++) {
			for (var variable in globalEnvironment[i]) {
				variables.push(variable);
			}
		}
		variables.sort();
		return variables;
	},
	'inspect-primitive': function(args) {
		if (args.length == 1 && args[0].primitive !== undefined) {
			return args[0].body;
		} else {
			throw 'js-inspect 错误: JavaScript函数的要求,但是得到 ' + args;
		}
	},
	'js-apply': function(args) {
		function prepareArg(arg, isObj) {
			if (typeof arg == 'string' || arg.isString) {
				return arg.toEvalString();
			} else if (typeof arg == 'object') {
				arg = arg.map(function (elt) {
					return prepareArg(elt);
				}).join(',');
				if (isObj) {
					arg = '[' + arg + ']';
				}
				return arg;
			} else {
				return arg;
			}
		}

		var jsFunc = args[0];
		if (args.length == 2) {
			var jsArgs = prepareArg(args[1]);
		} else if (args.length == 3) {
			var jsObj = prepareArg(args[1], true);
			jsFunc = jsObj + '.' + jsFunc;
			var jsArgs = prepareArg(args[2]);
		} else {
			throw 'js-apply 错误: 预计2或3的参数,但是得到 ' + args.length;
		}

		return eval(jsFunc + '(' + jsArgs + ')');
	},

	// 算法
	'+': function(args) {
		var string = false;
		args = args.map(function (arg) {
			if (arg.isString) { // 字符串衔接
				string = true;
				return arg.toEvalString();
			} else if (typeof arg == 'string') { // 引用文字连接
				return arg.toEvalString();
			} else {
				return arg;
			}
		});

		result = eval(args.join('+'));
		if (string) {
			result = constructString(result);
		}
		return result;
	},
	'-': function(args) {
		if (args.length == 1) {
			return (- args[0]);
		} else {
			return (args[0] - args[1]);
		}
	},
	'*': function(args) {
		return eval(args.join('*'));
	},
	'/': function(args) {
		if (args.length == 1) {
			return (1 / args[0]);
		} else {
			return (args[0] / args[1]);
		}
	},

	// 比较
	'=': function (args) {
		if (args[0].isString && args[1].isString) {
			return (args[0].toString() == args[1].toString());
		} else {
			return (args[0] == args[1]);
		}
	},
	'!=': function (args) {return (args[0] != args[1])},
	'>': function (args) {return (args[0] > args[1])},
	'<': function (args) {return (args[0] < args[1])},
	'>=': function (args) {return (args[0] >= args[1])},
	'<=': function (args) {return (args[0] <= args[1])},

	// 逻辑
	'not': function (args) {return !(args[0]);},
	'and': function (args) {return eval(args.join('&&'));},
	'or': function (args) {return eval(args.join('||'));},

	// 列表操作
	'cons': function (args) {
		if (args[1].isList) {
			// (1 (2 3)) => (1 2 3), 因为我们代表一切列表(不是点对)
			// 在底层环境
			newList = clone(args[1]);
			newList.unshift(args[0]);
			return newList;
		} else {
			return new Pair(args[0], args[1]);
		}
	},
	'car': function (args) {
		var arg = args[0];
		return arg.car();
	},
	'cdr': function (args) {
		var arg = args[0];
		return arg.cdr();
	},
	'list': function (args) {
		return args;
	},
	'length': function (args) {
		return args[0].length;
	},

	// 杂项 Lisp
	'do-nothing': function () {
		return;
	},
	'newline': function () {
		return '\n';
	},
	'display': function (args) {
		Display.echo(args[0]);
		return;
	},
	'sort': function (args) {
		// 这并不需要一个原始,但它是一个痛苦的实现,
		// 我宁愿使用JavaScript的基本分类
		// 用法: (sort lst [keyfunc])
		return args[0].sort(function (a, b) {
			var keyA = (args.length > 1) ? lispApply(args[1], [a]) : a;
			var keyB = (args.length > 1) ? lispApply(args[1], [b]) : b;
			if (keyA < keyB)
				return -1;
			if (keyA > keyB)
				return 1;
			return 0;
		});
	},

	// 小宇宙综述
	'help': function () {
		return '下列 LISP 命令作为原语支持:' +
				'\n\t +, -, *, /, >, <, =, and, begin, car, cdr, cond, cons, define, if, lambda, length, let, let*, list, not, or, quote' +
			'\n下列 LISP 命令在标准库中定义 (位于 /startup):' +
				'\n\t abs, cadr, filter, map, null?, sum' +
			'\n环境 命令:' +
				'\n\t (environment)              列出当前绑定变量' +
				'\n\t (inspect-primitive [[i;;]func])   显示一个原始的JavaScript代码的函数' +
				'\n\t (js-apply [[i;;]func] [[[i;;]obj]] [[i;;]args]) 执行JavaScript函数' +
			'\n文件系统 命令:' +
				'\n\t (ls)                       列出当前目录的内容' +
				'\n\t (cd [[i;;]path])                  进入到另一个目录' +
				'\n\t (path [[i;;]dir1 dir2] [...])     构造一个路径字符串 [[i;;](e.g. dir1/dir2)] 从列表的子目录' +
				'\n\t (read [[i;;]filepath])            显示一个文件的内容' +
				'\n\t (exec [[i;;]filepath])            执行一个LISP文件' +
				'\n\t (mkdir [[i;;]name])               创建一个新的目录' +
				'\n\t (new [[i;;]path])                 创建一个新文件' +
				'\n\t (save [[i;;]path text])           保存文本文件,如果文件已经存在则替换当前内容' +
				'\n\t (appnd [[i;;]path text])          附加到现有文件的文本' +
				'\n\t (mv [[i;;]oldpath newpath])       移动一个文件或目录的新位置' +
				'\n\t (cp [[i;;]oldpath newpath])       复制一个文件或目录的新位置' +
				'\n\t (rm [[i;;]path])                  删除一个文件或目录' +
				'\n\t (file? [[i;;]path])               返回是否有一个文件在指定的路径' +
				'\n\t (dir? [[i;;]path])                返回目录是否有在给定的路径' +
			'\n开关 命令:' +
				'\n\t (shutdown)                 保存并关闭Scheme文件系统' +
				'\n\t (restart)                  保存并重新启动Scheme文件系统' +
				'\n\t (reset-to-default)         重置为默认配置文件并重新启动Scheme' +
			'\n进程 命令:' +
				'\n\t (processes)                列出当前运行的进程的pid与名称' +
				'\n\t (start [[i;;]path interval])      从一个文件中启动一个LISP程序,指定刷新率(毫秒)' +
				'\n\t (peek [[i;;]pid])                 显示指定进程的代码与PID' +
				'\n\t (kill [[i;;]pid])                 杀死进程与指定的PID' +
			  '\n\t (performance [[i;;]pid])          显示了流程的性能与指定的PID(evals /秒)' +
			'\n其他 命令:' +
				'\n\t (time [[[i;;]format]])            可显示当前时间' +
				'\n\t (overlay [[i;;]txt x y id])       在屏幕上创建或更新一个与文字叠加的位置[[i;;](x,y)]' +
				'\n\t (sort [[[i;;]lst]] [[[i;;]keyfunc]])     一个列表按升序排序,选择使用指定的关键功能' +
				'\n\t (newline)                  换行符' +
				'\n\t (do-nothing)               假命令' +
				'\n\t (help)                     显示这个帮助页面' +
			'\n更多的帮助请到 https://github.com/AlexNisnevich/ECMAchine'
			;
	},
	'shutdown': function () {
		OS.saveState();
		OS.close();
	},
	'restart': function () {
		OS.saveState();
		OS.reboot();
	},
	'reset-to-default': function () {
		OS.deleteSavedState();
		OS.reboot();
	},
	'time': function (args) {
		var date = new Date();
	    if (args[0] == null) {
	    	return date.getTime();
	    } else {
    		return args[0].map(function (str) {
	    		switch (str) {
	    			case 'h':
	    				return date.getHours();
					case 'm':
						return date.getMinutes();
				case 's':
					return date.getSeconds();
				default:
					return str;
		    	}
	    	});
	    }
	},

	// 文件系统
	'ls': function (args) {
		return Filesystem.listFiles(args[0]);
	},
	'cd': function (args) {
		var newPath = Filesystem.navigate(args[0]);
		Display.terminal.set_prompt('小宇宙:' + newPath + ' 游客$');
		return;
	},
	'read': function (args) {
		return Filesystem.readFile(args[0]);
	},
	'exec': function (args) {
		var contents = Filesystem.readFile(args[0]);
		return evaluate(contents);
	},
	'mkdir': function (args) {
		var path = Filesystem.makeDir(args[0]);
		return new Array('目录 ' + path + ' 已创建');
	},
	'new': function (args) {
		var path = Filesystem.newFile(args[0]);
		return new Array('文件 ' + path + ' 已创建');
	},
	'save': function (args) {
		var path = Filesystem.saveFile(args[0], args[1]);
		return new Array('保存文件 ' + path);
	},
	'appnd': function (args) {
		var contents = Filesystem.readFile(args[0]);
		var newContents = contents ? (contents + '\n' + args[1]) : args[1];
		var path = Filesystem.saveFile(args[0], newContents);
		return new Array('更新文件 ' + path);
	},
	'mv': function (args) {
		var paths = Filesystem.copyItem(args[0], args[1]);
		Filesystem.removeItem(args[0]);
		return new Array('移动 ' + paths.oldPath + ' 到 ' + paths.newPath);
	},
	'cp': function (args) {
		var paths = Filesystem.copyItem(args[0], args[1]);
		return new Array('复制 ' + paths.oldPath + ' 到 ' + paths.newPath);
	},
	'rm': function (args) {
		var path = Filesystem.removeItem(args[0]);
		return new Array('删除 ' + path);
	},
	'file?': function (args) {
		var file = Filesystem.getFile(args[0]);
		return (file !== undefined && file.type == 'file');
	},
	'dir?': function (args) {
		var folderPath = Filesystem.calculatePath(args[0]);
		return (Filesystem.getDir(folderPath) !== undefined);
	},
	'path': function (args) {
		return args.join('/').replace('//','/');
	},

	// Processes
	'processes': function (args) {
		return Processes.listProcesses().map(function (proc) {
			return new Array(proc.pid, proc.name);
		});
	},
	'start': function (args) {
		var contents = Filesystem.readFile(args[0]);
		var pid = Processes.startProcess(args[0], contents, args[1]);
		Display.echo(new Array('启动进程 ' + args[0] + ' 编号为 ' + pid));
		return evaluate(contents, pid);
	},
	'peek': function (args) {
		var process = Processes.getProcessByID(args[0]);
		if (process.isTerminal) {
			return '#<终端>';
		} else {
			return process.code;
		}
	},
	'performance': function (args) {
		return Processes.getPerformance(args[0]);
	},
	'kill': function (args) {
		return Processes.killProcess(args[0]);
	},
	'overlay': function (args) {
		// (overlay txt x y id)
		var name = args[3];
		var txt = args[0].toString().replace(/ /g, '&nbsp;').replace(/\n/g, '<br />');
		var x = args[1], y = args[2];

		$('#overlays #' + name).remove(); // remove existing overlay w/ same id, if any
		var overlay = $('<div>').attr('id', name).appendTo('#overlays');
		overlay.html(txt);
		if (x >= 0) {
			overlay.addClass('overlayLeft');
			overlay.css('left', x);
		} else {
			overlay.addClass('overlayRight');
			overlay.css('right', -x);
		}
		if (y >= 0) {
			overlay.css('top', y);
		} else {
			overlay.css('bottom', -y);
		}

		Processes.registerOverlay(name); // 如果调用进程,将覆盖名字、编号
		return;
	},
	'clear-overlay': function (args) {
		$('#overlays #' + args[0]).remove();
	},

	// 试验

	'ajax': function (args) {
		var url = 'lib/ba-simple-proxy.php?url=' + args[0];

		var data_arr = args[1];
		var data = data_arr.map(function(elt) {
			return elt.car() + '=' + elt.cdr().toString();
		}).join('&'); // 发送数据作为字符串而不是对象,因此它不是预处理

		var callback = args[2];

		$.post(url, data, function (result) {
			var contents = result.contents.split('\r\n\r\n')[1];
			Display.echo(lispApply(callback, new Array(contents)));
		});
		return;
	},

	'$': function (args) {
		// 预处理args
		args = args.map(function(arg) {
			if (arg.isString) {
				return arg.toString();
			} else {
				return arg;
			}
		})

		// 准备函数
		var func = null;
		if (args.length > 1) {
			var func = args[0];
			args = args.slice(1);
		}
		console.log(func);
		console.log(args);

		// 运行函数
		if (func) {
			var result = $[func].apply(this, args);
		} else {
			var result = $.apply(this, args);
		}
		console.log(result);

		// 进程结果
		if (typeof result == 'object') {
			result = $.makeArray(result);
		}

		return result;
	}
};
