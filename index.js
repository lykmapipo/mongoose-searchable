'use strict';

//dependencies
var _ = require('lodash');
var glossary = require('glossary');
var async = require('async');

function normalizeKeywords(keywords) {
    //remove falsey values
    keywords = _.compact(keywords);

    //trim and convert to lower case
    keywords = _.map(keywords, function(keyword) {
        return _.trim(keyword).toLowerCase();
    });

    //TODO other keywords normalization

    //take unique keywords
    keywords = _.unique(_.compact(keywords));

    return keywords;
}

function parseKeywords(content, options, done) {
    //normalize options
    options = options || {};

    //default keywords extractor
    function extractor(content, finish) {
        try {
            var keywords = glossary.extract(content, options);
            finish(null, keywords);
        } catch (e) {
            finish(e);
        }
    }

    //deduce keywords extraction function
    var extract =
        options && options.extract ? options.extract : extractor;

    //extract content keyword
    extract(content, function(error, keywords) {
        if (error) {
            done(error);
        } else {
            //return normalized keywords
            keywords = normalizeKeywords(keywords);
            done(null, keywords);
        }

    });
}


module.exports = exports = function(schema, options) {

    //prepare default fields
    //by iterate over schema paths and collect string fields
    var fields = [];
    schema.eachPath(function(pathName, schemaType) {

        var type = schemaType.instance;

        if (schemaType.casterConstructor) {
            type = schemaType.casterConstructor.schemaName;
        }

        if (type === 'String') {
            fields = _.compact(_.union(fields, [pathName]));
        }
    });


    //merge default and provided options
    options = options || {};

    // schema field used to store keywords
    options.keywordField = options.keywordField || 'keywords';

    //additional words to remove from keywords
    options.blacklist = options.blacklist || [];

    //fields to be used as source of keywords
    options.fields = options.fields || fields;

    //language to use for searching
    options.language = options.language || 'english';

    //prepare keyword schema attribute
    var attribute = {};
    attribute[options.keywordField] = {
        type: [String],
        index: 'text' //ensure text index
    };
    schema.add(attribute);


    //schema instance methods


    /**
     * @description update current document keywords collection by union
     *              provided keywords and ones extracted/computed from fields
     * @param {String|Array<String>} [keywords] additinal keywords
     * @param {Function} [done] a callback to invoke on success or error
     */
    schema.methods.keywordize = function(keywords, done) {
        //this refer to model instance context

        if (_.isFunction(keywords)) {
            done = keywords;
            keywords = [];
        }

        //deduce keywords
        keywords =
            keywords && _.isString(keywords) ? keywords.split(' ') : [].concat(keywords);

        //honor existing set`ed` keywords
        keywords = _.union(keywords, this.get(options.keywordField));


        //iterate source fields to obtain keywords parsing work
        var works = _.map(options.fields, function(field) {
            //get field value
            var value = this.get(field);

            if (value) {
                value = _.isArray(value) ? value : [value];

                return function(next) {
                    //parse keywords from it
                    value = parseKeywords(value.join(' '), options, next);
                };
            }

        }.bind(this));

        //extract keywords from each field in parallel
        async.parallel(_.compact(works), function(error, _keywords) {
            if (error) {
                done(error);
            } else {

                _keywords = _.flatten(_keywords);
                _keywords = _.union(_keywords, keywords);
                _keywords = _.compact(_keywords);

                this.set(options.keywordField, _keywords);

                done(null, this);
            }

        }.bind(this));

    };


    /**
     * @description update current document keywords collection by removing
     *              provided keywords
     * @param {String|Array<String>} [keywords] additinal keywords
     */
    schema.methods.unkeywordize = function(unkeywords) {
        //this refer to model instance context

        unkeywords = unkeywords || [];
        if (!_.isArray(unkeywords)) {
            unkeywords = [unkeywords];
        }

        //get current keywords
        var keywords = this.get(options.keywordField);

        //remove unwanted keywords
        keywords = _.without(keywords, unkeywords.join(', '));

        //compact remain keywords
        keywords = _.compact(keywords);

        //set keywords
        this.set(options.keywordField, keywords);

    };


    //schema static methods

    /**
     * @description search and score stored documents based on the provided
     *              keyword
     * @param  {String|Array<String>}   [keywords] search string
     * @param  {Object}   [searchOptions] valid mongodb text search options
     * @param  {Function} callback a function to invoke on success or failure 
     * @return {Query}            valid mongoose query
     */
    schema.statics.search = function(keywords, searchOptions, callback) {
        //this refer to schema static context

        //normalize arguments
        if (keywords && _.isFunction(keywords)) {
            callback = keywords;
            keywords = '';
            searchOptions = {};
        }

        if ((_.isArray(keywords) || _.isString(keywords)) && _.isFunction(searchOptions)) {
            callback = searchOptions;
            searchOptions = {};
        }

        //normalize keywords
        keywords =
            keywords && _.isArray(keywords) ? keywords.join(' ') : keywords;

        //perform search
        async.waterfall([

            function normalize(next) {
                parseKeywords(keywords, options, next);
            },

            function executeSearch(keywords, next) {
                keywords = keywords.join(' ').toLowerCase().trim();

                //prepare text search criteria
                var $text = _.merge({}, {
                    $language: options.language
                }, searchOptions, {
                    $search: keywords
                });

                //prepare query
                var query;

                //use normal find query if no search keywords
                if (!keywords || keywords.length <= 0) {
                    query = this.find({});
                }

                //if there are search strings 
                //prepare mongoose text search query
                else {
                    query = this.find({
                            $text: $text
                        }, {
                            score: {
                                $meta: 'textScore'
                            }
                        })
                        .sort({
                            score: {
                                $meta: 'textScore'
                            }
                        });
                }

                //execute query
                query.exec(next);
                
            }.bind(this)

        ], callback);

    };


    //schema middlewares

    /**
     * @description keywordize instance before save
     */
    schema.pre('save', function(next) {
        //this refer to model instance context

        //check for changed fields
        var changed = this.isNew || _.some(options.fields, function(field) {
            return this.isModified(field);
        }.bind(this));

        if (changed) {
            return this.keywordize(next);
        } else {
            return next();
        }
    });

};