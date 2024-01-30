const mongoose = require("mongoose");

const dbConnection = () => {
  // connect with database
  mongoose.connect(process.env.DB_URI).then((conn) => {
    console.log(`Database Connected: ${conn.connection.host}`);
  });
};

module.exports = dbConnection;
