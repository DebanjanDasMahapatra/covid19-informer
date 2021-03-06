var express = require('express');
var router = express.Router();
var util=require('../helpers/utils');
const fetch = require("node-fetch");
const Menu =  require('../Models/menu');
const News =  require('../Models/news');
const User  = require('../Models/users');
const ChatApi= require('../helpers/chatApi')
const Message=require('../helpers/messge')
const District  = require('../Models/district');
const State  = require('../Models/state');
const Feedback  = require('../Models/feedback');
const India = require('../Models/india')
const Country=require('../Models/country')
const Config=require('../Models/Config')
const {spawn} = require('child_process');
var  translate = require("translate");
const puppeteer = require('puppeteer');
translate.engine = 'yandex';
translate.key = 'trnsl.1.1.20200404T172911Z.8807c71a358478e0.5b8c7874935ed24a13d01d4686738afe4c60be3a';
translate.from = 'hi';
var Plotlib = require('nodeplotlib');
let  shell = require('shelljs');
let Location=require('../helpers/location')

router.get('/shubham', async(req, res) => {
 try{
  let py=await shell.exec('python3 routes/predictor.py 1521 63 427')
  if(py.stderr)
    throw py.stderr
  parseInt
  py.stdout=py.stdout.split('\n')
  let predicted={
    conf:parseInt(py.stdout[0].trim()),
    dead:parseInt(py.stdout[1].trim()),
    rec:parseInt(py.stdout[2].trim())
  }
  res.json({out:predicted})
 }
 catch(e){
   console.log(e)
   res.send(e)
 }
 })























router.post('/createConfig',async(req, res) => {
  let data=new Config({con:req.body.con,rec:req.body.rec,dead:req.body.dead})
  res.send(await data.save())
})
router.post('/createmenu', (req, res) => {
  new Menu(req.body).save().then(menu => {
    return res.status(200).json({
      status: true,
      message: 'Menu added',
      data: menu
    });
  }).catch(err => {
    return res.status(500).json({
      status: false,
      message: 'Menu not added',
      error: err
    });
  })
});
/*{
  "messages": [
    {
      "id": "false_17472822486@c.us_DF38E6A25B42CC8CCE57EC40F",
      "body": "Ok!",
      "type": "chat",
      "senderName": "Ilya",
      "fromMe": true,
      "author": "17472822486@c.us",
      "time": 1504208593,
      "chatId": "17472822486@c.us",
      "messageNumber": 100
    }
  ]
}*/

router.get('/graph',async (req, res) => {
  let data=await India.all()
  res.render('index',{data:JSON.stringify(data)})
});
router.get('/date',async (req, res) => {
  res.status(200).json({date:require('../helpers/messge').starting()})
});

router.get('/sendMessages',async (req, res) => {
  res.status(200).json({s:'s'})
  util.getUpdates()
});
router.post('/addDailyCases',async (req, res) => {
  try{
    let data=await India.add(req.body.con,req.body.rec,req.body.dead)
    res.status(200).json({err:false,data:data})
  }catch(e){
    res.status(200).json({err:true,msg:e})
  }

});

const path = require('path')
router.get('/updateGraph',async (req, res) => {
  try{
  const urlToCapture = 'http://localhost:3000/graph'; 
    const outputFilePath = path.join(__dirname,"../public/chart.png");
    console.log(urlToCapture,outputFilePath)

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({
        width: 786,
        height: 543,
        deviceScaleFactor: 1,
    });
    await page.goto(urlToCapture);
    await page.waitForSelector('#shu')
    await page.waitFor(1000);
    await page.screenshot({path: outputFilePath});
    console.log("ss taken")
    await browser.close();
    res.send("Check /chart.png")
  }catch(e){
    console.log(e)
    res.send("error occured")
  }
  

});
router.get('/ppt',async(req,res)=>{
  let liveOfficialData=await fetch("https://api.covid19india.org/data.json").then(result=>{return result.json()})
    liveOfficialData.data={}
    liveOfficialData.data.total=liveOfficialData.statewise[0];
    let lastIndiaData=await Config.findOne({active:true});
    let last=await India.add(liveOfficialData.data.total.confirmed-lastIndiaData.con,liveOfficialData.data.total.recovered-lastIndiaData.rec,liveOfficialData.data.total.deaths-lastIndiaData.dead)
    lastIndiaData.con=liveOfficialData.data.total.confirmed;
    lastIndiaData.rec=liveOfficialData.data.total.recovered;
    lastIndiaData.dead=liveOfficialData.data.total.deaths;
    let py=await shell.exec('python3 ./helpers/predictor.py '+last.con+" "+last.dead+" "+last.rec)
    if(py.stderr)
        throw py.stderr
    py.stdout=py.stdout.split('\n').reverse()
    let predicted={
        con:parseInt(py.stdout[3].trim()),
        dead:parseInt(py.stdout[2].trim()),
        rec:parseInt(py.stdout[1].trim())
    }
    lastIndiaData.message=Message.chartCaption(predicted,last)
    lastIndiaData.predicted=predicted;
    res.json({lastIndiaData,last})
    //await lastIndiaData.save()
})
router.get('/show',async (req, res) => {
  util.updateIndia().then(r=>{
    res.send("Check /chart.png")
  }).catch(e=>{
    res.send("error occured")
  }
  )

});
router.post('/search',async (req, res) => {
  try{
  let states=await State.search(req.body.text);
  let districts=await District.search(req.body.text);
  
  res.status(200).json({err:false,state:states,district:districts})
  }
  catch(e){
    console.log(e)
    res.status(200).json({err:true,msg:e})
  }
});

router.post('/messages',async (req, res) => {
  try{
    let msgs=req.body.messages,i=0;
    if(!(msgs))
    {throw "undefined" }
    while(i<msgs.length){
      let message=msgs[i];
      if(message.fromMe)
      {i+=1;continue;}
      let fromNum=message.chatId.split("@")[0];
      let recvMsg=message.body;
      let replyMsg="";
      let user=await User.findOne({number:fromNum});
      
      if(!(user))
      {
        user=new User({number:fromNum});
        await user.save()
      }
      if(!user.active){
        user.active=true;
        user = await user.save();
      }
      if(message.type=="location"){
        recvMsg=recvMsg.split(';')
        await Location.calculate({
          latitude: recvMsg[0],
          longitude: recvMsg[1],
      },user)
        i+=1;continue;
      }
      if(message.type!="chat"){
        ChatApi.sendmsg({
          phone:user.number,
          body:"This service is only accepts text messages and locations.\n\nPlease don't send unnecessary messages."
        },user.lang!='ENGLISH');
        i+=1;continue;
      }
      if(isNaN(recvMsg)&&(user.lang!='ENGLISH'))
      { 
        try{
        recvMsg=await translate(message.body,"en");
        //recvMsg=recvMsg.text;
        }
        catch(e){
          console.log(e);
          recvMsg=message.body;
        }
      }
      let hindiZero='०';
      if(recvMsg.length==1){
        hindiZero=recvMsg.charCodeAt(0)-hindiZero.charCodeAt(0);
        if(hindiZero>=0&&hindiZero<=9)
        recvMsg=String(hindiZero);
      }
      if(recvMsg.length==2){
        let temporary,temporary1;
        temporary=recvMsg.charCodeAt(0)-hindiZero.charCodeAt(0);
        temporary1=recvMsg.charCodeAt(1)-hindiZero.charCodeAt(0);
        if((temporary>=0&&temporary<=9)&&(temporary1>=0&&temporary1<=9))
        recvMsg=String(temporary)+String(temporary1);
      }
      if(user.isAdmin){
        let command = recvMsg.split(':');
        if(command[0].toLocaleLowerCase()=='command'&&command.length>1){
          command.splice(0,1);
          replyMsg = command.join(":");
          let sentMessages=ChatApi.sendToAll(replyMsg);
          
          i+=1;continue;
        }

      }
      if(recvMsg.toLocaleLowerCase()=='stop'&&!user.isAdmin){
        try{
          let delStatus = await User.findOneAndUpdate({'number':user.number},{'active':false});
           ChatApi.sendmsg({
            phone:user.number,
            body:"Your have been unsubscribed. Reply Hi to subscribe again"
          },user.lang!='ENGLISH');
        }catch(err){
           ChatApi.sendmsg({
            phone:user.number,
            body:"Internal server error! Try again or contact administrator"
          },user.lang!='ENGLISH');
        }
        i+=1;continue;
      }
      if(recvMsg.toLocaleLowerCase()=='hi'){
        user.lastServedMenuName="";
      }
      if(parseInt(recvMsg)) {
        let menuName=user.lastServedMenuName;
        replyMsg += "MENU:\n\n";
        if(menuName==""){
          let menu= await Menu.findOne({name:"baseMenu"})
          menu.options.forEach(option => {
            replyMsg += option.slNo + " : *"+option.description+"*\n";
          });
          replyMsg += "Send Reply witn any option number....";
           ChatApi.sendmsg({
            phone:user.number,
            body:replyMsg
          },user.lang!='ENGLISH')
          let updateUser=await User.setLastServedMenuName(user.number,"baseMenu");
        }
        else if(menuName == "baseMenu"){
          let choice = parseInt(recvMsg);
          if(choice==2){
            let menu= await Menu.findOne({name:"stateMenu"});
            menu.options.forEach(option => {
              replyMsg += option.slNo + " : *"+option.description+"*\n";
            });
            replyMsg += "Send Reply witn any option number....";
             ChatApi.sendmsg({
              phone:user.number,
              body:replyMsg
            },user.lang!='ENGLISH')
            let updateUser=await User.setLastServedMenuName(user.number,"stateMenu");
          }
          else if(choice==1){
            replyMsg = "Reply with Country Name.";
             ChatApi.sendmsg({
              phone:user.number,
              body:replyMsg
            },user.lang!='ENGLISH')
            let updateUser=await User.setLastServedMenuName(user.number,"countryMenu");
          }
          else if(choice >= 3 && choice <= 10){
            let menu= await Menu.findOne({name:"baseMenu"})
            if(choice == 6) {
              replyMsg = "*Language Options* :\n\n1. *English* \n2. *Hindi*";
               ChatApi.sendmsg({
                phone:user.number,
                body:replyMsg
              },user.lang!='ENGLISH')
              let updateUser=await User.setLastServedMenuName(user.number,"langMenu");
            }
            else if(choice == 5) {
              let news =await News.getAllNews();
              let min = Math.ceil(0);
              let max = Math.floor(news.length-2);
              let num = Math.floor(Math.random() * (max - min + 1)) + min;
              let sendNews = news;
              let message = "";
              for(i=num;i<(num+2);i++)
                message += sendNews[i].message + "\n\n";
              ChatApi.sendmsg({
                phone:user.number,
                body:message
              },user.lang!='ENGLISH')
              let updateUser=await User.setLastServedMenuName(user.number,"");
            }
            else if(choice==7){
              let yesterday=await India.recent()
              yesterday=yesterday[0];
              ChatApi.sendmsg({
                phone:user.number,
                body:Message.yesterdayToMessage(yesterday)
              },user.lang!='ENGLISH')
              let updateUser=await User.setLastServedMenuName(user.number,"");
            }
            else if(choice==8){
              let predicted=await Config.findOne({active:true})
              ChatApi.sendmsg({
                phone:user.number,
                body:Message.predictionToMessage(predicted.predicted)
              },user.lang!='ENGLISH')
              let updateUser=await User.setLastServedMenuName(user.number,"");
            }
            else{
              ChatApi.sendmsg({
                phone:user.number,
                body:menu.options[choice-1].output.split(';').join('\n')
              },user.lang!='ENGLISH')
              let updateUser=await User.setLastServedMenuName(user.number,choice == 10 ? "feedback" : "");
            }
          }
          else{
            let menu= await Menu.findOne({name:"baseMenu"})
            menu.options.forEach(option => {
              replyMsg += option.slNo + " : *"+option.description+"*\n";
            });
             ChatApi.sendmsg({
              phone:user.number,
              body:replyMsg
            },user.lang!='ENGLISH')
          }
        }
        else if(menuName == "stateMenu") {
          let menu= await Menu.findOne({name:"stateMenu"})
          let choice = parseInt(recvMsg);
          if(choice==38){
            
            let m=await getAllStateDataAtOnce()
            ChatApi.sendmsg({
              phone:user.number,
              body:m
            },user.lang!='ENGLISH')
            let updateUser=await User.setLastServedMenuName(user.number,"");
          }else 
          if(choice >= 1 && choice <= 37){
            let stateData=await util.getStateData(menu.options[choice-1].description);
            let stateName = menu.options[choice-1].description;
            if(stateData.data.stateData.total==0)
             ChatApi.sendmsg({
              phone:user.number,
              body:"Not a single case in this state.\nStill be Safe and be at Home"
            },user.lang!='ENGLISH')
            else
             ChatApi.sendmsg({
              phone:user.number,
              body:Message.stateToMessage(menu.options[choice-1].description,stateData)
            },user.lang!='ENGLISH');

            let menu2= await Menu.findOne({name:"districtMenu@"+stateName});
            if(menu2){
              replyMsg = `We are having information about these districts under the *${stateName}* state\n\n`;
              menu2.options.forEach(option => {
                replyMsg += option.slNo + " : *"+option.description+"*\n";
              });
              replyMsg += "Send Reply witn any option number....";
               ChatApi.sendmsg({
                phone:user.number,
                body:replyMsg
              },user.lang!='ENGLISH')
              let updateUser=await User.setLastServedMenuName(user.number,"districtMenu@"+stateName);
            }else{
              let updateUser=await User.setLastServedMenuName(user.number,"");
            }
            
          }
          else{
            menu.options.forEach(option => {
              replyMsg += option.slNo + " : *"+option.description+"*\n";
            });
            replyMsg += "Send Reply witn any option number....";
             ChatApi.sendmsg({
              phone:user.number,
              body:replyMsg
            },user.lang!='ENGLISH')
          }
        } else if(menuName.indexOf('districtMenu@') !=-1) {
          let districtMenu =await Menu.findOne({'name':menuName});
          if(districtMenu){
              let stateName = menuName.split('@')[1];
              let choice = parseInt(recvMsg);
              if(choice >= 1 && choice <= districtMenu.options.length){
                let districtName = districtMenu.options[choice-1].description;
                let districtData =await District.getDistrictByName(districtName,stateName);
                if(!districtData|| districtData.confirmedCases==0)
                 ChatApi.sendmsg({
                  phone:user.number,
                  body:"Not a single case in this District.\nStill be Safe and be at Home"
                },user.lang!='ENGLISH')
                else
                 ChatApi.sendmsg({
                  phone:user.number,
                  body:Message.DistrictToMessage(districtData)
                },user.lang!='ENGLISH');
                let updateUser=await User.setLastServedMenuName(user.number,"");
              }
              else{
                let menu2= await Menu.findOne({name:"districtMenu@"+stateName});
                replyMsg = `Selecet valid choice\nDistricts under the *${stateName}* state\n`;
                menu2.options.forEach(option => {
                  replyMsg += option.slNo + " : *"+option.description+"*\n";
                });
                replyMsg += "Send Reply witn any option number....";
                 ChatApi.sendmsg({
                  phone:user.number,
                  body:replyMsg
                },user.lang!='ENGLISH')
              }

          }else{
            let replyMsg = "No data available";
            ChatApi.sendmsg({
              phone:user.number,
              body:replyMsg
            },user.lang!='ENGLISH');
            let updateUser=await User.setLastServedMenuName(user.number,"");
          }
          
        }else if(menuName=='langMenu'){
          if(recvMsg==1){
            user=await User.setLang(user.number,"ENGLISH");
            replyMsg = "Language changed to english";
               ChatApi.sendmsg({
                phone:user.number,
                body:replyMsg
              },user.lang!='ENGLISH')
              let updateUser=await User.setLastServedMenuName(user.number,"");
          }
          else if(recvMsg==2){
            user=await User.setLang(user.number,"HINDI");
            replyMsg = "Language changed to hindi";
               ChatApi.sendmsg({
                phone:user.number,
                body:replyMsg
              },user.lang!='ENGLISH')
              let updateUser=await User.setLastServedMenuName(user.number,"");
          }
          else{
            replyMsg = "*Language Options* :\n\n1. *English* \n2. *Hindi*";
               ChatApi.sendmsg({
                phone:user.number,
                body:replyMsg
              },user.lang!='ENGLISH')
          }
        }
        else{
          let menu= await Menu.findOne({name:(menuName == "" ? "baseMenu" : menuName)})
          if(!menu)
          {menu= await Menu.findOne({name: "baseMenu"}),menuName="";}
          menu.options.forEach(option => {
            replyMsg += option.slNo + " : *"+option.description+"*\n";
          });
           ChatApi.sendmsg({
            phone:user.number,
            body:replyMsg
          },user.lang!='ENGLISH')
          let updateUser=await User.setLastServedMenuName(user.number,(menuName == "" ? "baseMenu" : menuName));
        
        }
      }
      else{
        if(user.lastServedMenuName == "feedback") {
          let savefb = await Feedback.saveOrUpdateFeedback(user.number,recvMsg);
           ChatApi.sendmsg({
            phone:user.number,
            body:"Your Feedback: "+recvMsg+"\n\n*Thanks for your valuable feedback :)*"
          },user.lang!='ENGLISH')
          let updateUser=await User.setLastServedMenuName(user.number,"");
        } else if (user.lastServedMenuName == "countryMenu") {
          let countries = await Country.all();
          let found = false;
          for(i=0;i<countries.length;i++)
              if(recvMsg.toLocaleLowerCase() == countries[i].name.toLocaleLowerCase()) {
                found = true;  
                let countryData=await Country.getCountry(countries[i].name);
                await ChatApi.sendmsg({
                 phone:user.number,
                 body:Message.countryToMessage(countryData)
               },user.lang!='ENGLISH');        
               let updateUser=await User.setLastServedMenuName(user.number,"");  
              break
            }
          if(!found){
            replyMsg = "No such country found!!! Reply again.\n\n [If not getting it right, find country names here: https://pcms19.000webhostapp.com/, copy the one you wish to query and send it]: ";
             ChatApi.sendmsg({
              phone:user.number,
              body:replyMsg
            },user.lang!='ENGLISH')
          }
        }
        else {
          let py=await shell.exec('python3 -W ignore ./helpers/textMiner.py "'+recvMsg+'"')
          let sea=recvMsg
          if(!(py.stderr))
              sea=String(py.stdout).split('\n').join(' ').split('\r').join(' ')
          let states=await State.search(sea);
          let districts=await District.search(sea);
          let countries=await Country.search(sea);
          if(states.length!=0||districts.length!=0||countries.length!=0||recvMsg.toLocaleLowerCase().includes("news")||recvMsg.toLocaleLowerCase().includes("prediction")||recvMsg.toLocaleLowerCase().includes("yesterday")){
            replyMsg="Some Data based on our understanding of your msg....\n\n";
            if(recvMsg.toLocaleLowerCase().includes("yesterday")){
              let yesterday=await India.recent()
              yesterday=yesterday[0];
              replyMsg +=("*Last Day's Data* :\n\n"+Message.yesterdayToMessage(yesterday)+"\n\n")
            }
            if(recvMsg.toLocaleLowerCase().includes("prediction")){
              let predicted=await Config.findOne({active:true})
              replyMsg +=("*Predicted Data* :\n\n"+Message.predictionToMessage(predicted.predicted)+"\n\n")
            }
            if(recvMsg.toLocaleLowerCase().includes("news")){
              replyMsg+="*Latest News* :\n\n";
              let news =await News.getAllNews();
              let min = Math.ceil(0);
              let max = Math.floor(news.length-2);
              let num = Math.floor(Math.random() * (max - min + 1)) + min;
              let sendNews = news;
              for(i=num;i<(num+1);i++)
                replyMsg += sendNews[i].message + "\n\n";
            }
            if(countries.length!=0){
              replyMsg+="*Country Data* :\n\n";
              let ind=0;
              while(ind<countries.length){
                let country=countries[ind];
                replyMsg+=(Message.countryToMessage(country)+'\n\n');
                ind+=1;
              }
            }
            if(states.length!=0){
              if((states.length==1)&&(recvMsg.toLocaleLowerCase().includes("all districts")||recvMsg.toLocaleLowerCase().includes("all")||recvMsg.toLocaleLowerCase().includes("districts")))
              {
                let d=await District.getDistrictsByState(states[0].name)
                districts.push(...d)
              }
              replyMsg+="*State Data* :\n\n";
              let ind=0;
              while(ind<states.length){
                let state=states[ind];
                replyMsg+=Message.searchState(state);
                ind+=1;
              }
            }
            if(districts.length!=0){
              replyMsg+="*Districts Data* :\n\n";
              let ind=0;
              while(ind<districts.length){
                let district=districts[ind];
                if(district.name=="Unknown")
                {ind+=1;continue;}
                replyMsg+=(Message.DistrictToMessage(district)+"\n\n");
                ind+=1;
              }
            }
            replyMsg+="*For more information follow the menu.*"
             ChatApi.sendmsg({
              phone:user.number,
              body:replyMsg
            },user.lang!='ENGLISH');
        }else{
        let menuName=user.lastServedMenuName;
          let menu= await Menu.findOne({name:(menuName == "" ? "baseMenu" : menuName)})
          menu.options.forEach(option => {
            replyMsg += option.slNo + " : *"+option.description+"*\n";
          });
           ChatApi.sendmsg({
            phone:user.number,
            body:replyMsg
          },user.lang!='ENGLISH')
          let updateUser=await User.setLastServedMenuName(user.number,(menuName == "" ? "baseMenu" : menuName));
        }
      }
      }
      i+=1
    }
    res.status(200).json({err:false})
  }
  catch(e){
    console.log(e);
    res.status(200).json({err:false})
  }
});

let getAllStateDataAtOnce = async () => {
  let stateData = await fetch('https://api.rootnet.in/covid19-in/unofficial/covid19india.org/statewise').then(result=>{return result.json()})
  let message = "The numbers displayed below follows the format *Confirmed* - *Recovered* - *Deaths* - *Active* cases respectively.";
  let statewise = stateData.data.statewise;
  statewise.sort((a, b) => {
      return b.confirmed - a.confirmed;
    })
  for(i=0;i<statewise.length;i++)
    message += "\n"+statewise[i].state+":\n*"+statewise[i].confirmed+"* | *"+statewise[i].recovered+"* | *"+statewise[i].deaths+"* | *"+statewise[i].active+"*"
  return message
}

module.exports = router;
