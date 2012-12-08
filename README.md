# Ice-Stream
An expressive streaming utility for node, inspired by [Lo-Dash](http://lodash.com/), [Async](https://github.com/caolan/async), and [event-stream](https://github.com/dominictarr/event-stream).

Ice-Stream aims to make stream processing as easy as the ubiquitous mentioned above make processing arrays and objects.

## About Streams
Stream processing is basically pumping data through a number of operations, piece by piece. Using streams is especially useful when:
 - There is more data than available memory
 - The data source is slow, e.g. over a network, user input
 - Some of the data can be processed without all of the data

In some cases it is useful to think about and operate on a stream as a continual flow of data, and sometimes it is
better to think about it as a segmented, chunk by chunk flow. Ice-Stream's methods do both, depending on the operation.


## Examples

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

## Constructor(mixed)
The Ice-Stream variable can be used as a namespace to access the stream methods, as a function to wrap basic Node streams, and as a constructor to create streams for data.

__Examples__
````javascript
// Wrap a basic Stream
var wstream1 = is( fs.createReadStream('file.txt') );

// Create a text stream
var wstream2 = is('stream this data');

// The above result is wrapped so we can immediately chain it
wstream2.split(' ').join('\n').out();

// Create a stream from an array
is(['stream', 'this', 'data']).join('\n').out();

// Create a non-text stream from an array
is([1, 4, 6, 2, 91]).map(function(num) {
  return num*2;
}).join('\n').out();
````

## Methods

* [exec](#exec)
* [split](#split)
* [join](#join)
* [toLower](#toLower)
* [toUpper](#toUpper)
* [map](#map)
* [mapAsync](#mapAsync)
* [mapAsyncSeries](#mapAsyncSeries)
* [filter](#filter)
* [filterAsync](#filterAsync)
* [filterAsyncSeries](#filterAsyncSeries)
* [dropUntil](#dropUntil)
* [dropUntilChunk](#dropUntilChunk)
* [unique](#unique)
* [without](#without)
* [out](#out)

---------------------------------------

<a name="exec" />
### exec(cmd)
Spawn an external process process. Input is passed to `stdin` of the new process, and output comes from `stdout`. Any data that is received from `stderr` is emitted as an `error`.

__Arguments__
* cmd - The command to run

---------------------------------------

<a name="split" />
### split([separator])
Chunks the data based on the delimiter. Concatenates and buffers the input until the delimiter is found, at which point the buffered data is emitted. The delimiters are removed and not emitted. When the input stream closes, the final data chunk is emitted. Note that this method converts input to strings.

__Arguments__
* separator - String specifying where to split the input stream. Defaults to `\n`.

---------------------------------------

<a name="join" />
### join([separator])
Injects data in between chunks of the input stream. Note that a `split()` followed by a `join()` will produce the same overall stream, but the chunking will be different.

__Arguments__
* separator - The extra data to emit between chunks

---------------------------------------

<a name="toLower" />
### toLower()
Converts the input to lower case.

---------------------------------------

<a name="toUpper" />
### toUpper()
Converts the input to upper case.

---------------------------------------

<a name="map" />
### map(iterator)
Maps each stream chunk using a synchronous callback function.

__Arguments__
* iterator(chunk) - A synchronous function which returns the new chunk.

---------------------------------------

<a name="mapAsync" />
### mapAsync(iterator)
Maps the stream chunks using an async callback. Note that `iterator` will be called in parallel as chunks are received, and the output order is determined by when the callbacks finish, not the input order.

__Arguments__
* iterator(chunk, callback) - The user-defined function which performs the mapping. The first callback parameter is an optional error, with the second parameter being the mapped value.

---------------------------------------

<a name="mapAsyncSeries" />
### mapAsyncSeries(iterator)
Same as above, except the chunks are guaranteed to remain in order when emitted. Note that the iterator will still be called in parallel as chunks are received, but the results are buffered to ensure proper emission order.

__Arguments__
* iterator(chunk, callback) - Same as above.

---------------------------------------

<a name="filter" />
### filter(iterator)
Sends each chunk to a user-defined iterator which determines whether or not to send the chunk on.

__Arguments__
* iterator(chunk) - A synchronous function which returns true to keep the chunk

---------------------------------------

<a name="filterAsync" />
### filterAsync(iterator)
Send each chunk to a user-defined asynchronous function. Note that `iterator` will be called in parallel as chunks are received, and the output order is determined by when the callbacks finish, not the input order.

__Arguments__
* iterator(chunk, callback) - The user-defined function which performs the filtering. The first callback parameter is a boolean. _There is no `err` callback parameter_.

---------------------------------------

<a name="filterAsyncSeries" />
### filterAsyncSeries(callback)
Same as above, but the chunks are guaranteed to remain in order

__Arguments__
* iterator(chunk, callback) - Same as above.

---------------------------------------

<a name="dropUntil" />
### dropUntil(token[, emitMatch])
Discards all incoming stream data until the `token` string is found, at which point emitting of the incoming data continues. The matching will span chunk boundaries.

__Arguments__
* token - A string to search for in the stream (unaffected by chunk boundaries).
* emitMatch - A boolean indicating whether to emit the match itself when found. Defaults to false.

---------------------------------------

<a name="dropUntilChunk" />
### dropUntilChunk(mixed[, emitMatch])
Discards all incoming stream chunks until a match is found, at which point emitting of the incoming chunks continues. The first parameter can either be a string representing a complete chunk, or a user-defined
function which indicates whether the condition to emit has been met.

__Arguments__
* mixed - A string or function. If a string is given, will behave similar to [dropUntil](#dropUntil) except only an exact chunk match will count. If a callback function is given, it will be passed a chunk and should return true to indicate that emitting should start.
* emitMatch - A boolean indicating whether to emit the matched chunk itself when found. Defaults to false.

---------------------------------------
<a name="unique" />
### unique()
Stores a hash of processed chunks, and discards already seen chunks. This works with string or object streams, but objects will be hashed based on their `toString()` result.

---------------------------------------

<a name="without" />
### without(chunk1[, chunk2, chunk3...])
Discard the specified chunks using strict equality. This works on string or object streams.

---------------------------------------

<a name="out" />
### out()
Simply pipes the stream to stdout.

---------------------------------------