Ice-Stream
==========

An expressive streaming utility for node, inspired by [Lo-Dash](http://lodash.com/), [Async](https://github.com/caolan/async), and [event-stream](https://github.com/dominictarr/event-stream).

Ice-Stream aims to make stream processing as easy as the ubiquitous mentioned above make processing arrays and objects.

# About Streams
Stream processing is basically pumping data through a number of operations, piece by piece. Using streams is especially useful when:
 - There is more data than available memory
 - The data source is slow, e.g. over a network, user input
 - Some of the data can be processed without all of the data

In some cases it is useful to think about and operate on a stream as a continual flow of data, and sometimes it is
better to think about it as a segmented, chunk by chunk flow. Ice-Stream's methods do both, depending on the operation.


# Examples

First, to include Ice-Stream
````javascript
var is = require('ice-stream');
````

Using the static methods results in a typical Node `Stream`
````javascript
// Stream from a file, through a lowercaser, to an output file
is.toLower( fs.createReadStream('file.txt') ).pipe( fs.createWriteStream('file-low.txt') );
````

Passing a `Stream` to the constructor generates a wrapped stream, which can be chained
````javascript
// Parse out unique keywords from the file and output them to stdout
is( fs.createReadStream('file.txt') ).split(' ').toLower().unique().without('ruby', 'python').join('\n').out();
````

# Methods
 
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