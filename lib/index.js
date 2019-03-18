const { Client } = require('pg');
const express = require('express');
const bodyParser = require("body-parser");

const app = express();
const router = express.Router();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var mapCrud = null;
var client = null;
// Setup connectionString of {Client}
router.connect = function (res) {
    mapCrud = res.crud;
    client = new Client({
        connectionString: res.connectionString
    });
    client.connect();
};

function search(nameKey, myArray) {
    for (var i = 0; i < myArray.length; i++) {
        if (myArray[i].route === nameKey) {
            return myArray[i];
        }
    }
}

function insertByPrimaryKey(columns, table) {
    // Setup static beginning of query
    var query = ['INSERT INTO'];
    // Create another array storing each set command and assigning a number value for parameter
    var column = [];
    var sequence = [];
    Object.keys(columns).forEach(function (key, i) {
        column.push(key);
        sequence.push('$' + (i + 1));
    });
    // Setup table name and push array stored
    query.push(table + '(' + column.join(', ') + ')');
    query.push('VALUES(' + sequence.join(', ') + ')');
    // Add the RETURNING statement
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
    // Create another array storing each set command and assigning a number value for parameter
    var column = [];
    Object.keys(columns).forEach(function (key, i) {
        column.push(key + ' = ($' + (i + 1) + ')');
    });
    query.push(column.join(', '));
    // Add the WHERE statement to look up by primaryKey
    query.push('WHERE');
    query.push(primaryKey);
    query.push('=');
    query.push(primaryValue);
    // Return a complete query string
    return query.join(' ');
}

router.get('/', function (req, res) {
    res.send(mapCrud);
});

router.get('/:route', function (req, res) {

    var mapData = search(req.params.route, mapCrud);
    if (mapData.table && mapData.listView) {
        client.query('SELECT * FROM ' + mapData.table, function (err, result) {
            if (err) {
                console.log(err);
                res.status(400).send(err);
            }
            res.render(mapData.listView, { title: "Customers", data: result.rows });
        });
    }

});

router.get('/:route/add', function (req, res) {

    var mapData = search(req.params.route, mapCrud);
    var addUrl = null;
    if (mapData.formView && mapData.route) {
        addUrl = "/" + mapData.route + "/add";
        res.render(mapData.formView, {
            title: "Add Customer",
            action: { url: addUrl },
            model: {}
        });
    }

});

router.post('/:route/add', function (req, res) {

    var mapData = search(req.params.route, mapCrud);
    var colValues = Object.keys(req.body).map(function (key) {
        return req.body[key];
    });
    if (mapData.table && mapData.route) {
        var query = insertByPrimaryKey(req.body, mapData.table);
        client.query(query, colValues, function (err, result) {
            if (err) {
                console.log("Error Saving : %s ", err);
            }
            res.redirect('/' + mapData.route);
        });
    }

});

router.get('/:route/edit/:primary', function (req, res) {

    var primary = req.params.primary;
    var mapData = search(req.params.route, mapCrud);
    var editUrl = null;
    if (mapData.table && mapData.primary && mapData.formView && mapData.route) {
        editUrl = "/" + mapData.route + "/edit/" + primary;
        client.query('SELECT * FROM ' + mapData.table + ' WHERE ' + mapData.primary + ' = $1', [primary], function (err, result) {
            if (err) {
                console.log(err);
                res.status(400).send(err);
            }
            res.render(mapData.formView, {
                title: "Edit Customer",
                action: { url: editUrl },
                model: result.rows[0]
            });
        });
    }

});

router.post('/:route/edit/:primary', function (req, res) {

    var primary = req.params.primary;
    var mapData = search(req.params.route, mapCrud);
    var colValues = Object.keys(req.body).map(function (key) {
        return req.body[key];
    });
    if (mapData.table && mapData.route && mapData.primary) {
        var query = updateByPrimaryKey(mapData.primary, primary, req.body, mapData.table);
        client.query(query, colValues, function (err, result) {
            if (err) {
                console.log("Error Updating : %s ", err);
            }
            res.redirect('/' + mapData.route);
        });
    }

});

router.get('/:route/delete/:primary', function (req, res) {

    var primary = req.params.primary;
    var mapData = search(req.params.route, mapCrud);
    if (mapData.table && mapData.route && mapData.primary) {
        client.query('DELETE FROM ' + mapData.table + ' WHERE ' + mapData.primary + ' = $1', [primary], function (err, rows) {
            if (err) {
                console.log("Error deleting : %s ", err);
            }
            res.redirect('/' + mapData.route);
        });
    }

});

module.exports = router;