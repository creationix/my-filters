my-filters
==========

Shared repo for my js-git-publisher filters used in my apps and sites

To use this, add this repo as a submodule in your git project and configure the publisher to use it as the user-defined filters.

## AMD

This filter targets javascript files, scans them for require calls and wraps the file in generic AMD code.

For example, suppose we have a file at `/src/main.js` with the following content and a symlink at `/main.js` pointing to `src/main.js|amd`., the file `/main.js`:

```js
var Point = require('./point.js');
var p = new Point(2, 3);
```

The rendered file would look like:

```js
define("/src/main.js", ["/src/point.js"], function (module, exports) {
var Point = require('/src/point.js');
var p = new Point(2, 3);
});
```

Notice that the scanned require calls get their paths re-written to be absolute.

## CJS

This works just like the AMD wrapper, but creates a standalone js file with app dependencies bundled and internal definitions of define and require.

## AppCache

AppCache will take a list of files (either through filter args or as lines in the target file) and generate an appcache manifest file with the etags of the targets as comments.  This way you can use appcache for offline capable apps without having to worry about updating the file every time anything gets changed.
