const redis = require("redis");
const cache = require('memory-cache');   

Array.prototype.unique = function() {
    var a = this.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
};

class Rbacc{
    
    constructor({
        cacheTTL,
        defaultRolesKey,
        debug,
        client
    }){
        this.cacheTTL=cacheTTL || 3600000;
        this.defaultRolesKey=defaultRolesKey || "::roles"
        this.client = redis.createClient(client);     
        this.debug=debug;

        if (debug) {
            cache.debug(true)
        }
    }

    encode(obj){
        return JSON.stringify(obj)
    }

    decode(s){
        try {
            return JSON.parse(s) || {}
        } catch (err) {
            console.log(err);
            return {}
        }
    }

    _get(key,cb,cached){        
        let value=cache.get(key)
        if (value) {

            if (this.debug) {
                console.log("_get from cache:",key);   
            }
                        
            return cb(null,value)
        }else{
            this.client.get(key,(err,res)=>{
                
                if (err) {
                    return cb(err)
                }
                
                let value
                try {
                    value=JSON.parse(res===null ? "{}" : res)
                } catch (err) {
                    throw cb(err)
                }

                if (this.debug) {
                    console.log("_get db:",key,", will be added to cache:",cached);   
                }

                if (cached) {
                    cache.put(key,value, this.cacheTTL);   
                }

                cb(null,value)
            })
        }
    }

    _set(key,value,cb,cached){        
        try {
            this.client.set(key,JSON.stringify(value),(err,res)=>{
                if (err) {
                    return cb(err)
                }

                if (this.debug) {
                    console.log("_set db:",key,", will be added to cache:",cached);   
                }

                if (cached) {
                    cache.put(key,value, this.cacheTTL);   
                }

                cb(null,value)
            })
        } catch (err) {
            cb(err)
        }
    }

    newOrExtend(obj,key,arr){
        if (obj[key]) {
            obj[key]=obj[key].concat(arr).unique(); 
        }else{
            obj[key]=arr
        }
    }

    extendObject(o1,o2){
        for(let k in o2){
            o1[k]=typeof o2[k]==='string' ? [o2[k]] : o2[k]
        }
    }

    spliceObject(o,keys){
        for(let k of Array.isArray(keys) ? keys : [keys]){
            delete o[k]
        }
    }

    prefixRole(r){
        return "role_"+r
    }

    prefixUser(u){
        return "user_"+u
    }
      
    getResources({roleId,cb}){
        roleId=this.prefixRole(roleId)
        this._get(roleId,(err,res)=>{
            if (err) {
                return cb(err)
            }

            return cb(null,res)
        },true)
    }

    removeResources({roleId,resources,cb}){
        roleId=this.prefixRole(roleId)
        this._get(roleId,(err,role)=>{
            
            if (err) {
                return cb(err)
            }
            
            this.spliceObject(role,resources)
            
            this._set(roleId,role,(err,res)=>{
                if (err) {
                    return cb(err)
                }

                cb(null,role)
            },true)

        },false)
    }

    addResources({roleId,resources,overwriteResources,cb}){
        roleId=this.prefixRole(roleId)
        if (overwriteResources) {
            let role= {}

            this.extendObject(role,resources)
           
            this._set(roleId,role,(err,res)=>{
                if (err) {
                    return cb(err)
                }

                cb(null,role)
            },true)
        }else{
            this._get(roleId,(err,role)=>{
            
                if (err) {
                    return cb(err)
                }
                    
                this.extendObject(role,resources)
               
                this._set(roleId,role,(err,res)=>{
                    if (err) {
                        return cb(err)
                    }
    
                    cb(null,role)
                },true)

            },false)
        }
        
    }

    addRoles({roles,overwriteResources,cb}){
        let p=[]
        for(let roleId in roles){
            p.push(
                ((roleId)=>{
                    return new Promise((resolve,reject)=>{
                        this.addResources({
                            roleId,
                            resources:roles[roleId],
                            overwriteResources,
                            cb:(err,res)=>{
                                if (err) {
                                    reject(err)
                                }

                                resolve(res)
                            }
                        })
                    })
                })(roleId)
            )
        }
        
        Promise.all(p).then(res=>{
            cb(null,res)
        }).catch(cb)
    }

    getMergedResources({roles=[],cb}){
        let p=[]
        for(let roleId of roles){
            p.push(
                ((roleId)=>{
                    roleId=this.prefixRole(roleId)
                    return new Promise((resolve,reject)=>{
                        this._get(roleId,(err,res)=>{
                            if (err) {
                                reject(err)
                            }
                            resolve(res)
                        },true)
                    })
                })(roleId)
            )
        }

        Promise.all(p).then((allResources)=>{
            let mergedResources={}
            for (let i = 0; i < allResources.length; i++) {
                for(let k in allResources[i]){
                    mergedResources[k]=allResources[i][k]
                }
            }
            cb(null,mergedResources)
        }).catch(err=>cb(err))
    }

    addMergedResourcesToUser({user,cb}){
        this.getMergedResources({
            roles:user[this.defaultRolesKey],
            cb:(err,mergedRoles)=>{
                if (err) {
                    return cb(err)
                }

                for(let k in mergedRoles){
                    if (!user[k]) {
                        user[k]=mergedRoles[k]
                    }
                }
                
                cb(null,user)
            }
        })
    }

    getUserResources({userId,cb}){
        userId=this.prefixUser(userId)
        this._get(userId,(err,user)=>{
            
            if (err) {
                return cb(err)
            }
            
            this.addMergedResourcesToUser({user,cb})

        },true)
    }

    saveUserAndReturn({userId,user,cb}){
        this._set(userId,user,(err,ok)=>{
            if (err) {
                return cb(err)
            }
            
            this.addMergedResourcesToUser({
                user,
                cb:(err,_user)=>{

                    if (err) {
                        return cb(err)
                    }

                    cache.put(userId,_user, this.cacheTTL);

                    cb(null,_user)
                }
            })
        },false)
    }

    addUserResources({
        userId,
        roles=[],
        resources={},
        overwriteRoles,
        overwritePremissions,
        overwriteResources,
        cb
    }){
        userId=this.prefixUser(userId)
        this._get(userId,(err,user)=>{
            
            if (err) {
                return cb(err)
            }
                        
            if (typeof roles==='string') {
                roles=[roles]
            }


            if (overwriteRoles) {
                user[this.defaultRolesKey]=roles
            }else{
                this.newOrExtend(user,this.defaultRolesKey,roles)
            }

            if (overwriteResources) {
                let _user={};
                _user[this.defaultRolesKey]=user[this.defaultRolesKey]
                user={
                    ..._user,
                    ...resources
                }
            }

            if (overwritePremissions) {
                for(let k in resources){
                    if (typeof resources[k]==='string') {
                        resources[k]=[resources[k]]
                    }
                    this.newOrExtend(user,k,resources[k])
                }
            }else{
                for(let k in resources){
                    if (typeof resources[k]==='string') {
                        resources[k]=[resources[k]]
                    }
                    user[k]=resources[k]
                }
            }
            
            this.saveUserAndReturn({userId,user,cb})
        },false)
    }

    removeUserResources({
        userId,
        roles=[],
        resources={},
        cb
    }){
        userId=this.prefixUser(userId)
        this._get(userId,(err,user)=>{
            
            if (err) {
                return cb(err)
            }
                        
            if (typeof roles==='string') {
                roles=[roles]
            }

            for (let i = user[this.defaultRolesKey].length-1; i>=0; i--) {
                if (roles.includes(user[this.defaultRolesKey][i])) {
                    user[this.defaultRolesKey].splice(i,1)
                }   
            }

            for(let k in resources){
                delete user[k];
            }
            
            this.saveUserAndReturn({userId,user,cb})

        },false)
    }

    _isAllowed({user,resource,premision}){
        if (user['*']) {
            let p=user['*'];
            if (p.includes('*') || p.includes(premision)) {
                return true
            }
        }

        if (user[resource]) {
            let p=user[resource];
            if (p.includes('*') || p.includes(premision)) {
                return true
            }
        }

        return false
    }

    isAllowed({userId,resource,premision,cb}){

        let user=cache.get(userId)

        if (!user) {
            this.getUserResources({
                userId,
                cb:(err,user)=>{
                    if (err) {
                        return cb(err)
                    }


                    cache.put(userId,user, this.cacheTTL);

                    cb(
                        null,
                        this._isAllowed({user,resource,premision})
                    )
                }
            })    
        }else{  

            if (this.debug) {
                console.log("used user from cache:",userId)   
            }
                    
            cb(
                null,
                this._isAllowed({user,resource,premision})
            )
        }
        
    }

}


module.exports=Rbacc;
