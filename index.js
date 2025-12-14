const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const e = require('express');
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
    const assetsCollection=db.collection('assets');
    const requestsCollection=db.collection('requests');
    const employeeAffiliationCollection=db.collection('employeeAffiliation');
    const assignedAssetsCollection=db.collection('assignedAssets');
    app.get('/', (req, res) => {
  res.send('hello world');
  });

//user related API

app.get('/user',async(req,res)=>
{
  const query={}
  const email=req.query.email;
  query.email=email
  const result=await usersCollection.findOne(query);
  res.send(result);
  
})
app.patch('/user/:id',async(req,res)=>
{
  const id=req.params.id;
  const data=req.body;
  const query={_id: new ObjectId(id)}
  const updateDoc={
    $set: data
  }
  const result=await usersCollection.updateOne(query,updateDoc);
  res.send(result);
});

app.post("/users",async(req,res)=>
{
  const data=req.body;
  const email=data.email;
  const query={}
  query.email=email
  const userExist=await usersCollection.findOne(query);
  if(userExist)
  {
    return res.send({message:"User Already Saved in DB"})
  }
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

//Asset related API
app.get('/allassets',async(req,res)=>
{
  const result=await assetsCollection.find().toArray();
  res.send(result);

})

app.get("/myassets",async(req,res)=>
{
  const employeeEmail=req.query.employeeEmail;
  const query={employeeEmail:employeeEmail,status:"active"}
  const result=await employeeAffiliationCollection.find(query).toArray();

  if(result.length===0)
  {
    return res.send({message:"No active employee affiliation found."});
  }
  const hrEmails = result.map(a => a.hrEmail);
  const assetsQuery={hrEmail:{$in:hrEmails},status:"assigned"};
  const assignedAssets=await assignedAssetsCollection.find(assetsQuery).toArray();
  res.send(assignedAssets);
  

})

app.get('/assetscount',async(req,res)=>
{
  const hrEmail=req.query.hrEmail;
  const query={hrEmail:hrEmail,status:"assigned"}
  const count=await assignedAssetsCollection.find(query).toArray();
  res.send(count);
 

})

app.get("/assets",async(req,res)=>
{
  const query={}
  const email=req.query.email;
  query.email=email
  const result=await assetsCollection.find(query).toArray();
  res.send(result);
})

app.post("/asset",async(req,res)=>
{
  const data=req.body;
  const result= await assetsCollection.insertOne(data);
  res.send(result);

})

app.patch('/asset/:id',async(req,res)=>
{
const id=req.params.id;
const data=req.body;
const query={_id: new ObjectId(id)}
const updateDoc={
  $set: data
}
const result=await assetsCollection.updateOne(query,updateDoc);
res.send(result);

})

app.patch('/return-asset/:id',async(req,res)=>
{
  const id=req.params.id;
  const query={_id: new ObjectId(id)}
  const updateDoc={
    $set:{
      status:"returned",
      returnDate:new Date(),
    }
  }
  const result=await assignedAssetsCollection.updateOne(query,updateDoc);
  const query2={_id:new ObjectId(req.body.assetId)}
  const updateAssetDoc={
    $inc: { availableQuantity: 1 },
  }
  const result2=await assetsCollection.updateOne(query2,updateAssetDoc);
  res.send({assignedAssetUpdate:result,assetUpdate:result2});

})

app.delete('/asset/:id',async(req,res)=>
{
  const id=req.params.id;
  const query={_id: new ObjectId(id)}
  const result=await assetsCollection.deleteOne(query);
  res.send(result);

})

//employee related API
app.get('/employees',async(req,res)=>
{
  const query={}
  const hrEmail=req.query.hrEmail;
  query.hrEmail=hrEmail
  query.status="active"
  const result=await employeeAffiliationCollection.find(query).toArray();
  res.send(result);
})

app.patch("/deleteEmployee",async(req,res)=>
{
const hrEmail=req.body.hrEmail;
const employeeEmail=req.body.employeeEmail;

const query={employeeEmail:employeeEmail,hrEmail:hrEmail,status:"active"}
const updateDoc={
  $set:{
    status:"inactive",
  }

}
const result=await employeeAffiliationCollection.updateOne(query,updateDoc);
const updateUserDoc={
  $inc: { currentEmployees: -1 },
  $set: { updatedAt: new Date() }
}
const updateUser=await usersCollection.updateOne({email:hrEmail},updateUserDoc);
res.send({employeeUpdate:result,userUpdate:updateUser});
  
})


//request related API
app.get('/requests',async(req,res)=>
{
  const query={}
  const hremail=req.query.hrEmail;
  query.hrEmail=hremail
  const result=await requestsCollection.find(query).toArray();
  res.send(result);


})


app.post('/requestAsset',async(req,res)=>
{
  const data=req.body;
  const result=await requestsCollection.insertOne(data);
  res.send(result);

})
app.patch('/requests-approve/:id',async(req,res)=>
{
  try{
  const id=req.params.id;
  const hrEmail=req.body.hrEmail;
  const assetId=req.body.assetId;
  const query={_id: new ObjectId(id)}
const request=await requestsCollection.findOne(query);


  const availableAsset=await assetsCollection.findOne({_id:new ObjectId(assetId)});
  const user=await usersCollection.findOne({email:req.body.hrEmail});

  if(availableAsset.availableQuantity>0)
  {
    const employeeExits=await employeeAffiliationCollection.findOne({employeeEmail:req.body.requesterEmail,hrEmail:hrEmail});
    if(!employeeExits)
    {
      if(user.currentEmployees<user.packageLimit)
      {

      const employeeAffiliationData={
        employeeEmail:req.body.requesterEmail,
        employeeName:req.body.requesterName,
        hrEmail:hrEmail,
        companyName:availableAsset.companyName,
        companyLogo:user.companyLogo,
        affiliationDate:new Date(),
        status:"active",
    }
    await employeeAffiliationCollection.insertOne(employeeAffiliationData);
   const updateDoc = {
  $inc: { currentEmployees: 1 },
  $set: { updatedAt: new Date() }
};
await usersCollection.updateOne({email:hrEmail}, updateDoc);
  }

    else{
      return res.send({message:"You have reached your package limit. Cannot approve more requests."});
    } 
  }
  else if(employeeExits.status==="inactive")
  {
    if (user.currentEmployees >= user.packageLimit) {
    return res.send({ message: "You have reached your package limit." });
  }


    const updateEmployeeDoc={
      $set:{
        status:"active",
        affiliationDate:new Date(),
      }
    }
    await employeeAffiliationCollection.updateOne({employeeEmail:req.body.requesterEmail,hrEmail:hrEmail},updateEmployeeDoc);
    const updateDoc = {
      $inc: { currentEmployees: 1 },
      $set: { updatedAt: new Date() }
    };
    await usersCollection.updateOne({email:hrEmail}, updateDoc);
  }
  
const updateAssetDoc={
  $inc: { availableQuantity: -1 },
}
await assetsCollection.updateOne({_id:new ObjectId(assetId)},updateAssetDoc);
const updateRequestDoc={
  $set:{
    requestStatus:"approved",
    approvalDate:new Date(),
    processedBy:hrEmail
  }
}
const result=await requestsCollection.updateOne(query,updateRequestDoc);
const assignedAssetData={
  assetId:assetId,
  assetName:availableAsset.productname,
  assetImage:availableAsset.productImage,
  assetType:availableAsset.productType,
  employeeEmail:req.body.requesterEmail,
  employeeName:req.body.requesterName,
  hrEmail:hrEmail,
  companyName:availableAsset.companyName,
  assignmentDate:new Date(),
  status:"assigned"
}
const assignedResult=await assignedAssetsCollection.insertOne(assignedAssetData);

res.send({requestUpdate:result,assignedAsset:assignedResult});

}
  else{
    res.send({message:"No available assets to approve this request."});
  }
}
catch (err) {
    console.error(err);
    return res.status(500).send({ message: "Approval failed" });
  }


});

app.patch('/requests-reject/:id',async(req,res)=>
{
  const id=req.params.id;
  const email=req.body.hrEmail;
  const query={_id: new ObjectId(id)}
  const updateDoc={
    $set:{
      requestStatus:"rejected",
      processedBy:email,
      rejectionDate:new Date()

  }
}
const result=await requestsCollection.updateOne(query,updateDoc);
res.send(result);
}
)
  

   
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
