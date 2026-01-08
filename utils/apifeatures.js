class ApiFeatures {
    constructor(query, queryStr) {
        this.query = query,
            this.queryStr = queryStr
    }
    search(searchField = "name") {
        const keyword = this.queryStr.keyword ? {
            [searchField]: {
                $regex: this.queryStr.keyword,
                $options: "i"
            }
        } : {};

        this.query = this.query.find({ ...keyword });
        return this;
    }

    filter() {
        const queryCopy = { ...this.queryStr }
        const removeFields = ["keyword", "page", "limit", "sort"];

        removeFields.forEach(key => delete queryCopy[key]);

        // Remove empty strings from queryCopy
        Object.keys(queryCopy).forEach(key => {
            if (queryCopy[key] === "") {
                delete queryCopy[key];
            }
        });

        // filter for price and rating 
        let queryStr = JSON.stringify(queryCopy);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, key => `$${key}`)

        this.query = this.query.find(JSON.parse(queryStr));

        return this
    }

    pagination(resultPerPage) {
        const currentPage = Number(this.queryStr.page) || 1;

        const skip = resultPerPage * (currentPage - 1);

        this.query = this.query.limit(resultPerPage).skip(skip);

        return this

    }
}

module.exports = ApiFeatures