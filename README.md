Ice-Stream
==========

An expressive streaming utility for node, inspired by [Lo-Dash](http://lodash.com/), [Async](https://github.com/caolan/async), and [event-stream](https://github.com/dominictarr/event-stream). Ice-stream goal is to allow for complex processing of streaming data.


I just started this module, so I would like comments, feature requests, and pull requests.



# Examples
````javascript
var ic = require('ice-stream');

// First, calling methods with the constructor returns regular streams which can be piped to/from
var fsStream = fs.createReadStream('/path/to/file.txt');

// Make a lowercase stream from the original
var fsStreamLow = fsStream.pipe(ic.toLower());
fsStreamLow.on('data', function(data) {
  console.log(data);
});

// If you pass a stream, array, or text to the constructor, it returns a wrapped stream
var wrappedStream = ic(fsStream);

// With the wrapped streams you can create awesome chained pipes

// Parse out unique keywords from the file and output them to stdout
wrappedStream.split(' ').toLower().unique().without('ruby', 'python').join('\n').out();

// To unwrap a stream, call the .stream() method
fsStream = wrappedStream.stream();
````

# Methods (many more to come!)

- exec(cmd) - Spawn an external process - creates a duplex stream
- split([delimiter]) - Splits the stream, like String.split
- join([delimiter]) - Joins the stream back together, like String.join
- map(callback) - Maps the stream chunks using a synchronous callback function
- mapAsync(callback) - Maps the stream chunks using an async callback - first callback parameter is optional error, second parameter is the mapped value
- mapAsyncSeries(callback) - Same as above, except the chunks are guaranteed to remain in order
- filter(callback) - Define a sync function to receive each stream chunk - return false to discard
- filterAsync(callback) - Define an async function to receive each stream chunk - pass false as first callback parameter to discard
- filterAsyncSeries(callback) - Same as above, but the chunks are guaranteed to remain in order
- toLower() - Converts to lower case
- toUpper() - Converts to upper case
- unique() - Stores a hash of processed chunks, and discards already seen chunks
- without(chunk1[, chunk2, chunk3...]) - Discard the specified chunks
- out() - Simply pipes the stream to stdout