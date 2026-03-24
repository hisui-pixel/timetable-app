// server.js
const { error } = require('console');
const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;

const DATA_FILE = 'reviews.json';
const TIMETABLE_FILE = 'timetables.json';

let serverdata = [];
let timetablesData = {};

if (fs.existsSync(DATA_FILE)) {
  try{
    serverdata = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  }catch(err){
    console.error("reviews.json読み込み失敗",err);
    serverdata=[];
  }
}


if (fs.existsSync(TIMETABLE_FILE)) {
  try{
    timetablesData = JSON.parse(fs.readFileSync(TIMETABLE_FILE, 'utf8'));
    console.log(`☁️ ${Object.keys(timetablesData).length} 人分の時間割データを読み込みました！`);
  }catch(err){
    console.error("timetable.json読み込み失敗",err);
    timetablesData=[];
  }
}

function saveToFile() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(serverdata, null, 2));
}
function saveTimetablesToFile() {
  fs.writeFileSync(TIMETABLE_FILE, JSON.stringify(timetablesData, null, 2));
}

app.use(express.static('public'));
app.use(express.json());

app.post('/api/review', function(req, res){

  const {courseId,text,credits,task,authorId}=req.body;
  
  if(!courseId||!text){
    return res.status(400).json({error:"データ不足"});
  }

  const newReview = { 
    id: Date.now(),
    courseId,
    text,
    credits,
    task,
    authorId
  };

  serverdata.push(newReview);
  saveToFile();
  res.json({ message: "保存成功", data: newReview });
});

app.get('/api/review', function(req, res){
  res.json(serverdata);
});

app.delete('/api/review/:id', function(req, res){
  const targetId = Number(req.params.id);
  const {authorId}=req.body;
  const review=serverdata.find(r=>r.id===targetId);

  if(!review){
    return res.status(404).json({error:"not found"});
  }

  if(review.authorId!==authorId){
    return res.status(403).json({error:"not allowed"});
  }

  serverdata = serverdata.filter(review => review.id !== targetId);

  saveToFile();
  res.json({ message: "削除しました" });
});


app.post('/api/timetable', function(req, res){
  const userId = req.body.userId;       
  const timetable = req.body.timetable; 

  timetablesData[userId] = timetable;
  saveTimetablesToFile(); 

  console.log(`☁️ ID: ${userId} の時間割をクラウド保存しました！`);
  res.json({ message: "時間割をクラウドに保存しました！" });
});

app.get('/api/timetable/:userId', function(req, res){
  const userId = req.params.userId;
  const userTimetable = timetablesData[userId] || []; 
  
  res.json(userTimetable);
});

// サーバーを起動！
app.listen(port, () => {
  console.log(`🚀 サーバー起動！ http://localhost:${port} にアクセス！`);
});