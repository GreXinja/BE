const LibExpress =  require("express")

const server = LibExpress();

server.listen(8000,()=>{
    console.log("Server is listening and is connected to port 8000")
})

server.post("/users",(req,res)=>{
    console.log("Request recieved")
    res.send("User is Created")

})
server.post("/players",(req,res)=>{
    console.log("Request recieved")
    res.send("Player is Created")

})
server.post("/teams",(req,res)=>{
    console.log("Request recieved")
    res.send("Team is Created")
})
