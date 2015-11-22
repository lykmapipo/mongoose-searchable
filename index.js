'use strict';

//dependencies
var _ = require('lodash');
var glossary = require('glossary');

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

function parseKeywords(content, options) {
    var keywords = glossary.extract(content, options);
    return normalizeKeywords(keywords);
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
     */
    schema.methods.keywordize = function(keywords) {
        //this refer to model instance context

        keywords = keywords || [];
        if (!_.isArray(keywords)) {
            keywords = [keywords];
        }

        //iterate source fields to obtain keywords
        _.forEach(options.fields, function(field) {
            //get field value
            var value = this.get(field);

            if (value) {
                value = _.isArray(value) ? value : [value];

                //parse keywords from it
                value = parseKeywords(value.join(' '), options);

                keywords = _.union(keywords, value);
            }

        }.bind(this));

        //compact keywords
        keywords = _.compact(keywords);

        //set keywords
        this.set(options.keywordField, keywords);

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
     * @param  {String|Array<String>}   keywords search string
     * @param  {Function} [callback] a function to invoke on success or failure 
     * @return {Query}            valid mongoose query
     */
    schema.statics.search = function(keywords, callback) {
        //this refer to schema static context

        //normalize arguments
        if (keywords && _.isFunction(keywords)) {
            keywords = '';
            callback = keywords;
        }

        //prepare search strings from keywords
        if (!_.isArray(keywords)) {
            keywords = parseKeywords(keywords, options);
        }

        //if there are search strings 
        //prepare mongoose text search query
        var query = this.find({
                $text: {
                    $search: keywords.join(' ').trim()
                }
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


        //execute query if callback provided
        if (callback && _.isFunction(callback)) {
            return query.exec(callback);
        }

        //otherwise return mongoose query
        else {
            return query;
        }
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
            this.keywordize();
        }

        return next();
    });

};