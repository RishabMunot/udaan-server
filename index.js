var neo4j = require("neo4j-driver");
var express = require("express");
var bodyParser = require("body-parser");
var driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "7474")
);

const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./productImages/");
  },
  filename: function (req, file, cb) {
    cb(null, new Date().toISOString() + file.originalname);
  },
});

const upload = multer({ storage: storage });

const cors = require("cors");
const { response } = require("express");

var app = express();

require("dotenv").config();

const port = process.env.PORT || 5000;

//SERCURITY FEATURE
// declared origins from which the server will accept requests
let allowedOrigins = ["http://localhost:3000", "http://localhost:7000"];
// middleware which checks the origins
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin
      // (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        let msg =
          "The CORS policy for this site does not " +
          "allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  })
);

// parse application/json
app.use(bodyParser.json());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/productImages", express.static("productImages"));

app.get("/", function (req, res) {
  res.send("Local Area Network");
});

app.post("/new-seller", function (req, res) {
  var session = driver.session();
  var data = req.body.params;

  console.log(data);

  session
    .run("MATCH (p:Seller {email:$email}) return p", data)
    .then((result) => {
      if (!result.records[0]) {
        session
          .run(
            "CREATE (user:Seller {firstName:$firstName,lastName:$lastName,email:$email,contactNumber:$contactNumber,dateOfBirth:$dateOfBirth," +
              "address1:$address1,address2:$address2,addressCity:$addressCity,addressState:$addressState,addressZip:$addressZip,password:$password," +
              "latitute:$latitude,longitude:$longitude}) return user",
            data
          )
          .then((result) => {
            res.send({ status: "success" });
          })
          .catch((error) => {
            console.log(error);
          })
          .then(() => session.close());
      } else {
        res.send({ status: "User Already Exist" });
      }
    });
});

app.get("/seller-login", function (req, res) {
  var data = req.query;
  console.log(data);

  var session = driver.session();

  session
    .run("MATCH (p:Seller {email:$email}) return p", data)
    .then((result) => {
      if (!result.records[0]) {
        res.send({
          status: "error",
          error_email: "User does not exist.",
          error_password: "",
        });
      } else {
        var user = result.records[0]._fields[0].properties;
        console.log(user);

        if (user.email === data.email && user.password === data.password) {
          res.send({ status: "authenticated", type: "seller" });
        }

        if (user.email === data.email && user.password !== data.password) {
          res.send({
            status: "error",
            error_email: "",
            error_password: "Incorrect Password",
          });
        }
      }
    })
    .catch((error) => {
      console.log(error);
    })
    .then(() => session.close());
});

app.post("/new-buyer", function (req, res) {
  var session = driver.session();
  var data = req.body.params;

  console.log(data);

  session
    .run("MATCH (p:Buyer {email:$email}) return p", data)
    .then((result) => {
      if (!result.records[0]) {
        session
          .run(
            "CREATE (user:Buyer {firstName:$firstName,lastName:$lastName,email:$email,contactNumber:$contactNumber,dateOfBirth:$dateOfBirth," +
              "address1:$address1,address2:$address2,addressCity:$addressCity,addressState:$addressState,addressZip:$addressZip,password:$password," +
              "latitute:$latitude,longitude:$longitude}) return user",
            data
          )
          .then((result) => {
            res.send({ status: "success" });
          })
          .catch((error) => {
            console.log(error);
          })
          .then(() => session.close());
      } else {
        res.send({ status: "User Already Exist" });
      }
    });
});

app.get("/buyer-login", function (req, res) {
  var data = req.query;
  console.log(data);

  var session = driver.session();

  session
    .run("MATCH (p:Buyer {email:$email}) return p", data)
    .then((result) => {
      if (!result.records[0]) {
        res.send({
          status: "error",
          error_email: "User does not exist.",
          error_password: "",
        });
      } else {
        var user = result.records[0]._fields[0].properties;
        console.log(user);

        if (user.email === data.email && user.password === data.password) {
          session.run(
            "MATCH (p:Buyer {email:$email}) set p.location = $location",
            { location: user.location }
          );
          res.send({ status: "authenticated", type: "buyer" });
        }

        if (user.email === data.email && user.password !== data.password) {
          res.send({
            status: "error",
            error_email: "",
            error_password: "Incorrect Password",
          });
        }
      }
    })
    .catch((error) => {
      console.log(error);
    })
    .then(() => session.close());
});

app.post("/add-post", upload.single("image"), async function (req, res) {
  console.log(req.file);

  var session = driver.session();
  var data = req.body;

  console.log(data);

  var location = JSON.stringify(data.location);
  data.location = location;
  data.image_url = req.file.path;
  data.product_id = 9805;

  session
    .run(
      "MATCH (s:Seller {email:$email}) CREATE (s) -[r:Sells] -> (p:Product {product_id:$product_id,product_title:$product_title," +
        "image_url:$image_url,price:$price, category:$category,product_description:$product_description,stock:$stock,color:$color})" +
        " RETURN p",
      data
    )
    .then((result) => {
      // console.log(result);
    });
});


app.post("/update-post", async function (req, res) {
  var session = driver.session();
  var data = req.body;
  console.log(data);
  session
    .run(
      "MATCH (p:Product {product_id:$product_id}) set p.product_title=$product_title," +
        "p.image_url=$image_url,p.category=$category,p.product_description=$product_description,p.stock=$stock,p.color=$color" +
        " RETURN p",
      data
    )
    .then((result) => {
      console.log(result.records[0].get("p"));
      res.send(result.records[0].get("p").properties)
    });
});

async function fun() {
  var result;
  try {
    var session = driver.session();

    result = await session.readTransaction((tx) =>
      tx.run("MATCH (p:Product) RETURN p")
    );

    const records = result.records;
    result = [];
    records.forEach((record) => {
      var c = record.get("p").properties;
      c.price = c.price.low;
      result.push(c);
    });
  } finally {
    await session.close();
  }

  return result;
}

app.get("/get-all-sellers", function (req, res) {
  var session = driver.session();

  session
    .run("MATCH (p:Seller) RETURN p")
    .then((result) => {
      const records = result.records;
      result = [];
      console.log(records);
      records.forEach((record) => {
        result.push(record.get("p").properties);
      });
      res.send(result);
    })
    .catch((err) => console.log(err))
    .then((resul) => session.close());
});

app.get("/add-product-to-cart", function (req, res) {
  var session = driver.session();
  console.log(req.query.updatetedQuantity);
  session
    .run(
      `MATCH (a:Product {product_id:${req.query.product_id}}),(b:Buyer {email:"${req.query.buyerEmail}"})` +
        ` MERGE (a)-[r:INCART]->(b)` +
        ` ON MATCH SET r.quantity = ${
          req.query.updatetedQuantity ? req.query.updatetedQuantity : 1
        } ` +
        ` ON CREATE SET r.quantity = ${1} ` +
        `RETURN r`
    )
    .then((result) => {
      const records = result.records;
      console.log(records[0].get("r").properties.quantity);
      res.send({ quantity: records[0].get("r").properties.quantity.low });
    })
    .catch((err) => console.log(err))
    .then((resul) => session.close());
});

app.get("/remove-product-from-cart", function (req, res) {
  var session = driver.session();
  console.log(req.query);
  session
    .run(
      `MATCH (a:Product {product_id:${req.query.product_id}})-[r:INCART]->(b:Buyer {email:"${req.query.buyerEmail}"})` +
        ` DELETE r ` +
        `RETURN r`
    )
    .then((result) => {
      const records = result.records;
      console.log(records);
      res.send("success");
    })
    .catch((err) => console.log(err))
    .then((resul) => session.close());
});

app.get("/get-seller-products", function (req, res) {
  var session = driver.session();

  var data = req.query;
  console.log(data);
  session
    .run(
      "MATCH (a:Seller {email:$email })-[b:Sells]->(c:Product) return c",
      data
    )
    .then((result) => {
      const records = result.records;
      result = [];
      records.forEach((record) => {
        result.push(record.get("c").properties);
      });
      console.log(result);
      res.send(result);
    })
    .catch((err) => console.log(err))
    .then((resul) => session.close());
});

app.get("/get-seller-orders", function (req, res) {
  var session = driver.session();

  var data = req.query;
  console.log(data);
  session
    .run(
      "MATCH (a:Seller {email:$sellerEmail })-[b:Fullfills]->(c:Order) <-[:Places]-(d:Buyer) return c,d.email",
      data
    )
    .then((result) => {
      const records = result.records;
      console.log(records[0].get("d.email"));
      result = [];
      records.forEach((record) => {
        result.push({...record.get("c").properties,buyerEmail:record.get("d.email")});
      });
      console.log(result);
      res.send(result);
    })
    .catch((err) => console.log(err))
    .then((resul) => session.close());
});

// res.send("jnkjnk")

app.get("/get", function (req, res) {
  fun().then((result) => {
    res.send(result);
  });
  // res.send("jnkjnk")
});

async function getFilteredProducts(params) {
  var result;
  var filterQuery =
    "match (p:Product) where p.price>$priceStart and p.price<$priceEnd " +
    (params.availability ? "" : "and p.stock>0 ");

  var queryBuild = "";

  //COLOR QuERY BUILD
  if (params.color) {
    queryBuild += "and ( ";
    queryBuild += `p.color = "${params.color[0]}"`;
    for (let index = 1; index < params.color.length; index++) {
      const element = params.color[index];
      queryBuild += ` or p.color = "${element}"`;
    }
    queryBuild += " )";
  }

  //CATEGORY QuERY BUILD
  if (params.category) {
    queryBuild += "and ( ";
    queryBuild += `p.category = "${params.category[0]}"`;
    for (let index = 1; index < params.category.length; index++) {
      const element = params.category[index];
      queryBuild += ` or p.category = "${element}"`;
    }

    queryBuild += " )";
  }

  params.priceStart = parseFloat(params.priceStart);
  params.priceEnd = parseFloat(params.priceEnd);

  filterQuery += queryBuild + " return p";

  switch (params.sortBy) {
    case "None":
      break;
    case "Price (Low to High)":
      filterQuery += " order by p.price asc";
      break;
    case "Price (High to Low)":
      filterQuery += " order by p.price desc";
      break;
    case "Distance to seller (Low to High)":
      filterQuery = filterQuery.substring(17, filterQuery.length);
      console.log(filterQuery);
      filterQuery =
        `MATCH (a:Buyer {email:"${params.email}"}),(b:Seller),(pro:Product) ` +
        `WITH point({ x: a.latitude, y: a.longitude, crs: 'WGS-84' }) AS p1, point({ x: b.latitude, y: b.longitude, crs: 'WGS-84' }) AS p2,pro as p ` +
        filterQuery +
        " ORDER BY distance(p1,p2) ASC";
      break;
    case "Distance to seller (High to Low)":
      filterQuery = filterQuery.substring(17, filterQuery.length);
      console.log(filterQuery);
      filterQuery =
        `MATCH (a:Buyer {email:"${params.email}"}),(b:Seller),(pro:Product) ` +
        `WITH point({ x: a.latitude, y: a.longitude, crs: 'WGS-84' }) AS p1, point({ x: b.latitude, y: b.longitude, crs: 'WGS-84' }) AS p2, pro as p ` +
        filterQuery +
        " ORDER BY distance(p1,p2) DESC";
      break;
    default:
      break;
  }

  console.log(filterQuery);

  try {
    var session = driver.session();
    result = await session.readTransaction((tx) => tx.run(filterQuery, params));

    const records = result.records;
    result = [];
    records.forEach((record) => {
      var c = record.get("p").properties;
      c.price = c.price.low;
      result.push(c);
    });
  } finally {
    await session.close();
  }
  return result;
}

app.get("/get-filtered-products", function (req, res) {
  console.log(req.query);
  getFilteredProducts(req.query).then((result) => {
    res.send(result);
  });
});

app.get("/get-product-id", function (req, res) {
  var session = driver.session();

  var data = req.query;
  session
    .run(`MATCH (p:Product {product_id:${data.product_id} }) return p`)
    .then((result) => {
      res.send(result.records[0].get("p").properties);
    })
    .catch((err) => console.log(err))
    .then(() => session.close());
});

app.get("/get-cart-buyer", function (req, res) {
  var session = driver.session();
  console.log(req.query);
  session
    .run(
      `MATCH (b:Buyer {email:"${req.query.buyerEmail}"})<-[r:INCART]-(a:Product) RETURN a,r`
    )
    .then((result) => {
      var response = [];
      const records = result.records;
      records.forEach((record) => {
        response.push({
          ...record.get("a").properties,
          quantity: record.get("r").properties.quantity.low,
        });
      });
      res.send(response);
    })
    .catch((err) => console.log(err))
    .then((resul) => session.close());
});

app.get("/get-seller-profile", function (req, res) {
  var session = driver.session();
  console.log(req.query);
  session
    .run(
      `MATCH (b:Seller {firstName:"${req.query.firstName}",lastName:"${req.query.lastName}"})-[r:Sells]->(a:Product) RETURN a`
    )
    .then((result) => {
      var response = [];
      const records = result.records;
      records.forEach((record) => {
        var c = record.get("a").properties;
        c.price = c.price.low;
        response.push(c);
      });
      res.send(response);
    })
    .catch((err) => console.log(err))
    .then((resul) => session.close());
});

app.get("/get-buyer-orders", function (req, res) {
  var session = driver.session();
  console.log(req.query);
  session
    .run(
      `MATCH (b:Buyer {email:"${req.query.buyerEmail}"})-[r:Places]-(o:Order) RETURN o`
    )
    .then((result) => {
      var response = [];
      const records = result.records;
      console.log(records.length);
      records.forEach((record) => {
        response.push(record.get("o").properties);
      });
      res.send(response);
    })
    .catch((err) => console.log(err))
    .then((resul) => session.close());
});

app.get("/get-order", function (req, res) {
  var session = driver.session();
  console.log(req.query);
  session
    .run(
      `MATCH (o:Order {orderId:"${req.query.orderId}"})-[r:Contains]->(p:Product) RETURN o,r,p`
    )
    .then((result) => {
      var response = [];
      const records = result.records;
      console.log(records.length);
      records.forEach((record) => {
        response.push({...record.get("o").properties,...record.get("r").properties,...record.get("p").properties,});
      });
      res.send(response);
    })
    .catch((err) => console.log(err))
    .then((resul) => session.close());
});


app.post("/place-order", function (req, res) {
  console.log(req.body.params);
  var data = req.body.params;
  var session = driver.session();
  session
    .run(
      `MATCH (b:Buyer {email:"${data.buyerEmail}"})<-[:INCART]-(p:Product)<-[:Sells]-(s:Seller) RETURN p.product_id,s.email`
    )
    .then((result) => {
      const records = result.records;
      console.log(records);
      var sellerAndProductMap = {};
      records.forEach((element) => {
        let PID = element.get("p.product_id");
        let SID = element.get("s.email");
        if (sellerAndProductMap[SID]) sellerAndProductMap[SID].push(PID);
        else sellerAndProductMap[SID] = [PID];
      });
      console.log(sellerAndProductMap);
      //QUERY GENERATION

      //MATCH QUERY
      var query = `MATCH (b:Buyer {email:"${data.buyerEmail}"})`;
      var sellers = Object.keys(sellerAndProductMap);
      sellers.forEach((seller) => {
        let x = seller.replace("@", "");
        x = x.split(".").join("");
        query += `, (s${x}:Seller {email:"${seller}"})`;
        let produts = sellerAndProductMap[seller];
        produts.forEach((product) => {
          query += `, (p${product}:Product {product_id:${product}})`;
        });
      });

      var orderIds = [];

      //CREATE QUERY
      query += "CREATE ";

      sellers.forEach((seller) => {
        let x = seller.replace("@", "");
        x = x.split(".").join("");
        var totalQuantity= 0
        var totalPrice=0
        var image_url = ""
        var date = (new Date()).toDateString()
        console.log(date);
        data.cart.forEach((ele)=>{
          if(sellerAndProductMap[seller].includes(ele.product_id)){
          totalQuantity += ele.quantity
          totalPrice += ele.quantity * ele.price.low
        image_url = ele.image_url
        }
        })
        console.log(totalQuantity,totalPrice);
        orderId = Math.floor(100000 + Math.random() * 900000);
        query += ` (b)-[:Places]->(o${orderId}:Order {status:"Pending",address1: "${data.dataCurr.address1}",date:"${date}",image_url:"${image_url}",address2: "${data.dataCurr.address2}",addressCity: "${data.dataCurr.addressCity}",addressState: "${data.dataCurr.addressState}",addressZip: "${data.dataCurr.addressZip}",orderId: "${orderId}",totalQuantity: "${totalQuantity}",totalPrice: "${totalPrice}",latitude: 19.7514798,longitude: 75.7138884,paymentMethod: "${data.dataCurr.paymentMethod}"}) <- [:Fullfills] - (s${x}), `;

        sellerAndProductMap[seller].forEach((product) => {
          data.cart.forEach((e) => {
            console.log(e.product_id, product);
            if (e.product_id === product) {
              query += `(o${orderId})-[:Contains {quantity:${e.quantity}}]->(p${product}),`;
            }
          });
        });
      });

      query = query.slice(0, -1);

      //DELETETING CART ITEMS
      query += "with b match (b)<-[r:INCART]-(p:Product) delete r return b";

      var session2 = driver.session();
      session2
        .run(query)
        .then(() => {
          console.log("ho gaya");
          res.send("Order Places Successfully!!!")
        })
        .catch((err) => console.log(err))
        .finally(() => session2.close());
    })
    .catch((err) => console.log(err))
    .then((resul) => session.close());
});



app.listen(port);
console.log("Server Started on Port 5000");

driver.close();
