const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const cron = require("node-cron");
const { initializeApp, firestore, firebase } = require("firebase/app");
const {
  getFirestore,
  collection,
  getDocs,
  onSnapshot,
} = require("firebase/firestore");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
require("dotenv").config();

let isRinging = false;
let alarms = [];
const processedDocs = new Set();
let boolAlarmList = new Map();
let jobList = [];

// シリアルポートの設定
const port = new SerialPort({
  path: "/dev/ttyACM0",
  baudRate: 9600,
});

const bellport = new SerialPort({
  path: "/dev/ttyUSB0",
  baudRate: 9600,
});

// 改行で区切ってデータをパース
const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

// データを受信したときの処理
parser.on("data", (data) => {
  const dataArray = data.split(",");
  if (dataArray[0] == "0" && isRinging) {
    isRinging = false;
    sendData("0");
  }
});

function sendData(data) {
  bellport.write(data + "\n", (err) => {
    if (err) {
      bellport;
      return console.log("error", err.message);
    } else {
      bellport;
      isRinging = true;
    }

    //console.log('message success', data);
  });
}

// エラー処理
port.on("error", (err) => {
  console.error("Serial Port Error:", err.message);
});

// Firebaseプロジェクトの設定
const firebaseConfig = {
  projectId: process.env.PROJECT_Id,
  appId: process.env.APP_Id,
};

// Firebaseアプリの初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const snapshotDB = collection(db, "alarms");

async function getAlarms(db) {
  const alarmsCol = collection(db, "alarms");
  const alarmSnapshot = await getDocs(alarmsCol);
  const alarmList = alarmSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  console.log(alarmList);
  return alarmList;
}

//アラームの作成時にトリガーされる
onSnapshot(snapshotDB, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added") {
      const docId = change.doc.id;
      if (!processedDocs.has(docId)) {
        //alarms = getAlarms(db);
        createFunctionForDoc(
          change.doc.id,
          change.doc.data().time,
          change.doc.data().week_day,
          change.doc.data().alarm_status
        )();
      }
    } else if ((change.type = "modified")) {
      const job = boolAlarmList.get(change.doc.id);
      console.log(change.doc.id + change.doc.data().alarm_status);
      if (change.doc.data().alarm_status) job.start();
      else job.stop();
    }
  });
});

function createFunctionForDoc(id, time, week_day, alarm_status) {
  return () => {
    const formate_wd = week_day == "" ? "*" : week_day;
    const timeArray = time.split(":");
    const job = cron.schedule(
      "0 " + timeArray[1] + " " + timeArray[0] + " * * " + formate_wd,
      () => {
        //sendData('1');
        console.log("朝だよ");
      }
    );
    boolAlarmList.set(id, job);

    if (alarm_status) job.start();
    else job.stop();
  };
}
