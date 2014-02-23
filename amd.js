"use strict";

var mine = require("mine");
var pathJoin = require("pathjoin");
var binary = require('bodec');
module.exports = amd;

function amd(servePath, req, callback) {

  var prefix = req.args[0];
  var base = pathJoin(req.path, "..");
  if (prefix) {
    prefix = pathJoin(base, prefix);
    if (prefix === base) base = "";
    else if (base.substring(0, prefix.length + 1) === prefix +"/") {
      base = base.substring(prefix.length + 1);
    }
  }

  var name = req.path.substring(req.path.lastIndexOf("/") + 1);

  return callback(null, {etag: req.hash + "-" + req.target.etag, fetch: fetch});

  function fetch(callback) {
    req.target.fetch(function (err, js) {
      if (err) return callback(err);
      js = binary.toUnicode(js);
      var deps = mine(js);
      var length = deps.length;
      var paths = new Array(length);
      for (var i = length - 1; i >= 0; i--) {
        var dep = deps[i];
        var depPath = dep.name[0] === "." ? pathJoin(base, dep.name) : dep.name;
        if (!(/\.[^\/]+$/.test(depPath))) depPath += ".js";
        paths[i] = depPath;
        js = js.substr(0, dep.offset) + depPath + js.substr(dep.offset + dep.name.length);
      }
      js = "define(" + JSON.stringify(pathJoin(base, name)) + ", " +
          JSON.stringify(paths) + ", function (module, exports) { " +
          js + "\n});\n";
      callback(null, binary.fromUnicode(js));
    });
  }
}
