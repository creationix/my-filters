/* global -name*/
"use strict";

var mine = require("mine");
var pathJoin = require("pathjoin");
var binary = require('bodec');
var modes = require('js-git/lib/modes');
module.exports = amdTree;

function amdTree(servePath, req, callback) {

  var path = pathJoin(req.paths.root, req.input, req.paths.local);
  servePath(path, function (err, result) {
    if (err) return callback(err);
    return callback(null, {mode:result.mode,hash:result.hash,fetch:fetch});

    function fetch(callback) {
      result.fetch(function (err, value) {
        if (err) return callback(err);
        if (modes.isFile(result.mode)) {
          return compile(path, value, callback);
        }
        if (result.mode === modes.tree) {
          var tree = {};
          Object.keys(value).forEach(function (key) {
            var entry = value[key];
            if (/\.js/i.test(key) && modes.isFile(entry.mode)) {
              entry.hash += "-amd";
              tree[key] = entry;
            }
          });
          value = tree;
        }
        return callback(null, value);
      });
    }
  });

  function compile(path, blob, callback) {
    var prefix = pathJoin(req.paths.root, req.input, req.base || ".");
    var js = binary.toUnicode(blob);
    var deps = mine(js);
    var length = deps.length;
    var paths = new Array(length);
    var localPath = prefix ? path.substring(prefix.length + 1) : path;
    var base = localPath.substring(0, localPath.lastIndexOf("/"));

    for (var i = length - 1; i >= 0; i--) {
      var dep = deps[i];
      var depPath = dep.name[0] === "." ? pathJoin(base, dep.name) : dep.name;
      if (!(/\.[^\/]+$/.test(depPath))) depPath += ".js";
      paths[i] = depPath;
      js = js.substr(0, dep.offset) + depPath + js.substr(dep.offset + dep.name.length);
    }
    js = "define(" + JSON.stringify(localPath) + ", " +
        JSON.stringify(paths) + ", function (module, exports) { " +
        js + "\n});\n";
    callback(null, binary.fromUnicode(js));
  }
}