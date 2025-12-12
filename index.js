const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;




app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hm8fata.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
   
    await client.connect();
    const db=client.db('asset_verse')
    const usersCollection=db.collection('users');

    app.get('/', (req, res) => {
  res.send('hello world');
  });

//user related API

app.post("/users",async(req,res)=>
{
  const data=req.body;
  if(!data.dateOfBirth)
  {
    data.dateOfBirth = "2000-01-01";
  }
  if(!data.role)
  {
    data.role="employee"
  } 

  data.createdAt=new Date()
  const result=await usersCollection.insertOne(data)
  res.send(result)
})





   
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    
    // await client.close();
  }
}
run().catch(console.dir);



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
