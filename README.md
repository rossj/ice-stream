ice-stream
==========

An expressive streaming utility library for node, inspired by [Lo-Dash](http://lodash.com/), [Async](https://github.com/caolan/async), and [event-stream](https://github.com/dominictarr/event-stream). Ice-stream goal is to allow for complex processing of streaming data.

I just started this module, so I would like requests, comments, and pull requests.

# Examples
````javascript

var ic = require('ice-stream');

// First, calling methods with the constructor returns regular streams which can be piped to/from
var fsStream = fs.createReadStream('/path/to/file.txt');

// Make a lowercase stream from the original
var fsStreamLow = fsStream.pipe(ic.toLower());
fsStreamLow.on('data', function(data) {
  console.log(data);
}

// If you pass a stream, array, or text to the constructor, it returns a wrapped stream
var wrappedStream = ic(fsStream);

// With the wrapped streams you can perform awesome chain piping...

// Parse out unique keywords from the file and output them to stdout
wrappedStream.split(' ').toLower().unique().without(['ruby', 'python']).join('\n').out();

// To unwrap a stream, call the .stream() method
fsStream = wrappedStream.stream();