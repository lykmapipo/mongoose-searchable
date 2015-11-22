'use strict';

//dependencies
var path = require('path');
var faker = require('faker');
var expect = require('chai').expect;
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var searchable = require(path.join(__dirname, '..'));
var books = require(path.join(__dirname, 'books.json'));

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

describe('searchable', function() {

    before(function(done) {
        Book.create(books, done);
    });

    describe('unit', function() {

        it('should be able to add keywords field', function() {
            expect(Book.schema.paths).to.have.property('keywords');
            expect(Book.schema.paths.keywords.instance).to.be.equal('Array');
            expect(Book.schema.paths.keywords._index).to.be.equal('text');
        });

        it('should be able to add keywordize and unkeywordize instance methods', function() {
            var book = new Book();

            expect(book.keywordize).to.exist;
            expect(book.unkeywordize).to.exist;

            expect(book.keywordize).to.be.a('function');
            expect(book.unkeywordize).to.be.a('function');
        });

        it('should be able to add static search methods', function() {
            expect(Book.search).to.exist;
            expect(Book.search).to.be.a('function');
        });

        it('should be able to keywordize an instance from its fields', function() {
            var book = new Book(books[0]);
            expect(book.keywords).to.have.length(0);

            book.keywordize();
            expect(book.keywords).to.have.length.above(0);
        });


        it('should be able to keywordize an instance with provided keywords', function() {
            var book = new Book();
            expect(book.keywords).to.have.length(0);

            var keywords = faker.lorem.words();
            book.keywordize(keywords);

            expect(book.keywords).to.have.length.above(0);
            expect(book.keywords).to.contain(keywords[0]);
        });

        it('should be able to unkeywordize an instance with provided keywords', function() {
            var book = new Book();
            expect(book.keywords).to.have.length(0);

            var keywords = faker.lorem.words();
            book.keywordize(keywords);

            book.unkeywordize(keywords[0]);

            expect(book.keywords).to.have.length.above(0);
            expect(book.keywords).to.not.contain(keywords[0]);
        });

    });

    describe('search', function() {

        it('should be able to search documents using array of keywords', function(done) {

            Book.search(books[0].authors, function(error, foundBooks) {

                expect(foundBooks).to.have.length(2);

                expect(foundBooks[0].title).to.equal(books[0].title);
                expect(foundBooks[1].title).to.equal(books[3].title);

                done(error, foundBooks);
            });

        });

        it('should be able to search documents using string of keywords', function(done) {

            Book.search(books[8].title, function(error, foundBooks) {

                expect(foundBooks).to.have.length(3);

                expect(foundBooks[0].title).to.equal(books[8].title);
                expect(foundBooks[1].title).to.equal(books[0].title);
                expect(foundBooks[2].title).to.equal(books[5].title);

                done(error, foundBooks);
            });

        });

        it('should be able to search documents and exclude documents that contain a given term', function(done) {
            books[0].authors.push('-Henderson');
            var terms = books[0].authors.join(' ');

            Book.search(terms, function(error, foundBooks) {

                expect(foundBooks).to.have.length(1);

                expect(foundBooks[0].title).to.equal(books[0].title);

                done(error, foundBooks);
            });

        });

    });

});