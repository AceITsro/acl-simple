# RBACC
Simple RBAC with custom user resources and [Redis](https://redis.io/) backend .

## Install
```
npm install rbacc -save
```

## Prerequisites
- [Node.js](https://nodejs.org) 
- [Redis](https://redis.io/)

## Examples
```javascript
//Create rbacc object
//Client option on https://www.npmjs.com/package/redis
let rbacc=new  Rbacc({
	cacheTTL:3600000, //user object with all merged resources are cached in memory-cache, no in redis 
	debug:false,
	client:{
		host:"localhost",
		port:6379,
		prefix:"rbacc:"
	}
})
```
```javascript
//Add initial roles. 
rbacc.addRoles({
	roles:{
		admin:{
			"*":"*" // asterisk on resource and premission allows all
		},
		user:{
			"/files/public":"read",
			"/blog/post":["read","write"], // use array on premission
			"/files/userDir/*":["read","write"],// asterisk on resource check subpath
		},
		guest:{
			"/files/public":"read",
			"/blog/post":"read"
		}
	},
	cb:(err,res)=>{
		if  (err)  {
			return  console.log(err);
		}
		console.log("added roles:",res);
	}
})
```
```javascript
//Add user resources
rbacc.addUserResources({
	userId:"userId", 
	roles:["user"],
	resources:{
		"/files/myFiles":["read","write"],
		"/files/otherFiles":"read",
	},
	cb:(err,res)=>{
		if  (err)  {
			return  console.log(err)
		}
	    console.log("added resources to user:",res)
	}
})
```
```javascript
//Check if allowed
rbacc.isAllowed({
	userId:"userId",
	resource:"/files/userDir/584ds215fe812/data",
	premision:"read",
	cb:(err,res)=>{
		if  (err)  {
			return  console.log(err);
		}
		console.log("/files/userDir/584ds215fe812/data:read - ",res);
	}
})

rbacc.isAllowed({
	userId:"userId",
	resource:"/files/otherFiles",
	premision:"read",
	cb:(err,res)=>{
		if  (err)  {
			return  console.log(err);
		}
		console.log("/files/otherFiles:read - ",res);
	}
})
```