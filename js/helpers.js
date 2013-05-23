/*
 * 克隆一个对象
 */
function clone(obj){
  if (obj == null || typeof(obj) != 'object') {
  	return obj;
  } else if (obj.isString) {
  	return new constructString(obj.toString());
  } else {
  	var temp = new obj.constructor(); 
    for (var key in obj)
      temp[key] = clone(obj[key]);
    return temp;
  }
}

function prepareString(elt) {
	if (elt === undefined || elt === null) {
		return '#<undef>';
	} else if (elt.isString) {
		return elt.toDisplayString();
  } else {
  	return elt.toString();
  }
}

/*
 * 数组类(用于链表)
 */
Array.prototype.isList = true;
Array.prototype.toDisplayArray = function() {
	return this.map(function (elt) {
		return prepareString(elt);
	});
}
Array.prototype.toString = function() {
	var sexp = '(' + this.toDisplayArray().join(' ') + ')';
	return sexp;
};
Array.prototype.toStringNoOuterBraces = function() {
	var sexp = this.toDisplayArray().join(' ');
	return sexp;
};
Array.prototype.car = function () {
	return this[0];
}
Array.prototype.cdr = function () {
	return this.slice(1, this.length);
}

/*
 * 点对类 (使用于cons,当结果不是一个格式良好的列表时)
 */
var Pair = function(car, cdr) {
	this.contents = [car, cdr];
	this.isPair = true;
	this.length = 2;
}
Pair.prototype.toString = function() {
	var sexp = '(' + this.contents.toDisplayArray().join(' . ') + ')';
	return sexp;
}
Pair.prototype.car = function () {
	return this.contents[0];
}
Pair.prototype.cdr = function () {
	return this.contents[1];
}

/*
 * 字符串类
 */
String.prototype.toDisplayString = function() {
	if (this.isString) {
		return '"' + this.toString() + '"';
	} else {
		return this.toString();
	}
}
String.prototype.toEvalString = function() {
	return '"' + this.toString().replace(/[\n\r]/g, "\\n").replace(/'/g, "\\'") + '"';
}

function constructString(str) {
	var newStr = new String(str);
	newStr.isString = true;
	return newStr;
}

