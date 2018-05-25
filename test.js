const Rbacc=require("./rbacc")

(function test() {

    let rbacc=new Rbacc({
        cacheTTL:3600000,
        debug:true,
        client:{
            host:"localhost",
            port:6379,
            prefix:"myrbacc:"
        }
    })

    /*rbacc.setResource({
        roleId:"user",
        resource:"/files/public",
        premisions:["read","write"],
        cb:(err,res)=>{
            if (err) {
                return console.log(err);
            }
            
            console.log(res);
            
        }
    })*/


    /*rbacc.removeUserResources({
        userId:"jakubId",
        roles:["user"],
        resources:{
            "/file/tvoje":["read","*"]
        },
        cb:(err,d)=>{
            console.log(err);
        
            console.log(d);
        }
    })*/

    /*rbacc.addRoles({
        roles:{
            "admin":{
                "/admin":"muze"
            },
            "user":{
                "/files/public":["read","write"]
            }
        },
        cb:(err,res)=>{
            if (err) {
                return console.log(err);
            }
            console.log(res);
            
        }
    })*/

   /* rbacc.addResources({
        roleId:"user",
        resources:{
            "/profile/my":["read","write"],
            "/blog/posts":["read"]
        },
        //overwriteResources:true,
        cb:(err,res)=>{
            if (err) {
                return console.log(err);
            }
            
            console.log(res);
            
        }
    })*/
    
    rbacc.addUserResources({
        userId:"jakubId",
        roles:["user"],
        resources:{
            "/file/moje":["read","write"],
            "/file/tvoje":["read","bobr"]
        },
        //overwriteRoles:true,
        //overwritePremissions:true,
        //overwriteResources:true,
        cb:(err,d)=>{
            if (err) {
                return console.log(err);
            }
        
            console.log(d);


            rbacc.isAllowed({
                userId:"jakubId",
                resource:"/file/moje",
                premision:"write",
                cb:(err,res)=>{
                     if (err) {
                         return console.log(err);
                     }
                     console.log(res);
                 }
             })
        }
    })
    
})()
