//Lines 4- copied from my assignment 1 server.js
// Server.js is mostly compiled from  from the Lualima Assignment 1 instructions and Professor Sal's Video
// Importing the crypto module
const crypto = require('crypto');
// Importing the Express.js framework 
const express = require('express');
// Create an instance of the Express application called "app"
// app will be used to define routes, handle requests, etc
const app = express();

// referenced from Professor Sal's video 
app.use(express.urlencoded({ extended: true }));

// Route all other GET requests to serve static files from a directory named "public"
app.use(express.static(__dirname + '/Public'));

//Route the filename to look into the user_data.json file so continuously update and look for people's information 
let filename= __dirname+"/user_data.json";

//sets up the product array from the products_json file
let products = require(__dirname + '/products.json');
products.forEach((prod, i) => { prod.total_sold = 0; });

//declare the fs, querystring, crypto. These are dependencies  
let fs = require('fs');
let qs = require('querystring');
// let crypto = require('crypto');
//logged in strand will be empty array to fill it with functions
let loggedIn = [];

// Define a route for handling a GET request to a path that matches "./products.js"
app.get("/products.js", function (request, response, next) {
    // Set the response type to JavaScript
    response.type('.js');
    // Convert the JS string into a JSON string and embed it within variable products
    let products_str = `let products = ${JSON.stringify(products)};`;
    response.send(products_str);
});

// Declare a variable to store user data
let user_data;

// Check if the file exists
if (fs.existsSync(filename)){
    // If the file exists, read its contents
    let data = fs.readFileSync(filename, 'utf8');
    // Parse the JSON data into a JavaScript object
    user_data = JSON.parse(data);
    // Log the user data to the console
    console.log(user_data);
} else {
    // If the file does not exist, log an error message
    console.log(`${filename} does not exist`);
    // Initialize the user_data variable as an empty object
    user_data = {};
}

// Declare a temporary variable to store user inputs
let temp_user = {}; // temp storage for user inputs to be passed along

                     

//Copied from Laulima. This is naming the products.json file to be posting the process_purchase 
app.post("/Process_purchase", function (request, response) {
    //Referenced from Aaron Kim: Textboxs in the array
    let qtys = request.body[`quantity_textbox`];
    console.log(qtys);
    //Set the valididy check to automatically true 
    let valid = true;
       //This is an empty string so the url will go in it 
    let url = '';
    let soldArray = [];

    //Iterate through elements in the array 'qtys'
    for (let i in qtys) {
        //Set q as the number
        let q = Number(qtys[i]);

        // The code validates user-entered quantities for purchase against available stock. It updates data dependent on the validation results        
        if (validateQuantity(q) === '') {
            // Check if buying this quantity would result in a negative inventory
            if (products[i]['qty_available'] - q < 0) {
                valid = false;
                url += `&prod${i}=${q}`;
            }
        // This part of the code flags as invalid any unsuccessful attempts to buy products or when no products are selected for purchase
            else {
                soldArray[i] = q;
                url += `&prod${i}=${q}`;
            }
        }
        // If the quantity is not valid, set validity to false
        else {
            valid = false;
            url += `&prod${i}=${q}`;
        }
    }

    // Check if user is logged in
    if (request.body.user) {
        url += `&user=${request.body.user}`
    }

        //If no products were bought, set valid to false. The url will display as followed. 
        if (url === `&prod0=0&prod1=0&prod2=0&prod3=0&prod4=0&prod5=0`) {
        valid = false;
    }

    // This code redirects users to a page indicating an error in the purchase attempt if the 'valid' flag is set to 'false', passing along additional information through URL parameters
    if (valid === false) {
        response.redirect(`store.html?error=true` + url);
    }
    else if (!url.includes("user")) {
        response.redirect('login.html?' + url);
    }
        //If it does not it will redirect to the invoice with the url attached
    else {
     //Update total and qty only if there are no errors

        for (let i in qtys) {
            products[i]['total_sold'] += soldArray[i];
            products[i]['qty_available'] -= soldArray[i];
        }
        response.redirect('invoice.html?' + url);
    }
});

// Route all other GET requests to serve static files from a directory named "public"
app.all('*', function (request, response, next) {
    //console.log(request.method + ' to ' + request.path);
    next();
 });

// Login // adapted from Anthony Lee tutoring 
app.post("/login", function (request, response) {
    //taking the information from user_data.json
    let raw_user_data = fs.readFileSync("./user_data.json"); 
    //parsing the user data into the json object
    let user_data = JSON.parse(raw_user_data); 
    console.log(request.body);
    //the login user and login password informations 
    attempted_user = request.body['email'];
//have to validate the user to make sure that the login will require an email and not just a name
    let user_arr = request.body['email'].split("@");
    attempted_user = user_arr[0];
    attempted_pass = request.body['password'];

    //if in the user_data.json they have to see the username and make sure it is the same in the json file
    if (typeof user_data[attempted_user] != 'undefined') { 
        // password matches Username in user_data.json data file 
        if (user_data[attempted_user].password == attempted_pass) { 
            // Get rid of password object (for privacy)
            delete request.body.password; 
            delete request.body.submit;
            let split_user = attempted_user.split("@");
            request.body.user = split_user;

            let data = request.body;
            stringified = qs.stringify(data);
            loggedIn.push(attempted_user);
            console.log(loggedIn);
            if (Object.keys(data).length != 1) { // If: Purchase information exists
                response.redirect("./invoice.html?" + stringified + "&ready=yes"); // Redirect to invoice
            } else { // Else (If only signing in)
                response.redirect("./products_display.html?" + stringified); // Redirect to storefront
            }
//deleteting the password so it does not show up again and encrypts it 
        } else { 
            delete request.body.email
            delete request.body.password;
            delete request.body.submit;
            let data = request.body;
            stringified = qs.stringify(data);

            response.redirect("./login.html?error=pass&" + stringified);
        }
    }
    delete request.body.email
    delete request.body.password;
    delete request.body.submit;
    let data = request.body;
    stringified = qs.stringify(data);

    response.redirect("./login.html?error=email&" + stringified); // User doesn't exist
});



let registration_errors = {};


app.post("/register", function (request, response) {
    //Get user's input from form
    let reg_name = request.body.name;
    // let reg_email = request.body.email.toLowerCase();
    let reg_email = request.body.email;
    let reg_password = request.body.password;
    let reg_confirm_password = request.body.confirm_password;

    //Validate Password
    validateConfirmPassword(reg_password, reg_confirm_password);
    validatePassword(reg_password);
    //Validate Email to see if it's only letters and "@"  "." and domain names
    validateEmail(reg_email);
    //Validate Name to see if it's only letters
    validateName(reg_name);


    //Server Response to check if there are no errors
    if (Object.keys(registration_errors).length == 0) {
        const encryptedPassword = encryptPassword(reg_password);
        user_data[reg_email] = {};
        user_data[reg_email].name = reg_name;
        user_data[reg_email].password = encryptedPassword;
        
        //Write the updated user_data object to the user_data.json file
        fs.writeFile(__dirname + '/user_data.json', JSON.stringify(user_data), 'utf-8', (error) => {
            if (error) {
                //If there's an error while writing the file, log the error message
                console.log('error updating user_data', error);
            } else {
                //If the file is written successfully, log a success message
                console.log('File written successfully. User data is updated.');

            //Add user's info to temp_user
            temp_user['name'] = reg_name;
            temp_user['email'] = reg_email;

            //console log temp_user
            console.log(temp_user);
            console.log(user_data);

            let params = new URLSearchParams(temp_user);
            response.redirect(`/invoice.html?regSuccess&valid&${params.toString()}`);
            }
        });
            
        
    }else { //If there are errors
        delete request.body.password;
        delete request.body.confirm_password;

        let params = new URLSearchParams(request.body);
        response.redirect(`/register.html?${params.toString()}&${qs.stringify(registration_errors)}`);
    }
});
function validateConfirmPassword(password, confirm_password) {
    delete registration_errors['confirm_password_type'];
    console.log(registration_errors);

    if (confirm_password !== password) {
        registration_errors ['confirm_password_type'] = 'Passwords do not match';
    }
}

// Encrypt Password Function
function encryptPassword(password) {
    // Generate a random salt for each user
    const salt = crypto.randomBytes(16).toString('hex');
    // Use the password and salt to create a hash using SHA-256 algorithm
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha256').toString('hex');
    // Store both the salt and hash in the database
    return `${salt}:${hash}`;
}

// Validate Password Function
// function validatePassword(password) {
//     if (password.length < 10 || password.length > 16) {
//         registration_errors.password_error = "Password must be between 10 and 16 characters.";
//     } else if (/\s/.test(password)) {
//         registration_errors.password_error = "Password cannot contain spaces.";
//     }
//     // Add more password validation rules as needed
// }


// Validate Email Function
function validateEmail(email) {
    // Basic email validation using a regular expression
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        registration_errors.email_error = "Invalid email format.";
    }
}

//Validate Name
function validateName(name) {
    // Basic name validation using a regular expression
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(name)) {
        registration_errors.name_error = "Invalid name format.";
    }
}

// Route all other GET requests to serve static files from the "public" directory
app.all('*', function (request, response, next) {
    next();
});

// Start the server; listen on port 8080 for incoming HTTP requests
app.listen(8080, () => console.log(`listening on port 8080`));

//function to validate the quantity, returns a string if not a number, negative, not an integer, or a combination of both
// If no errors in quantity, returns an empty string
function validateQuantity(quantity) {
    if (isNaN(quantity)) {
        return "Not a Number";
    } else if (quantity < 0 && !Number.isInteger(quantity)) {
        return "Negative Inventory & Not an Integer";
    } else if (quantity < 0) {
        return "Negative Inventory";
    } else if (!Number.isInteger(quantity)) {
        return "Not an Integer";
    } else {
        return "";
    }
}