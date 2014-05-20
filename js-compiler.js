/* global -name*/
"use strict";

var mine = require("mine");
var pathJoin = require("pathjoin");
var binary = require('bodec');
var modes = require('js-git/lib/modes');
var sha1 = require('git-sha1');
var carallel = require('carallel');

module.exports = jsCompiler;

function jsCompiler(servePath, req, callback) {

// "paths":{
//   "full":"tedit-app/build/web/src.rule",
//   "local":"",
//   "rule":"tedit-app/build/web/src.rule",
//   "root":"tedit-app"
// },
// "codeHash":"f7e6bdc26e90a6ae5dde7a312dcd8350494de9f0"

  if (req.paths.local) {

    var parts = req.paths.local.split("/").filter(Boolean);
    var name = parts.shift();
    var mapping = req.mappings[name];
    if (!mapping) return callback();
    parts.unshift(fullPath(mapping));
    var path = parts.join("/");
    loadItem(path, req.paths.local, callback);
  }
  else {
    loadRoot(callback);
  }

  function fullPath(path) {
    return path[0] === "." ?
      path = pathJoin(req.paths.full, "..", path) :
      path = pathJoin(req.paths.root, path);
  }

  function loadRoot(callback) {
    carallel(Object.keys(req.mappings).map(preloadMapping), onEntries);
    function preloadMapping(name) {
      var path = fullPath(req.mappings[name]);

      return function (callback) {
        servePath(path, function (err, entry) {
          if (err) return callback(err);
          if (!entry) entry = {};
          entry.name = name;
          entry.path = path;
          callback(null, entry);
        });
      };
    }

    var entries;
    function onEntries(err, result) {
      if (err) return callback(err);
      entries = result;

      callback(null, {
        mode: modes.tree,
        hash: sha1(JSON.stringify([entries,req]) + req.codeHash),
        fetch: fetch
      });
    }

    function fetch(callback) {
      var tree = {};

      entries.forEach(function (entry) {
        var name = entry.mode === modes.tree ? entry.name :
          entry.name + ".js";
        tree[name] = {
          mode: entry.mode,
          hash: entry.hash + "-" + req.codeHash,
        };
      });
      callback(null, tree);
    }
  }

  function loadItem(realPath, path, callback) {

    var result;
    servePath(realPath, function (err, entry) {
      if (!entry) return callback(err);
      result = entry;
      callback(null, {
        mode: result.mode,
        hash: result.hash + "-" + req.codeHash,
        root: result.root,
        fetch : fetch
      });
    });

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
            if (shouldHandle(key, entry)) {
              entry.hash += "-" + req.codeHash;
              tree[key] = entry;
            }
          });
          value = tree;
        }
        return callback(null, value);
      });
    }
  }

  function shouldHandle(path, entry) {
    return entry && (entry.mode === modes.tree ||
           modes.isFile(entry.mode) && /\.js$/i.test(path));
  }

  function compile(path, blob, callback) {
    var js = binary.toUnicode(blob);
    var deps = mine(js);
    var length = deps.length;
    var paths = new Array(length);
    var base = pathJoin(path, "..");

    for (var i = length - 1; i >= 0; i--) {
      var dep = deps[i];
      var depPath = (dep.name[0] === "." && base) ?
        pathJoin(base, dep.name) : dep.name;
      if (!(/\.[^\/]+$/.test(depPath))) depPath += ".js";
      paths[i] = depPath;
      js = js.substr(0, dep.offset) + depPath + js.substr(dep.offset + dep.name.length);
    }
    js = "define(" + JSON.stringify(path) + ", " +
        JSON.stringify(paths) + ", function (module, exports) { " +
        js + "\n});\n";
    callback(null, binary.fromUnicode(js));
  }
}
