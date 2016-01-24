// All required utils for the app 
var express    = require('express');
var bodyParser = require('body-parser');
var Postmates = require('postmates');
var postmates = new Postmates('cus_KeAkAy7GIWj1lF', 'b77414cb-ffdd-4e05-b10b-165f2e6464d5');
var p = require('./postmates.js');
var app        = express();
var Parse = require('node-parse-api').Parse;
var unirest = require('unirest');

var options = {
	app_id : "2TEGFm48tpsJ7Ki02AbOsXKTbQZKzhc4RFhR7S7p",
	api_key : "tFMOzm7J01GxnoPbGrHDAXGCsrGoeGrZR0Sao7Ny"
};

var eapp_id = "a750fdb2";
var eapp_key = "143b365c3f4cf72c75d73802ce735614";

var parse = new Parse(options);

var groceries = {
	"beef" : [2,3],
	"milk" : [5, 7],
	"chicken" : [2,3],
	"bacon" : [7, 14],
	"salmon" : [2, 3],
	"apples" : [10, 14],
	"oranges" : [14, 21],
	"potatoes" : [21, 35],
	"broccoli" : [7, 14],
	"bread" : [5, 7],
	"eggs" : [30,30]
};

var cats = {
	"beef" : "meat",
	"milk" : "dairy",
	"chicken" : "poultry",
	"bacon" : "meat",
	"salmon" : "fish",
	"apples" : "fruits",
	"oranges" : "fruits",
	"potatoes" : "vegetables",
	"broccoli" : "vegetables",
	"bread" : "bakedGoods",
	"eggs" : "eggs"
};

var descriptions = {
	"beef" : "8 oz",
	"milk" : "2 gallons",
	"chicken" : "16 oz",
	"bacon" : "16 oz",
	"salmon" : "9 oz",
	"apples" : "10 ct",
	"oranges" : "10 ct",
	"potatoes" : "1 sack",
	"broccoli" : "4 stocks",
	"bread" : "1 loaf",
	"eggs" : "2 dozen"
};

var abrv = {'bf' : 'beef',
  'mlk' : 'milk',
  'chckn': 'chicken',
  'bcn': 'bacon',
  'slmn': 'salmon',
  'ppls' : 'apples',
  'rngs' : 'oranges',
  'ptts' : 'potatoes',
  'brccl' : 'broccoli',
  'brd' : 'bread',
  "ggs" : "eggs"
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port     = process.env.PORT || 8080; // set our port

var router = express.Router();


var path    = require("path");

app.use(express.static(path.join(__dirname, './')));

app.use("/styles",  express.static(__dirname + '/styles'));
app.use("/js", express.static(__dirname + '/js'));
app.use("/images",  express.static(__dirname + '/images'));

app.get('/',function(req,res){
   res.sendfile(path.join(__dirname + '/index.html'));
});


// middleware to use for all requests
router.use(function(req, res, next) {
	// do logging
	res.header("Access-Control-Allow-Origin", "*");
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	console.log('API Being Accessed');
	next();
});

var path    = require("path");

app.use(express.static(path.join(__dirname, './')));

app.use("/styles",  express.static(__dirname + '/styles'));
app.use("/js", express.static(__dirname + '/js'));
app.use("/images",  express.static(__dirname + '/images'));

app.get('/',function(req,res){
	res.sendfile(path.join(__dirname + '/index.html'));
});

app.use('/api', router);

// needs an abreviation to look up (:abrv)
router.route('/abrv/:abrv')
	.get(function(req, res){
		var result = (match(req.params.abrv));
		if (result == null) {
			res.json("No Match found");
		} else {
			res.json(result + " and the expiration date is in " + groceries[result][0] + " day(s)");
		}
	});

// needs a data field in the body with the list from the OCR algorithm 
router.route('/add/multiple')
	.post(function(req, res) {
		var data = req.body.data;
		var prods = determineProducts(data);
		for (var prod in prods) {
			addItemToParse(prod);
		}
		res.json("done");
	});

router.route('/add/single')
	.post(function(req, res) {
		var name = match(req.body.name);
		if (name == null) {
			res.json("Provide a valid name");
			res.send();
		} else {
			var expirationd = getNDaysFromNow(groceries[name][0]);
			var lifetime = groceries[name][0];
			var descrp = req.body.description;
			var category = req.body.category;
			var jsonObj = {
				"name" : name,
				"expDate" : expirationd,
				"lifetime" : lifetime,
				"description" : descrp,
				"category": category
			};
			parse.insert('items', josnObj, function (err, response) {
			  console.log(response);
			});
		}

		res.json("done");
	});

router.route('postmates')
	.post(function(req, res) {
		p.createDelivery(req.body.product, req.body.descript, req.body.stores,
				req.body.name, req.body.homeAddress, res);
	});

router.route('/recommend/recipe')
	.get(function(req, res) {
		getRecipe(res);
	});

router.route('recipe/:id')
	.get(function(req, res) {
		res.json(getRecipeInfo(req.params.id));
	});

function match(text){
	var len=text.length;
	var minLength=100;
	var result="";
	var w = getClosestWord(text, groceries);
	var a = getClosestWord(text, abrv);
	var resultingClosestWord;
	
	if (w[1] < a[1]) {
		resultingClosestWord = w;
	} else {
		resultingClosestWord = [abrv[a[0]], a[1]];
	}

	if (resultingClosestWord[1] > Math.min(text.length / 2 , resultingClosestWord[0].length / 2 )) {
		return null;
	} else {

		return resultingClosestWord[0];
	}
}

function determineProducts(list) {
	var dict  = {};
	for (var i = 0; i < list.length; i++) {
		var item = list[i];
		var res = match(item);
		if (res != null) {
			console.log(item + " is also known as: " + res);
			if (res in dict) {
				dict[res]++;
			} else {
				dict[res] = 1;
			}
		}
	}

	return dict;
}

function getClosestWord(w, dict) {
	var minDis = -1;
	var minWord = "";                                                
	for (var grocery in dict) {
		var dis = getEditDistance(w.toLowerCase(), grocery.toLowerCase());
		//console.log(grocery + " the dist is " + dis);
		if (minDis == -1 || minDis > dis) {
			minDis = dis;
			minWord = grocery;
		}
	}

	return [minWord, minDis];
}

function levenshteinDistance (s, t) {
    if (!s.length) return t.length;
    if (!t.length) return s.length;

    return Math.min(
        levenshteinDistance(s.substr(1), t) + 1,
        levenshteinDistance(t.substr(1), s) + 1,
        levenshteinDistance(s.substr(1), t.substr(1)) + (s[0] !== t[0] ? 1 : 0)
    ) + 1;
}

function getEditDistance(a, b){
  if(a.length == 0) return b.length; 
  if(b.length == 0) return a.length; 

  var matrix = [];

  // increment along the first column of each row
  var i;
  for(i = 0; i <= b.length; i++){
    matrix[i] = [i];
  }

  // increment each column in the first row
  var j;
  for(j = 0; j <= a.length; j++){
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for(i = 1; i <= b.length; i++){
    for(j = 1; j <= a.length; j++){
      if(b.charAt(i-1) == a.charAt(j-1)){
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                Math.min(matrix[i][j-1] + 1, // insertion
                                         matrix[i-1][j] + 1)); // deletion
      }
    }
  }

  return matrix[b.length][a.length];
};

function removeAllVowels() {
	var arr = [];
	for (var g in groceries) {
		var res = "";
		for (var i = 0; i < g.length; i++) {
			//console.log(g[i]);
			var c = g[i];
			if (['a', 'e', 'i', 'o', 'u'].indexOf(c.toLowerCase()) == -1) {
				res += g[i];
			}
		}
		arr.push(res);
	}
	console.log(arr);
}

function addItemToParse(food) {
	var item = {
		"name" : food,
		"expDate" : getNDaysFromNow(groceries[food][0]),
		"lifetime" : groceries[food][0],
		"description" : descriptions[food],
		"category" : cats[food]
	};

	parse.insert('foodEntry', item, function (err, response) {
	  console.log(response);
	});
}

function getNDaysFromNow(n) {
	var a = new Date();
	a.setDate(a.getDate() + n);
	return a;
}

function getRecipe(res) {
	parse.find('foodEntry', '', function (err, response) {
		//console.log(response);
		var success = response;
		var arr = success["results"];
		arr.sort(function(x, y){ 
		    if (x.expDate < y.expDate) {
		        return -1;
		    }
		    if (x.expDate > y.expDate) {
		        return 1;
		    }
		    return 0;
		});

		recRecipe(arr, res);
	});
}

function recRecipe(ingreds, res) {
	console.log(ingreds);
	var url = "";
	if (ingreds.length > 0) {
		url += ingreds[0].name.trim();
		for (var i = 1; i < Math.min(3, ingreds.length); i++) {
			url += "," + ingreds[i].name.trim();
		}
	}
	console.log(encodeURIComponent(url)); 
	unirest.get("https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/findByIngredients?ingredients=" + url + "&limitLicense=false&number=5&ranking=1")
	.header("X-Mashape-Key", "68sljwduiumshFCNWmjQRwB9a1T1p1sYYvNjsni2hRqvH6NZUe")
	.header("Accept", "application/json")
	.end(function (result) {
	  res.json(result.body);
	});
	/*var host = "https://api.edamam.com/"
	var url = "search?q="
	if (ingreds.length > 0) {
		url += ingreds[0].name.trim();
		for (var i = 1; i < Math.min(3, ingres.length); i++) {
			url += "," + ingreds[i].name.trim();
		}
		url += "&app_id=" + eapp_id;
		url += "&app_key=" + eapp_key; 
		console.log(url);
		http.request( {"host" : host, "path": url}, callBack).end();
	}*/
}

function getRecipeInfo(id) {
	var resultJson = {};
	unirest.get("https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/" + id + "/information")
	.header("X-Mashape-Key", "68sljwduiumshFCNWmjQRwB9a1T1p1sYYvNjsni2hRqvH6NZUe")
	.end(function (result) {
	  console.log(result.body.spoonacularSourceUrl);
	  resultJson.link = result.body.spoonacularSourceUrl;
	  resultJson.time = result.body.readyInMinutes;
	  resultJson.id = result.body.id;
	  resultJson.title = result.body.title;
	});

	  unirest.get("https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/" + id + "/summary")
		.header("X-Mashape-Key", "68sljwduiumshFCNWmjQRwB9a1T1p1sYYvNjsni2hRqvH6NZUe")
		.end(function (result) {
			resultJson.summary = result.body.summary;
			console.log(resultJson);
			return resultJson;
		});
}

function callBack(response) {
	console.log(response);
}



// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Server on: ' + port);