mongoose-searchable
====================

[![Build Status](https://travis-ci.org/lykmapipo/mongoose-searchable.svg?branch=master)](https://travis-ci.org/lykmapipo/mongoose-searchable)

keywords based searching for [mongoose](https://github.com/Automattic/mongoose) models, utilizing mongodb [text search](https://docs.mongodb.org/manual/reference/operator/query/text/)

## Installation
```js
$ npm install --save mongoose-searchable
```

## Usage
```js
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var searchable = require('mongoose-searchable');

//define schema
var BookSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    authors: [String],
    categories: [{
        type: String
    }]
});

//make all string field searchable
BookSchema.plugin(searchable);

//compile model
var Book = mongoose.model('Book', BookSchema);

//search comic books
Book.search('comic', function(error, books){
    ...
});

//search and exclude books contain comic keyword
Book.search('love -comic', function(error, books){
    ...
});

//search books authored by any of following authors
Book.search(['Amaya Blick', 'Otho Prosacco III'], function(error, books){
    ...
});

```

## Plugin Options

- `keywordField` specifies which schema field to be used to store `keywords`. default to `keywords`.
- `fields` specifies which fields fields to be used for computing `keywords`. default to all fields with `string schema type`
- `blacklist` specifies a collections of `words` to remove from keywords. default to `[]`

Example:
```js
BookSchema.plugin(searchable,{
    keywordField:'keywords',
    fields:['title','authors'],
    blacklist:['comic','batman']
});
```

## API

### `search(terms, [callback(error, found)]): Query`
A static method used to search documents

- `terms` an array of string or space separated string containing `terms` used to search documents
- `callback(error, found)` an optional callback provide to run a query. if not provided `mongoose query` instance is returned

Example:
```js
Book.search(terms, function(error, foundBooks) {
    ...
});

```
 
### `keywordize([keywords])`
An instance method used to compute instance keywords from `keyword fields` and union it with the optional provided additional `keywords`

Example:
```js
var book = new Book();
expect(book.keywords).to.have.length(0);

var keywords = faker.lorem.words();
book.keywordize(keywords);

expect(book.keywords).to.have.length.above(0);
expect(book.keywords).to.contain(keywords[0]);

```

### `unkeywordize(keywords)`
An instance method used to remove provided `keywords` from an instance.

Example:
```js
var book = new Book();
expect(book.keywords).to.have.length(0);

var keywords = faker.lorem.words();
book.keywordize(keywords);

book.unkeywordize(keywords[0]);

expect(book.keywords).to.have.length.above(0);
expect(book.keywords).to.not.contain(keywords[0]);

```

## Testing

* Clone this repository

* Install `grunt-cli` global

```sh
$ npm install -g grunt-cli
```

* Install all development dependencies

```sh
$ npm install
```

* Then run test

```sh
$ npm test
```

## Contribute

Fork this repo and push in your ideas. Do not forget to add a bit of test(s) of what value you adding.

## References
- [MongoDB Text Index](https://docs.mongodb.org/manual/core/index-text/)
- [MongoDB Text Query](https://docs.mongodb.org/manual/reference/operator/query/text/)

## Licence

Copyright (c) 2015 lykmapipo & Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. 
