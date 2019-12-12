// This server is specifically to handle authorization not included in firebase auth
// Meant to handle privilidged admin requests

const admin = require('firebase-admin');

var express = require('express');
var app = express();
const bodyParser = require('body-parser');
const http = require('http');
const port = 3000;

const requestHandler = (request, response) => {
  console.log(request.url)
  response.end('Hello Node.js Server!')
}

const server = http.createServer(requestHandler)

let serviceAccount = require('./serviceAccountKey.json');
var defaultApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://educationalmanagement-44760.firebaseio.com"
});
var defaultAuth = defaultApp.auth();
var defaultDB = defaultApp.firestore();

app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	next();
});

app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());


 app.post('/admin/add_user', (req, res) => {
  console.log('adding user');
  console.log(req);
  var key = req.body.token;
  var displayName = req.body.displayName;
  var email = req.body.email;
  var university_id = req.body.university_id;
  var temp_password = req.body.password;
  var acc_type = req.body.acc_type;
  admin.auth().verifyIdToken(key)
  	.then(function(decodedToken) {
  		let uid = decodedToken.uid;
   		let docRef = defaultDB.collection('Privledges').doc(uid);
  		let getDoc = docRef.get()
  			.then(doc => {
  				if(!doc.exists){
  					console.log('Document does not exist, no admin priv');
  				} else{
  					if(doc.data().admin){
  						admin.auth().createUser({
  							email: email,
  							emailVerified: false,
  							password: temp_password,
  							displayName: displayName
  						}).then(function(userRecord){
  							var account_id = userRecord.uid;
  							let addDoc = defaultDB.collection('Users').add({
  								UnivesityID: university_id,
  								account_id: account_id,
  								category: acc_type,
  								displayName: displayName,
  								email: email
  							}).then(ref => {
  								console.log("Successfully added user");
  							});
  						});
  					}
  				}
  			}).catch(err => {
  				console.log("Error, could not get document", err);
  			});


  	}).catch(function(error) {
  		console.log("Invalid token");
  	});


  res.send('Done');
 });

 app.post('/admin/edit_user', (req, res) => {
 	console.log(req);
 	var key = req.body.token;
 	var acc_id = req.body.account_id;
 	var new_name = req.body.new_name;
 	var new_email = req.body.new_email;
 	var new_acc_type = req.body.new_acc_type;

 	admin.auth().verifyIdToken(key)
 		.then(function(decodedToken) {
 			let uid = decodedToken.uid;
 			let docRef = defaultDB.collection('Privledges').doc(uid);
 			let getDoc = docRef.get()
 				.then(doc => {
 					if(!doc.exists){
 						console.log('Document does not exist, no admin priv');
 					} else{
 						if(doc.data().admin){
 							console.log("changing user");
 							if (typeof new_name !== 'undefined') {
 								console.log("updateing name");
 								admin.auth().updateUser(acc_id, {
 									displayName: new_name
 								}).then(function(){
 									var query = defaultDB.collection('Users').where('account_id', '==', acc_id);
 									query.get().then(function(querySnapshot){
  										querySnapshot.forEach(function(doc) {
  											doc.ref.update({displayName: new_name});
  										});
 									});
 								});
 							}
 							if (typeof new_email !== 'undefined') {
 								admin.auth().updateUser(acc_id, {
 									email: new_email
 								}).then(function() {
 									var query = defaultDB.collection('Users').where('account_id', '==', acc_id);
 									query.get().then(function(querySnapshot){
  										querySnapshot.forEach(function(doc) {
  											doc.ref.update({email: new_email});
  										});
 									});
 								});
 							}
 							if (typeof new_acc_type !== 'undefined') {
 								 	var query = defaultDB.collection('Users').where('account_id', '==', acc_id);
 									query.get().then(function(querySnapshot){
  										querySnapshot.forEach(function(doc) {
  											doc.ref.update({category: new_acc_type});
  										});
 									});
 									var query = defaultDB.collection('Privledges');
 									var query_result = query.doc(acc_id).get();
 									if (new_acc_type == "Admin " || query_result.admin){
 										if (new_acc_type != "Admin"){
 											query.doc(acc_id).ref.delete()
 										}
 										else{
	 										query.doc(acc_id).ref.set({
	 											admin:true
	 										});
	 									}
 									}

 							}

 						}
 					}
 				})
 		})

 	res.send("Done");
 })

app.post('/admin/delete_user', (req, res) => {
  console.log(req);
  console.log('deleting user');
  var key = req.body.token;
  var acc_id = req.body.account_id;

  //console.log(key);
  admin.auth().verifyIdToken(key)
  	.then(function(decodedToken) {
  		let uid = decodedToken.uid;
  		console.log("Uid");
  		console.log(uid);
  		let docRef = defaultDB.collection('Privledges').doc(uid);
  		console.log('succeded docref');
  		let getDoc = docRef.get()
  			.then(doc => {
  				if(!doc.exists){
  					console.log('Document does not exist, no admin priv');
  				} else{
  					if(doc.data().admin){
  						admin.auth().deleteUser(acc_id).then(function() {
  							var query = defaultDB.collection('Users').where('account_id','==', acc_id);
  							query.get().then(function(querySnapshot){
  								querySnapshot.forEach(function(doc) {
  									doc.ref.delete();
  								});
  							});
  						});
  						console.log("successfully deleted");
  					}
  				}
  			}).catch(err => {
  				console.log("Error, could not get document", err);
  			});

  	}).catch(function(error) {
  		console.log("Invalid token");
  	});

  res.send("Done");
  //res.send('POST request');
 });

app.post('/admin/delete_post', (req, res) => {
  console.log(req);
  console.log('deleting psot');
  var key = req.body.token;
  var post_id = req.body.post_id;

  //console.log(key);
  admin.auth().verifyIdToken(key)
    .then(function(decodedToken) {
      let uid = decodedToken.uid;
      console.log("Uid");
      console.log(uid);
      let docRef = defaultDB.collection('Privledges').doc(uid);
      console.log('succeded docref');
      let getDoc = docRef.get()
        .then(doc => {
          if(!doc.exists){
            console.log('Document does not exist, no admin priv');
          } else{
            if(doc.data().admin){
                var query = defaultDB.collection('Posts').doc(post_id).delete();
                console.log("successfully deleted");
            }
          }
        }).catch(err => {
          console.log("Error, could not get document", err);
        });

    }).catch(function(error) {
      console.log("Invalid token");
    });

  res.send("Done");
  //res.send('POST request');
 });

app.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }
  console.log(`server is listening on ${port}`)
})
