const Rbacc=require("./rbacc");

(function () {

    let rbacc=new Rbacc({
        cacheTTL:3600000,
        debug:true,
        client:{
            host:"localhost",
            port:6379,
            prefix:"myrbacc:"
        }
    })

    rbacc.addRoles({
        roles:{
            "admin":{
                "*":"*"
            },
            "user":{
                "/files/public":"*",
                "/blog/post":["read","write"]
            },
            "guest":{
                "/files/public":"read",
                "/blog/post":"read"
            }
        },
        cb:(err,res)=>{
            if (err) {
                return console.log(err);
            }

            console.log("addRoles:",res);
            
            rbacc.addUserResources({
                userId:"userId",
                roles:["user"],
                resources:{
                    "/files/myFiles":["read","write"],
                    "/files/otherFiles":"read",
                },
                cb:(err,res)=>{
                    
                    if (err) {
                        return console.log(err);
                    }
                
                    console.log("addUserResources:",res);
        
                    rbacc.isAllowed({
                        userId:"userId",
                        resource:"/files/someId",
                        premision:"write",
                        cb:(err,res)=>{
                             if (err) {
                                 return console.log(err);
                             }
                             console.log("/files/someId:write - ",res);

                             rbacc.isAllowed({
                                userId:"userId",
                                resource:"/blog/post",
                                premision:"write",
                                cb:(err,res)=>{
                                     if (err) {
                                         return console.log(err);
                                     }
                                     console.log("/blog/post:write - ",res);
                                 }
                            })
                            
                         }
                    })

                }
            })
        }
    })
    
})()
