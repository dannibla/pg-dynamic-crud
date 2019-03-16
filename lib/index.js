const express = require('express');
const bodyParser = require("body-parser");
const { Client } = require('pg');
const app = express();
const router = express.Router();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var postgreSQL = null;
var mapCrud = null;
var client = null;
//var mainRoute;

router.connect = function (res) {
    postgreSQL = res.connectionString;
    mapCrud = res.crud;
    //mainRoute = setRoute(res);
};

function setRoute(res) {
    var route = ['/:route('];
    var routes = [];
    for (var i = 0; i < res.crud.length; i++) {
        routes.push(res.crud[i].route);
    }
    route.push(routes.join('|'));
    route.push(')?');

    return route.join('');
}

function open() {
    client = new Client({
        connectionString: postgreSQL
    });
    client.connect();
}

function insertByPrimaryKey(columns, table) {
    // Setup static beginning of query
    var query = ['INSERT INTO'];

    // Create another array storing each set command
    // and assigning a number value for parameterized query
    var column = [];
    var sequence = [];
    Object.keys(columns).forEach(function (key, i) {
        column.push(key);
        sequence.push('$' + (i + 1));
    });

    // Setup table name
    query.push(table + '(' + column.join(', ') + ')');
    query.push('VALUES(' + sequence.join(', ') + ')');

    // Add the WHERE statement to look up by id
    query.push('RETURNING *');

    // Return a complete query string
    return query.join(' ');
}

function updateByPrimaryKey(primaryKey, primaryValue, columns, table) {
    // Setup static beginning of query
    var query = ['UPDATE'];

    // Setup table name
    query.push(table);
    query.push('SET');

    // Create another array storing each set command and assigning a number value for parameterized query
    var column = [];
    Object.keys(columns).forEach(function (key, i) {
        column.push(key + ' = ($' + (i + 1) + ')');
    });

    query.push(column.join(', '));

    // Add the WHERE statement to look up by id
    query.push('WHERE');
    query.push(primaryKey);
    query.push('=');
    query.push(primaryValue);

    // Return a complete query string
    return query.join(' ');
}

function search(nameKey, myArray) {
    for (var i = 0; i < myArray.length; i++) {
        if (myArray[i].route === nameKey) {
            return myArray[i];
        }
    }
}



router.get('/', function (req, res) {
    res.send(mapCrud);
});

router.get('/:route', function (req, res) {

    var resultObject = search(req.params.route, mapCrud);

    if (resultObject.table && resultObject.listView) {
        open();
        client.query('SELECT * FROM ' + resultObject.table, function (err, result) {
            if (err) {
                console.log(err);
                res.status(400).send(err);
            }
            res.render(resultObject.listView, { title: "Customers", data: result.rows });
        });
    }

});

router.get('/:route/add', function (req, res) {

    var resultObject = search(req.params.route, mapCrud);

    if (resultObject.formView) {
        res.render(resultObject.formView, { title: "Add Customer" });
    }

});

router.post('/:route/add', function (req, res) {

    var resultObject = search(req.params.route, mapCrud);

    // Turn req.body into an array of values       
    var colValues = Object.keys(req.body).map(function (key) {
        return req.body[key];
    });

    if (resultObject.table && resultObject.route) {

        var query = insertByPrimaryKey(req.body, resultObject.table);

        open();

        client.query(query, colValues, function (err, result) {
            if (err) {
                console.log("Error Saving : %s ", err);
            }
            res.redirect('/' + resultObject.route);
        });
    }

});

router.get('/:route/edit/:primary', function (req, res) {

    var primary = req.params.primary;
    var resultObject = search(req.params.route, mapCrud);

    if (resultObject.table && resultObject.primary && resultObject.formView) {

        open();
        client.query('SELECT * FROM ' + resultObject.table + ' WHERE ' + resultObject.primary + ' = $1', [primary], function (err, result) {
            if (err) {
                console.log(err);
                res.status(400).send(err);
            }
            res.render(resultObject.formView, { title: "Edit Customer", data: result.rows });
        });
    }

});

router.post('/:route/edit/:primary', function (req, res) {

    var primary = req.params.primary;
    var resultObject = search(req.params.route, mapCrud);

    // Turn req.body into an array of values       
    var colValues = Object.keys(req.body).map(function (key) {
        return req.body[key];
    });

    if (resultObject.table && resultObject.route && resultObject.primary) {

        var query = updateByPrimaryKey(resultObject.primary, primary, req.body, resultObject.table);

        open();

        client.query(query, colValues, function (err, result) {
            if (err) {
                console.log("Error Updating : %s ", err);
            }
            res.redirect('/' + resultObject.route);
        });
    }

});

router.get('/:route/delete/:primary', function (req, res) {

    var primary = req.params.primary;
    var resultObject = search(req.params.route, mapCrud);

    if (resultObject.table && resultObject.route && resultObject.primary) {
        open();
        client.query('DELETE FROM ' + resultObject.table + ' WHERE ' + resultObject.primary + ' = $1', [primary], function (err, rows) {
            if (err) {
                console.log("Error deleting : %s ", err);
            }
            res.redirect('/' + resultObject.route);
        });
    }

});

module.exports = router;